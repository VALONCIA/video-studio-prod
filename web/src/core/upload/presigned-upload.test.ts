import { describe, expect, it, vi } from 'vitest';
import { uploadPresignedFile, reservationReuse } from './presigned-upload';
import type { Presign } from '../api/contracts';
import { ids } from '../../test/fixtures';

const reservation: Presign = {
  upload_id: 'upload',
  asset_id: ids.asset,
  method: 'PUT',
  url: 'https://storage.example/upload?signature=secret',
  headers: { 'Content-Type': 'video/mp4' },
  key: 'uploads/file',
  expires_in: 900,
  max_bytes: 1000,
};

class FakeXhr {
  upload = { onprogress: null as null | ((event: ProgressEvent) => void) };
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  ontimeout: null | (() => void) = null;
  onabort: null | (() => void) = null;
  status = 0;
  timeout = 0;
  body?: File;
  open = vi.fn();
  setRequestHeader = vi.fn();
  getAllResponseHeaders = () => 'ETag: abc\r\n';
  send(body: File) {
    this.body = body;
  }
  abort() {
    this.onabort?.();
  }
}

describe('presigned upload', () => {
  it('sends the original bytes and reports only browser-loaded bytes', async () => {
    const xhr = new FakeXhr();
    const file = new File(['1234567890'], 'take.mp4', { type: 'video/mp4' });
    const onProgress = vi.fn();
    const result = uploadPresignedFile({
      reservation,
      file,
      onProgress,
      xhrFactory: () => xhr as unknown as XMLHttpRequest,
    });
    expect(xhr.body).toBe(file);
    expect(xhr.open).toHaveBeenCalledWith('PUT', reservation.url);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith(
      'Content-Type',
      'video/mp4',
    );
    xhr.upload.onprogress?.({ loaded: 4 } as ProgressEvent);
    expect(onProgress).toHaveBeenCalledWith({
      loaded: 4,
      total: 10,
      fraction: 0.4,
    });
    xhr.status = 200;
    xhr.onload?.();
    await expect(result).resolves.toEqual({
      status: 200,
      headers: { etag: 'abc' },
    });
  });

  it('cancels the active XHR and maps timeout/rejection safely', async () => {
    const file = new File(['x'], 'take.mp4');
    const xhr = new FakeXhr();
    const controller = new AbortController();
    const cancelled = uploadPresignedFile({
      reservation,
      file,
      signal: controller.signal,
      xhrFactory: () => xhr as unknown as XMLHttpRequest,
    });
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ kind: 'cancelled' });
    const timeoutXhr = new FakeXhr();
    const timedOut = uploadPresignedFile({
      reservation,
      file,
      xhrFactory: () => timeoutXhr as unknown as XMLHttpRequest,
    });
    timeoutXhr.ontimeout?.();
    await expect(timedOut).rejects.toMatchObject({ kind: 'timeout' });
    const rejectedXhr = new FakeXhr();
    const rejected = uploadPresignedFile({
      reservation,
      file,
      xhrFactory: () => rejectedXhr as unknown as XMLHttpRequest,
    });
    rejectedXhr.status = 403;
    rejectedXhr.onload?.();
    await expect(rejected).rejects.toMatchObject({
      kind: 'rejected',
      status: 403,
    });
  });

  it('reuses an accepted PUT for ambiguous completion and renews rejected reservations', () => {
    expect(reservationReuse('complete_ambiguous', 0)).toBe('retry_complete');
    expect(reservationReuse('put_succeeded', 0)).toBe('retry_complete');
    expect(reservationReuse('put_rejected', Date.now() + 1000)).toBe(
      'reserve_new',
    );
    expect(reservationReuse('reserved', Date.now() - 1)).toBe('reserve_new');
  });
});
