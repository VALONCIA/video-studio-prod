import { afterEach, describe, expect, it, vi } from 'vitest';
import { editFixture, queuedEditFixture } from '../../test/fixtures';
import { createSignedMediaRefresh } from './media-refresh';
import { nextPollDelay, observeEdit } from './edit-polling';

afterEach(() => vi.useRealTimers());

function lifecycleEnvironment(initial: { hidden: boolean; online: boolean }) {
  let hidden = initial.hidden;
  let online = initial.online;
  const documentTarget = new EventTarget();
  const windowTarget = new EventTarget();
  Object.defineProperty(documentTarget, 'hidden', { get: () => hidden });
  Object.defineProperty(windowTarget, 'navigator', {
    value: {
      get onLine() {
        return online;
      },
    },
  });
  return {
    document: documentTarget as Document,
    window: windowTarget as Window,
    setHidden(value: boolean) {
      hidden = value;
      documentTarget.dispatchEvent(new Event('visibilitychange'));
    },
    setOnline(value: boolean) {
      online = value;
      windowTarget.dispatchEvent(new Event(value ? 'online' : 'offline'));
    },
  };
}

describe('edit observation', () => {
  it('uses visible/hidden intervals, bounded backoff, and stops terminal edits', () => {
    expect(
      nextPollDelay({
        status: 'queued',
        hidden: false,
        online: true,
        failures: 0,
      }),
    ).toBe(2000);
    expect(
      nextPollDelay({
        status: 'running',
        hidden: true,
        online: true,
        failures: 0,
      }),
    ).toBe(10000);
    expect(
      nextPollDelay({
        status: 'running',
        hidden: false,
        online: true,
        failures: 50,
      }),
    ).toBe(60000);
    expect(
      nextPollDelay({
        status: 'completed',
        hidden: false,
        online: true,
        failures: 0,
      }),
    ).toBe(false);
    expect(
      nextPollDelay({
        status: 'running',
        hidden: false,
        online: false,
        failures: 0,
      }),
    ).toBe(false);
  });

  it('polls immediately then stops after terminal result or disposal', async () => {
    vi.useFakeTimers();
    const fetchEdit = vi
      .fn()
      .mockResolvedValueOnce(queuedEditFixture)
      .mockResolvedValueOnce(editFixture);
    const onEdit = vi.fn();
    const stop = observeEdit({ fetchEdit, onEdit });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEdit).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchEdit).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetchEdit).toHaveBeenCalledTimes(2);
    stop();
  });

  it('recovers hidden polling after startup offline and later offline/online transitions', async () => {
    vi.useFakeTimers();
    const lifecycle = lifecycleEnvironment({ hidden: true, online: false });
    const fetchEdit = vi.fn().mockResolvedValue(queuedEditFixture);
    const stop = observeEdit({
      fetchEdit,
      onEdit: vi.fn(),
      document: lifecycle.document,
      window: lifecycle.window,
    });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchEdit).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    lifecycle.setOnline(true);
    lifecycle.setOnline(true);
    expect(fetchEdit).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(fetchEdit).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchEdit).toHaveBeenCalledTimes(2);

    lifecycle.setOnline(false);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchEdit).toHaveBeenCalledTimes(2);
    lifecycle.setOnline(true);
    expect(fetchEdit).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchEdit).toHaveBeenCalledTimes(4);

    lifecycle.setHidden(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEdit).toHaveBeenCalledTimes(5);
    lifecycle.setHidden(true);
    expect(vi.getTimerCount()).toBe(1);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(fetchEdit).toHaveBeenCalledTimes(5);
  });

  it('refreshes a failed signed media URL once', async () => {
    const refetch = vi.fn().mockResolvedValue(editFixture);
    const refresh = createSignedMediaRefresh(refetch);
    expect(
      await Promise.all([
        refresh.onAuthorizationFailure(),
        refresh.onAuthorizationFailure(),
      ]),
    ).toEqual([true, true]);
    expect(await refresh.onAuthorizationFailure()).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
