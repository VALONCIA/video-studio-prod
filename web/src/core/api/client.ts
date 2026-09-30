import type { z } from 'zod';
import { publicEnv } from '../config/public-env';
import {
  createDeviceSessionStore,
  SessionError,
  type DeviceSessionStore,
} from '../auth/device-session';
import {
  assetSchema,
  capabilitiesSchema,
  deviceSessionSchema,
  editAcceptedSchema,
  editListSchema,
  editSchema,
  presignSchema,
  projectDetailSchema,
  projectListSchema,
  projectSchema,
} from './contracts';
import { ApiError, parseErrorBody, parseSuccess } from './errors';

export interface ApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  session?: DeviceSessionStore;
  storage?: Storage;
}

export interface CreateEditInput {
  project_id?: string | null;
  project_name?: string | null;
  asset_ids: string[];
  instruction: string;
  platform?: 'tiktok' | 'meta' | 'reels' | 'shorts';
  aspect_ratio?: '9:16' | '1:1' | '16:9';
  duration_target_seconds?: number | null;
  cta_text?: string | null;
  brand_kit_id?: string | null;
}
export interface PresignInput {
  filename: string;
  content_type: string;
  purpose: 'reference' | 'source_video';
  size_bytes?: number;
  project_id?: string | null;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? publicEnv.apiBaseUrl).replace(/\/+$/, '');
  const fetcher = options.fetcher ?? fetch;

  async function bootstrap(installId: string) {
    try {
      const response = await fetcher(`${baseUrl}/v1/auth/device-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ install_id: installId }),
      });
      const body: unknown = await response.json().catch(() => undefined);
      if (!response.ok) throw parseErrorBody(body, response.status);
      return parseSuccess(deviceSessionSchema, body);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('network');
    }
  }

  const session =
    options.session ??
    createDeviceSessionStore({ bootstrap, storage: options.storage });

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    config: {
      method?: 'GET' | 'POST';
      body?: unknown;
      idempotencyKey?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    let token: string;
    try {
      token = await session.token();
    } catch (error) {
      if (error instanceof SessionError) throw new ApiError('session');
      throw new ApiError('session');
    }
    async function send(accessToken: string): Promise<Response> {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      };
      if (config.body !== undefined)
        headers['Content-Type'] = 'application/json';
      if (config.idempotencyKey)
        headers['Idempotency-Key'] = config.idempotencyKey;
      try {
        return await fetcher(`${baseUrl}${path}`, {
          method: config.method ?? 'GET',
          headers,
          body:
            config.body === undefined ? undefined : JSON.stringify(config.body),
          signal: config.signal,
        });
      } catch (error) {
        if (config.signal?.aborted) throw error;
        throw new ApiError('network');
      }
    }
    let response = await send(token);
    if (response.status === 401) {
      try {
        token = await session.recover(token);
      } catch {
        throw new ApiError('session');
      }
      response = await send(token);
      if (response.status === 401) throw new ApiError('session', 401);
    }
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw parseErrorBody(body, response.status);
    return parseSuccess(schema, body);
  }

  const editPath = (id: string) => `/v1/edits/${encodeURIComponent(id)}`;
  return {
    session,
    request,
    capabilities: (signal?: AbortSignal) =>
      request('/v1/capabilities', capabilitiesSchema, { signal }),
    projects: (signal?: AbortSignal) =>
      request('/v1/projects', projectListSchema, { signal }),
    project: (id: string, signal?: AbortSignal) =>
      request(`/v1/projects/${encodeURIComponent(id)}`, projectDetailSchema, {
        signal,
      }),
    createProject: (name: string) =>
      request('/v1/projects', projectSchema, {
        method: 'POST',
        body: { name },
      }),
    presign: (input: PresignInput) =>
      request('/v1/uploads/presign', presignSchema, {
        method: 'POST',
        body: input,
      }),
    completeUpload: (assetId: string) =>
      request(
        `/v1/uploads/${encodeURIComponent(assetId)}/complete`,
        assetSchema,
        { method: 'POST' },
      ),
    edits: (projectId?: string, signal?: AbortSignal) =>
      request(
        `/v1/edits${projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''}`,
        editListSchema,
        { signal },
      ),
    edit: (id: string, signal?: AbortSignal) =>
      request(editPath(id), editSchema, { signal }),
    createEdit: (input: CreateEditInput, idempotencyKey: string) =>
      request('/v1/edits', editAcceptedSchema, {
        method: 'POST',
        body: input,
        idempotencyKey,
      }),
    cancelEdit: (id: string) =>
      request(`${editPath(id)}/cancel`, editSchema, { method: 'POST' }),
    reviseEdit: (id: string, instruction: string, idempotencyKey: string) =>
      request(`${editPath(id)}/instructions`, editAcceptedSchema, {
        method: 'POST',
        body: { instruction },
        idempotencyKey,
      }),
    restoreRange: (
      id: string,
      range: { source: number; start: number; end: number },
      idempotencyKey: string,
    ) =>
      request(`${editPath(id)}/restore`, editAcceptedSchema, {
        method: 'POST',
        body: range,
        idempotencyKey,
      }),
    variants: (id: string, signal?: AbortSignal) =>
      request(`${editPath(id)}/variants`, editListSchema, { signal }),
    createVariants: (
      id: string,
      input: { count: number; strategy: string },
      idempotencyKey: string,
    ) =>
      request(`${editPath(id)}/variants`, editListSchema, {
        method: 'POST',
        body: input,
        idempotencyKey,
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
