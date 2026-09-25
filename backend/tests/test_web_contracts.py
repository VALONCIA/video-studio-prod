"""Additive browser contracts: naming, source identity, verified metadata and preflight."""

from __future__ import annotations

import json
import sys
import uuid
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from server.db.models import Asset, Generation
from server.db.session import get_sessionmaker
from server.schemas.edit import EditCreate
from server.services.generation_service import fingerprint_obj
from tests.conftest import FIXTURE_VIDEO
from tests.test_edits import INSTRUCTION, _create


def test_named_project_creation_replay_and_conflict(client, upload_asset, enqueued):
    asset = upload_asset()
    first = _create(client, [asset["id"]], project_name="  Founder\x00 take 03  ", key="named")
    replay = _create(client, [asset["id"]], project_name="Founder take 03", key="named")
    assert first.status_code == replay.status_code == 202
    assert first.json() == replay.json()
    assert replay.headers["Idempotent-Replay"] == "true"
    assert len(enqueued) == 1
    projects = client.get("/v1/projects").json()["items"]
    assert len(projects) == 1 and projects[0]["name"] == "Founder take 03"
    conflict = _create(client, [asset["id"]], project_name="Changed name", key="named")
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"
    assert len(client.get("/v1/projects").json()["items"]) == 1


@pytest.mark.parametrize("name", ["", " \x00 ", "a" * 121])
def test_invalid_project_names(client, upload_asset, name):
    assert _create(client, [upload_asset()["id"]], project_name=name).status_code == 422


def test_project_name_only_for_implicit_project(client, upload_asset):
    project = client.post("/v1/projects", json={"name": "Existing"}).json()
    asset = upload_asset()
    assert _create(client, [asset["id"]], project_id=project["id"], project_name="New").status_code == 422
    assert _create(client, [asset["id"]], project_name="a" * 120).status_code == 202


def test_legacy_mobile_idempotency_fingerprint_still_replays(client, upload_asset):
    asset = upload_asset()
    response = _create(client, [asset["id"]], key="mobile")
    req = EditCreate(asset_ids=[asset["id"]], instruction=INSTRUCTION)
    old_body = req.model_dump(mode="json", exclude={"project_name"})
    with get_sessionmaker()() as session:
        gen = session.get(Generation, uuid.UUID(response.json()["id"]))
        assert gen.meta["request_fingerprint"] == fingerprint_obj(old_body)
    replay = _create(client, [asset["id"]], project_name=None, key="mobile")
    assert replay.json() == response.json()


def test_ordered_sources_resolve_root_for_revisions_and_variants(client, upload_asset, monkeypatch):
    from server.services.storage import get_storage

    first, second = upload_asset(), upload_asset()
    ids = [second["id"], first["id"]]
    root = _create(client, ids).json()
    root_url = f"/v1/edits/{root['id']}"
    queued = client.get(root_url).json()["sources"]
    assert [s["asset_id"] for s in queued] == ids
    assert [s["duration_seconds"] for s in queued] == [None, None]
    with get_sessionmaker()() as session:
        gen = session.get(Generation, uuid.UUID(root["id"]))
        gen.status = "completed"
        gen.meta = {**gen.meta, "source_durations_seconds": [42.18, None]}
        session.commit()
    revision = client.post(root_url + "/instructions", json={"instruction": "Make it faster"}).json()
    variants = client.post(root_url + "/variants", json={"count": 1, "strategy": "problem"}).json()["items"]
    # Even if a child has stale metadata, root identity and order govern the response.
    with get_sessionmaker()() as session:
        child = session.get(Generation, uuid.UUID(revision["id"]))
        child.meta = {**child.meta, "asset_ids": list(reversed(ids))}
        session.commit()
    signer = Mock(side_effect=lambda key: f"https://media.example/{key}?signature={uuid.uuid4().hex}")
    monkeypatch.setattr(get_storage(), "url_for", signer)
    for edit in [root, revision, *variants]:
        response = client.get(f"/v1/edits/{edit['id']}").json()
        assert [s["asset_id"] for s in response["sources"]] == ids
        assert [s["filename"] for s in response["sources"]] == [FIXTURE_VIDEO.name] * 2
        assert [s["duration_seconds"] for s in response["sources"]] == [42.18, None]
        assert all(s["playback_url"].startswith("https://media.example/") for s in response["sources"])
    before = client.get(root_url).json()["sources"]
    after = client.get(root_url).json()["sources"]
    assert before[0]["playback_url"] != after[0]["playback_url"]
    with get_sessionmaker()() as session:
        assert "https://" not in json.dumps(session.get(Generation, uuid.UUID(root["id"])).meta)


@pytest.mark.parametrize("duration", [None, -1, 0, True, "42", float("inf")])
def test_unverified_or_invalid_duration_is_null(client, upload_asset, duration):
    edit = _create(client, [upload_asset()["id"]]).json()
    with get_sessionmaker()() as session:
        gen = session.get(Generation, uuid.UUID(edit["id"]))
        gen.meta = {**gen.meta, "source_durations_seconds": [duration]}
        session.commit()
    assert client.get(f"/v1/edits/{edit['id']}").json()["sources"][0]["duration_seconds"] is None


def test_foreign_source_never_signed_even_if_metadata_references_it(client, upload_asset, monkeypatch):
    from server.services.storage import get_storage

    asset = upload_asset()
    root = _create(client, [asset["id"]]).json()
    with get_sessionmaker()() as session:
        session.get(Asset, uuid.UUID(asset["id"])).user_id = "other-principal"
        session.commit()
    signer = Mock()
    monkeypatch.setattr(get_storage(), "url_for", signer)
    assert client.get(f"/v1/edits/{root['id']}").status_code == 404
    signer.assert_not_called()
    assert _create(client, [asset["id"]]).status_code == 422


def test_foreign_root_never_exposes_sources_through_child(client, upload_asset, monkeypatch):
    from server.services.storage import get_storage

    root = _create(client, [upload_asset()["id"]]).json()
    child = client.post(f"/v1/edits/{root['id']}/variants",
                        json={"count": 1, "strategy": "problem"}).json()["items"][0]
    with get_sessionmaker()() as session:
        session.get(Generation, uuid.UUID(root["id"])).user_id = "other-principal"
        session.commit()
    signer = Mock()
    monkeypatch.setattr(get_storage(), "url_for", signer)
    assert client.get(f"/v1/edits/{child['id']}").status_code == 404
    signer.assert_not_called()


@pytest.mark.parametrize("limit", [1, 4, 10])
@pytest.mark.parametrize("published", [False, True])
def test_capabilities_return_configured_source_limit(client, env, fake_redis, published, limit):
    from server.services.capabilities import SNAPSHOT_KEY, normalize

    env["settings"].max_assets_per_edit = limit
    if published:
        fake_redis.set(SNAPSHOT_KEY, json.dumps(normalize({}, env["settings"])))
    assert client.get("/v1/capabilities").json()["limits"]["max_assets_per_edit"] == limit


@pytest.mark.parametrize("limit", [1, 10])
def test_config_accepts_supported_source_limit_boundaries(limit):
    from server.core.config import Settings

    assert Settings(_env_file=None, max_assets_per_edit=limit).max_assets_per_edit == limit


@pytest.mark.parametrize("limit", [-1, 0, 11, 20])
def test_config_rejects_source_limits_outside_engine_range(limit):
    from server.core.config import Settings

    with pytest.raises(ValidationError):
        Settings(_env_file=None, max_assets_per_edit=limit)


@pytest.mark.parametrize("method", ["GET", "POST", "PUT"])
def test_production_preflight_accepts_exact_origin_and_browser_headers(env, method):
    from server.api.main import create_app

    origin = "https://adcut.example"
    settings = env["settings"].model_copy(update={
        "app_env": "production", "orchestrator_provider": "local_edit", "cors_allowed_origins": [origin],
    })
    with TestClient(create_app(settings)) as client:
        response = client.options("/v1/edits", headers={
            "Origin": origin, "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "authorization,content-type,idempotency-key",
        })
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin
        assert method in response.headers["access-control-allow-methods"]
        assert "origin" in response.headers["vary"].lower()
        for bad_origin in ["https://adcut.example.evil.test", "https://unapproved.example"]:
            rejected = client.options("/v1/edits", headers={
                "Origin": bad_origin, "Access-Control-Request-Method": method,
            })
            assert rejected.status_code == 400
            assert "access-control-allow-origin" not in rejected.headers
        rejected = client.options("/v1/edits", headers={
            "Origin": origin, "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "x-unapproved-header",
        })
        assert rejected.status_code == 400


@pytest.mark.parametrize("requested,succeeds", [(True, True), (True, False), (False, True)])
def test_runner_reports_only_successful_requested_captions_and_probed_sources(tmp_path, monkeypatch, requested, succeeds):
    from server.runtime import local_edit_runner as runner
    from server.services.edit_planner import plan_edit

    # Exercise runner decisions without subprocess/media work; the caption helper owns burn-in verification.
    trimmer = SimpleNamespace(execute=lambda op: SimpleNamespace(success=True))
    monkeypatch.setitem(sys.modules, "tools.video.video_trimmer", SimpleNamespace(VideoTrimmer=lambda: trimmer))
    monkeypatch.setattr(runner, "ff", lambda *a, **k: None)
    monkeypatch.setattr(runner, "normalize", lambda *a, **k: None)
    monkeypatch.setattr(runner, "detect_face_crop_offset", lambda *a, **k: None)
    monkeypatch.setattr(runner, "find_font", lambda *a: None)
    monkeypatch.setattr(runner, "probe", lambda p: {
        "duration": 42.18 if p.name == "one.mp4" else 17.5, "has_audio": True,
    })
    captions = Mock(return_value=succeeds)
    monkeypatch.setattr(runner, "add_captions", captions)
    instruction = "Add captions." if requested else "Keep all footage."
    result = runner.run({
        "project_dir": str(tmp_path), "project_id": "contract", "pipeline": "app-cinematic",
        "aspect_ratio": "9:16", "sources": ["one.mp4", "two.mp4"], "plan": plan_edit(instruction).to_dict(),
    })
    assert result["source_durations_seconds"] == [42.18, 17.5]
    assert result["insights"] == ({"captions_added": True} if requested and succeeds else {})
    assert ("captions_unavailable" in result["warnings"]) == (requested and not succeeds)
    assert captions.call_count == int(requested)


def test_runtime_keeps_caption_evidence_alongside_take_insights(env, tmp_path, monkeypatch):
    from server.runtime.local_edit_runtime import LocalEditRuntime, _Proc
    from tests.test_runtime import _ctx

    runtime = LocalEditRuntime(env["settings"])
    ctx = _ctx(tmp_path, prompt="Remove retakes and add captions.", source_files=[FIXTURE_VIDEO], kind="edit")
    process = _Proc()
    process.event = {"ok": True, "insights": {"captions_added": True}, "source_durations_seconds": [42.18]}
    monkeypatch.setattr(runtime, "_spawn", lambda *a, **k: process)
    monkeypatch.setattr(runtime, "_select_takes", lambda *a: (None, {"retakes_removed": 2}))
    result = runtime.run_generation(ctx)
    assert result.insights == {"retakes_removed": 2, "captions_added": True}
    assert result.source_durations_seconds == [42.18]
