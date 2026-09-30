import { queryOptions } from '@tanstack/react-query';
import type { ApiClient } from './client';
import { ApiError } from './errors';

/** One retry for transport/server failures; user recovery is explicit for all other errors. */
export function shouldRetryApiQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 1 || !(error instanceof ApiError)) return false;
  if (error.kind === 'network') return true;
  return (
    error.kind === 'http' &&
    (error.status === 408 ||
      (error.status !== undefined && error.status >= 500))
  );
}

export const queryKeys = {
  capabilities: ['capabilities'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  edits: (projectId?: string) =>
    ['edits', { projectId: projectId ?? null }] as const,
  edit: (id: string) => ['edits', id] as const,
  variants: (editId: string) => ['edits', editId, 'variants'] as const,
};

export function createQueryOptions(api: ApiClient) {
  return {
    capabilities: () =>
      queryOptions({
        queryKey: queryKeys.capabilities,
        queryFn: ({ signal }) => api.capabilities(signal),
        retry: shouldRetryApiQuery,
        staleTime: 0,
        refetchOnReconnect: 'always' as const,
      }),
    projects: () =>
      queryOptions({
        queryKey: queryKeys.projects,
        queryFn: ({ signal }) => api.projects(signal),
        retry: shouldRetryApiQuery,
      }),
    project: (id: string) =>
      queryOptions({
        queryKey: queryKeys.project(id),
        queryFn: ({ signal }) => api.project(id, signal),
        retry: shouldRetryApiQuery,
      }),
    edits: (projectId?: string) =>
      queryOptions({
        queryKey: queryKeys.edits(projectId),
        queryFn: ({ signal }) => api.edits(projectId, signal),
        retry: shouldRetryApiQuery,
      }),
    edit: (id: string) =>
      queryOptions({
        queryKey: queryKeys.edit(id),
        queryFn: ({ signal }) => api.edit(id, signal),
        retry: shouldRetryApiQuery,
      }),
    variants: (editId: string) =>
      queryOptions({
        queryKey: queryKeys.variants(editId),
        queryFn: ({ signal }) => api.variants(editId, signal),
        retry: shouldRetryApiQuery,
      }),
  };
}
