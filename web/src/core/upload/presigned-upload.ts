import type { Presign } from '../api/contracts';

export type UploadFailureKind =
  'cancelled' | 'timeout' | 'network' | 'rejected';
export class UploadError extends Error {
  constructor(
    public readonly kind: UploadFailureKind,
    public readonly status?: number,
  ) {
    super(
      kind === 'cancelled'
        ? 'Upload cancelled.'
        : kind === 'timeout'
          ? 'Upload timed out. Please try again.'
          : 'Upload failed. Please try again.',
    );
    this.name = 'UploadError';
  }
}

export interface UploadProgress {
  loaded: number;
  total: number;
  fraction: number;
}
export interface UploadResult {
  status: number;
  headers: Record<string, string>;
}
export interface UploadOptions {
  reservation: Presign;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
  xhrFactory?: () => XMLHttpRequest;
}

export function uploadPresignedFile(
  options: UploadOptions,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = options.xhrFactory?.() ?? new XMLHttpRequest();
    let settled = false;
    const finish = (result: UploadResult | UploadError) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener('abort', abort);
      if (result instanceof UploadError) reject(result);
      else resolve(result);
    };
    const abort = () => xhr.abort();
    if (options.signal?.aborted) {
      finish(new UploadError('cancelled'));
      return;
    }
    options.signal?.addEventListener('abort', abort, { once: true });
    xhr.upload.onprogress = (event) => {
      const loaded = Math.min(Math.max(0, event.loaded), options.file.size);
      options.onProgress?.({
        loaded,
        total: options.file.size,
        fraction: options.file.size > 0 ? loaded / options.file.size : 0,
      });
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        finish(new UploadError('rejected', xhr.status));
        return;
      }
      const headers: Record<string, string> = {};
      for (const line of xhr.getAllResponseHeaders().trim().split(/\r?\n/)) {
        const separator = line.indexOf(':');
        if (separator > 0)
          headers[line.slice(0, separator).trim().toLowerCase()] = line
            .slice(separator + 1)
            .trim();
      }
      finish({ status: xhr.status, headers });
    };
    xhr.onerror = () => finish(new UploadError('network'));
    xhr.ontimeout = () => finish(new UploadError('timeout'));
    xhr.onabort = () => finish(new UploadError('cancelled'));
    try {
      xhr.open('PUT', options.reservation.url);
      xhr.timeout = options.timeoutMs ?? 120_000;
      for (const [name, value] of Object.entries(options.reservation.headers))
        xhr.setRequestHeader(name, value);
      xhr.send(options.file);
    } catch {
      finish(new UploadError('network'));
    }
  });
}

export type ReservationState =
  | 'reserved'
  | 'put_succeeded'
  | 'complete_ambiguous'
  | 'completed'
  | 'put_rejected';
export function reservationReuse(
  state: ReservationState,
  expiresAt: number,
  now = Date.now(),
) {
  if (state === 'completed') return 'done' as const;
  if (state === 'put_succeeded' || state === 'complete_ambiguous')
    return 'retry_complete' as const;
  if (state === 'put_rejected' || expiresAt <= now)
    return 'reserve_new' as const;
  return 'retry_put' as const;
}
