import { HttpResponse, http } from 'msw';
import type {
  Capabilities,
  Edit,
  Project,
  ProjectDetail,
} from '../core/api/contracts';

export const ids = {
  install: '01000000-0000-4000-8000-000000000001',
  project: '01000000-0000-4000-8000-000000000002',
  asset: '01000000-0000-4000-8000-000000000003',
  edit: '01000000-0000-4000-8000-000000000004',
  version: '01000000-0000-4000-8000-000000000005',
};
const time = '2026-09-30T10:00:00Z';

export const capabilitiesFixture: Capabilities = {
  status: 'ok',
  generation_available: false,
  editing: true,
  ai_broll: false,
  video_generation: false,
  variants: true,
  revisions: true,
  best_takes: false,
  takes_llm: false,
  audio_cleanup: true,
  smart_crop: false,
  pipelines: [{ id: 'app-cinematic', enabled: false }],
  features: {
    text_to_video: false,
    image_generation: false,
    tts: false,
    captions: true,
    music: false,
    stock_video: false,
  },
  limits: {
    durations_seconds: [15, 30, 45, 60],
    aspect_ratios: ['9:16', '1:1', '16:9'],
    quality: ['standard', 'cinematic'],
    max_prompt_chars: 2000,
    max_assets_per_edit: 10,
    uploads: true,
  },
};
export const unavailableCapabilitiesFixture: Capabilities = {
  ...capabilitiesFixture,
  status: 'unknown',
  editing: false,
  variants: false,
  revisions: false,
  audio_cleanup: false,
  features: { ...capabilitiesFixture.features, captions: false },
  limits: { ...capabilitiesFixture.limits, uploads: false },
};

export const assetFixture = {
  id: ids.asset,
  project_id: ids.project,
  filename: 'take.mp4',
  content_type: 'video/mp4',
  purpose: 'source_video',
  size_bytes: 1024,
  status: 'uploaded' as const,
  created_at: time,
};

export const editFixture: Edit = {
  id: ids.edit,
  project_id: ids.project,
  kind: 'edit',
  parent_id: null,
  version: 1,
  status: 'completed',
  progress: 100,
  stage: 'done',
  display_stage: 'Ready',
  instruction: 'Remove awkward pauses and retakes.',
  platform: 'tiktok',
  aspect_ratio: '9:16',
  duration_target_seconds: 30,
  duration_seconds: 25,
  variant: null,
  output_url: 'https://storage.example/output?signature=secret',
  thumbnail_url: null,
  warnings: [],
  insights: { retakes_removed: 2, captions_added: true },
  kept_ranges: [{ source: 0, start: 0, end: 25 }],
  sources: [
    {
      asset_id: ids.asset,
      filename: 'take.mp4',
      duration_seconds: 42,
      playback_url: 'https://storage.example/input?signature=secret',
    },
  ],
  error: null,
  versions: [
    {
      id: ids.version,
      version: 1,
      instruction: 'Remove awkward pauses and retakes.',
      status: 'completed',
      progress: 100,
      output_url: 'https://storage.example/output?signature=secret',
      thumbnail_url: null,
      kept_ranges: [{ source: 0, start: 0, end: 25 }],
      created_at: time,
    },
  ],
  created_at: time,
  started_at: time,
  completed_at: time,
  updated_at: time,
};

export const queuedEditFixture: Edit = {
  ...editFixture,
  status: 'queued',
  progress: 0,
  stage: null,
  display_stage: null,
  output_url: null,
  completed_at: null,
  versions: [],
  sources: [{ ...editFixture.sources[0]!, duration_seconds: null }],
};
export const failedEditFixture: Edit = {
  ...queuedEditFixture,
  status: 'failed',
  error: {
    code: 'GENERATION_FAILED',
    message: "We couldn't finish this video.",
  },
};
export const runningEditFixture: Edit = {
  ...queuedEditFixture,
  status: 'running',
  progress: 45,
  display_stage: 'Making your cut',
  started_at: time,
};

export const projectFixture: Project = {
  id: ids.project,
  name: 'Founder take',
  created_at: time,
  updated_at: time,
  edit_count: 1,
  latest_edit: editFixture,
};
export const projectDetailFixture: ProjectDetail = {
  ...projectFixture,
  assets: [assetFixture],
  edits: [editFixture],
};
export const emptyProjectFixture: ProjectDetail = {
  ...projectDetailFixture,
  edit_count: 0,
  latest_edit: null,
  assets: [],
  edits: [],
};

export const stateHandlers = {
  unavailableCapabilities: (baseUrl = 'http://localhost:8000') =>
    http.get(`${baseUrl}/v1/capabilities`, () =>
      HttpResponse.json(unavailableCapabilitiesFixture),
    ),
  emptyProjects: (baseUrl = 'http://localhost:8000') =>
    http.get(`${baseUrl}/v1/projects`, () => HttpResponse.json({ items: [] })),
  queuedEdit: (baseUrl = 'http://localhost:8000') =>
    http.get(`${baseUrl}/v1/edits/:id`, () =>
      HttpResponse.json(queuedEditFixture),
    ),
  runningEdit: (baseUrl = 'http://localhost:8000') =>
    http.get(`${baseUrl}/v1/edits/:id`, () =>
      HttpResponse.json(runningEditFixture),
    ),
  failedEdit: (baseUrl = 'http://localhost:8000') =>
    http.get(`${baseUrl}/v1/edits/:id`, () =>
      HttpResponse.json(failedEditFixture),
    ),
  rateLimited: (baseUrl = 'http://localhost:8000') =>
    http.get(`${baseUrl}/v1/capabilities`, () =>
      HttpResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Please wait before trying again.',
          },
        },
        { status: 429 },
      ),
    ),
};

export function apiHandlers(baseUrl = 'http://localhost:8000') {
  return [
    http.post(`${baseUrl}/v1/auth/device-session`, () =>
      HttpResponse.json({
        access_token: 'fixture-token',
        token_type: 'bearer',
        expires_in: 7 * 24 * 60 * 60,
      }),
    ),
    http.get(`${baseUrl}/v1/capabilities`, () =>
      HttpResponse.json(capabilitiesFixture),
    ),
    http.get(`${baseUrl}/v1/projects`, () =>
      HttpResponse.json({ items: [projectFixture] }),
    ),
    http.post(`${baseUrl}/v1/projects`, () =>
      HttpResponse.json(projectFixture, { status: 201 }),
    ),
    http.get(`${baseUrl}/v1/projects/:id`, () =>
      HttpResponse.json(projectDetailFixture),
    ),
    http.post(`${baseUrl}/v1/uploads/presign`, () =>
      HttpResponse.json({
        upload_id: ids.asset.replaceAll('-', ''),
        asset_id: ids.asset,
        method: 'PUT',
        url: 'https://storage.example/upload?signature=secret',
        headers: { 'Content-Type': 'video/mp4' },
        key: 'uploads/device/take.mp4',
        expires_in: 900,
        max_bytes: 100000000,
      }),
    ),
    http.post(`${baseUrl}/v1/uploads/:id/complete`, () =>
      HttpResponse.json(assetFixture),
    ),
    http.get(`${baseUrl}/v1/edits`, () =>
      HttpResponse.json({ items: [editFixture] }),
    ),
    http.post(`${baseUrl}/v1/edits`, () =>
      HttpResponse.json(
        {
          id: ids.edit,
          project_id: ids.project,
          status: 'queued',
          progress: 0,
          poll_url: `/v1/edits/${ids.edit}`,
        },
        { status: 202 },
      ),
    ),
    http.get(`${baseUrl}/v1/edits/:id`, () => HttpResponse.json(editFixture)),
    http.post(`${baseUrl}/v1/edits/:id/cancel`, () =>
      HttpResponse.json({ ...queuedEditFixture, status: 'cancelled' }),
    ),
    http.post(`${baseUrl}/v1/edits/:id/instructions`, () =>
      HttpResponse.json(
        {
          id: ids.version,
          project_id: ids.project,
          status: 'queued',
          progress: 0,
          poll_url: `/v1/edits/${ids.version}`,
        },
        { status: 202 },
      ),
    ),
    http.post(`${baseUrl}/v1/edits/:id/restore`, () =>
      HttpResponse.json(
        {
          id: ids.version,
          project_id: ids.project,
          status: 'queued',
          progress: 0,
          poll_url: `/v1/edits/${ids.version}`,
        },
        { status: 202 },
      ),
    ),
    http.get(`${baseUrl}/v1/edits/:id/variants`, () =>
      HttpResponse.json({
        items: [
          {
            ...editFixture,
            kind: 'variant',
            variant: { strategy: 'hooks', label: 'Hook A' },
          },
        ],
      }),
    ),
    http.post(`${baseUrl}/v1/edits/:id/variants`, () =>
      HttpResponse.json(
        {
          items: [
            {
              ...queuedEditFixture,
              kind: 'variant',
              variant: { strategy: 'hooks', label: 'Hook A' },
            },
          ],
        },
        { status: 202 },
      ),
    ),
  ];
}
