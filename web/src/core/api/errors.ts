import { z } from 'zod';
import { backendErrorSchema } from './contracts';

export type ApiErrorKind = 'network' | 'http' | 'contract' | 'session';
export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(messageFor(kind, status, code));
    this.name = 'ApiError';
  }
}

function messageFor(
  kind: ApiErrorKind,
  status?: number,
  code?: string,
): string {
  if (kind === 'session')
    return 'Your session could not be restored. Please try again.';
  if (kind === 'contract')
    return 'We could not read the server response. Please try again.';
  if (kind === 'network')
    return 'Could not connect. Check your connection and try again.';
  if (status === 429 || code === 'RATE_LIMITED')
    return 'Please wait a moment before trying again.';
  if (status === 401)
    return 'Your session could not be restored. Please try again.';
  if (status === 404) return 'This item could not be found.';
  if (status === 413 || code === 'PAYLOAD_TOO_LARGE')
    return 'This file is too large.';
  if (status === 503)
    return 'This service is temporarily unavailable. Please try again.';
  if (code === 'IDEMPOTENCY_CONFLICT')
    return 'This request changed. Please start a new action.';
  return 'The request could not be completed. Please try again.';
}

export function parseErrorBody(body: unknown, status: number): ApiError {
  const parsed = backendErrorSchema.safeParse(body);
  if (!parsed.success) return new ApiError('contract', status);
  return new ApiError('http', status, parsed.data.error.code);
}

export function parseSuccess<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError('contract');
  return parsed.data;
}
