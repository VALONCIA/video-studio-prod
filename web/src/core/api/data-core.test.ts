import { HttpResponse, http } from 'msw';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDeviceSessionStore,
  SESSION_REFRESH_SKEW_MS,
} from '../auth/device-session';
import { createApiClient } from './client';
import { ApiError } from './errors';
import { createQueryOptions, queryKeys } from './queries';
import { server } from '../../test/server';
import {
  capabilitiesFixture,
  editFixture,
  ids,
  projectDetailFixture,
} from '../../test/fixtures';

beforeEach(() => localStorage.clear());

describe('device session', () => {
  it('persists a new identity, reuses a valid token, and refreshes within 24 hours', async () => {
    let clock = 1_000_000;
    const bootstrap = vi.fn(async () => ({
      access_token: 'first',
      token_type: 'bearer' as const,
      expires_in: 3 * 24 * 60 * 60,
    }));
    const store = createDeviceSessionStore({
      storage: localStorage,
      now: () => clock,
      createId: () => ids.install,
      bootstrap,
    });
    expect(await store.token()).toBe('first');
    expect(await store.token()).toBe('first');
    expect(bootstrap).toHaveBeenCalledTimes(1);
    const reloaded = createDeviceSessionStore({
      storage: localStorage,
      now: () => clock,
      bootstrap,
    });
    expect(await reloaded.token()).toBe('first');
    expect(bootstrap).toHaveBeenCalledTimes(1);
    clock += 3 * 24 * 60 * 60 * 1000 - SESSION_REFRESH_SKEW_MS + 1;
    bootstrap.mockResolvedValueOnce({
      access_token: 'second',
      token_type: 'bearer',
      expires_in: 300000,
    });
    expect(await store.token()).toBe('second');
    expect(
      JSON.parse(localStorage.getItem('adcut.device-session.v1')!).accessToken,
    ).toBe('second');
    expect(bootstrap).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent refresh and stale-401 recovery', async () => {
    let release!: (value: {
      access_token: string;
      token_type: 'bearer';
      expires_in: number;
    }) => void;
    const bootstrap = vi.fn(
      () =>
        new Promise<{
          access_token: string;
          token_type: 'bearer';
          expires_in: number;
        }>((resolve) => {
          release = resolve;
        }),
    );
    const store = createDeviceSessionStore({
      storage: localStorage,
      createId: () => ids.install,
      bootstrap,
    });
    const first = store.token();
    const second = store.token();
    release({
      access_token: 'shared',
      token_type: 'bearer',
      expires_in: 300000,
    });
    expect(await Promise.all([first, second])).toEqual(['shared', 'shared']);
    expect(await store.recover('older')).toBe('shared');
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });
});

describe('typed API', () => {
  it('parses real resource shapes and exposes query keys', async () => {
    const api = createApiClient({ storage: localStorage });
    expect(await api.capabilities()).toEqual(capabilitiesFixture);
    expect(await api.project(ids.project)).toEqual(projectDetailFixture);
    expect(await api.edit(ids.edit)).toEqual(editFixture);
    expect((await api.variants(ids.edit)).items[0]?.variant?.label).toBe(
      'Hook A',
    );
    expect(createQueryOptions(api).edit(ids.edit).queryKey).toEqual(
      queryKeys.edit(ids.edit),
    );
  });

  it('retries a protected 401 once with one refresh across concurrent requests', async () => {
    let sessionCalls = 0;
    let protectedCalls = 0;
    server.use(
      http.post('http://localhost:8000/v1/auth/device-session', () =>
        HttpResponse.json({
          access_token: `token-${++sessionCalls}`,
          token_type: 'bearer',
          expires_in: 300000,
        }),
      ),
      http.get('http://localhost:8000/v1/capabilities', ({ request }) => {
        protectedCalls += 1;
        return request.headers.get('authorization') === 'Bearer token-1'
          ? HttpResponse.json(
              { error: { code: 'UNAUTHORIZED', message: 'Expired' } },
              { status: 401 },
            )
          : HttpResponse.json(capabilitiesFixture);
      }),
    );
    const api = createApiClient({ storage: localStorage });
    expect(await Promise.all([api.capabilities(), api.capabilities()])).toEqual(
      [capabilitiesFixture, capabilitiesFixture],
    );
    expect(sessionCalls).toBe(2);
    expect(protectedCalls).toBe(4);
  });

  it('limits a repeated 401 to one retry and gives a safe error', async () => {
    server.use(
      http.get('http://localhost:8000/v1/capabilities', () =>
        HttpResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Bearer secret https://signed.example/?token=secret',
            },
          },
          { status: 401 },
        ),
      ),
    );
    const api = createApiClient({ storage: localStorage });
    await expect(api.capabilities()).rejects.toMatchObject({
      kind: 'session',
      status: 401,
    });
  });

  it('turns malformed success and error bodies into typed, safe contract failures', async () => {
    const api = createApiClient({ storage: localStorage });
    server.use(
      http.get('http://localhost:8000/v1/capabilities', () =>
        HttpResponse.json({ editing: true }),
      ),
    );
    await expect(api.capabilities()).rejects.toMatchObject({
      kind: 'contract',
    });
    server.use(
      http.get('http://localhost:8000/v1/capabilities', () =>
        HttpResponse.json(
          {
            arbitrary: 'https://signed.example/?token=secret',
          },
          { status: 500 },
        ),
      ),
    );
    try {
      await api.capabilities();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(String(error)).not.toContain('secret');
    }
  });
});

describe('query retry policy', () => {
  async function fetchCapabilities() {
    const api = createApiClient({ storage: localStorage });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: 1 } },
    });
    try {
      return await client.fetchQuery({
        ...createQueryOptions(api).capabilities(),
        retryDelay: 0,
      });
    } finally {
      client.clear();
    }
  }

  it('does not rerun rate limits or malformed responses', async () => {
    let calls = 0;
    server.use(
      http.get('http://localhost:8000/v1/capabilities', () => {
        calls += 1;
        return HttpResponse.json(
          { error: { code: 'RATE_LIMITED', message: 'Wait.' } },
          { status: 429 },
        );
      }),
    );
    await expect(fetchCapabilities()).rejects.toMatchObject({
      kind: 'http',
      status: 429,
    });
    expect(calls).toBe(1);

    server.use(
      http.get('http://localhost:8000/v1/capabilities', () => {
        calls += 1;
        return HttpResponse.json({ editing: true });
      }),
    );
    await expect(fetchCapabilities()).rejects.toMatchObject({
      kind: 'contract',
    });
    expect(calls).toBe(2);
  });

  it('does not restart an exhausted protected-401 recovery sequence', async () => {
    let protectedCalls = 0;
    let sessions = 0;
    server.use(
      http.post('http://localhost:8000/v1/auth/device-session', () => {
        sessions += 1;
        return HttpResponse.json({
          access_token: `token-${sessions}`,
          token_type: 'bearer',
          expires_in: 300000,
        });
      }),
      http.get('http://localhost:8000/v1/capabilities', () => {
        protectedCalls += 1;
        return HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Expired.' } },
          { status: 401 },
        );
      }),
    );
    await expect(fetchCapabilities()).rejects.toMatchObject({
      kind: 'session',
      status: 401,
    });
    expect(protectedCalls).toBe(2);
    expect(sessions).toBe(2);
  });

  it('bounds retries of transient network and server failures', async () => {
    let calls = 0;
    server.use(
      http.get('http://localhost:8000/v1/capabilities', () => {
        calls += 1;
        return HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Unavailable.' } },
          { status: 503 },
        );
      }),
    );
    await expect(fetchCapabilities()).rejects.toMatchObject({
      kind: 'http',
      status: 503,
    });
    expect(calls).toBe(2);
  });
});
