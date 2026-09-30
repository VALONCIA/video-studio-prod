import { z } from 'zod';
import { deviceSessionSchema } from '../api/contracts';

const INSTALL_KEY = 'adcut.install.v1';
const SESSION_KEY = 'adcut.device-session.v1';
export const SESSION_REFRESH_SKEW_MS = 24 * 60 * 60 * 1000;

const sessionRecordSchema = z.object({
  version: z.literal(1),
  installId: z.uuid(),
  accessToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
});
export type SessionRecord = z.infer<typeof sessionRecordSchema>;
type SessionResponse = z.infer<typeof deviceSessionSchema>;

export interface DeviceSessionStoreOptions {
  storage?: Storage;
  now?: () => number;
  createId?: () => string;
  bootstrap: (installId: string) => Promise<SessionResponse>;
}

export class SessionError extends Error {
  constructor() {
    super('Your session could not be restored. Please try again.');
    this.name = 'SessionError';
  }
}

export function createDeviceSessionStore(options: DeviceSessionStoreOptions) {
  const storage = options.storage ?? globalThis.localStorage;
  const now = options.now ?? Date.now;
  const createId = options.createId ?? (() => crypto.randomUUID());
  let pending: Promise<SessionRecord> | undefined;
  let cached: SessionRecord | undefined;

  function installId(): string {
    try {
      const existing = storage.getItem(INSTALL_KEY);
      if (existing && z.uuid().safeParse(existing).success) return existing;
      const id = createId();
      if (!z.uuid().safeParse(id).success) throw new SessionError();
      storage.setItem(INSTALL_KEY, id);
      return id;
    } catch {
      throw new SessionError();
    }
  }

  function read(): SessionRecord | undefined {
    if (cached) return cached;
    try {
      const value = storage.getItem(SESSION_KEY);
      const parsed = sessionRecordSchema.safeParse(
        value ? JSON.parse(value) : undefined,
      );
      if (parsed.success && parsed.data.installId === installId())
        cached = parsed.data;
      return cached;
    } catch {
      return undefined;
    }
  }

  function refresh(): Promise<SessionRecord> {
    if (pending) return pending;
    pending = (async () => {
      try {
        const id = installId();
        const response = deviceSessionSchema.parse(await options.bootstrap(id));
        const record: SessionRecord = {
          version: 1,
          installId: id,
          accessToken: response.access_token,
          expiresAt: now() + response.expires_in * 1000,
        };
        storage.setItem(SESSION_KEY, JSON.stringify(record));
        cached = record;
        return record;
      } catch {
        throw new SessionError();
      }
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  }

  async function token(): Promise<string> {
    const record = read();
    return (
      record && record.expiresAt - now() > SESSION_REFRESH_SKEW_MS
        ? record
        : await refresh()
    ).accessToken;
  }

  async function recover(rejectedToken: string): Promise<string> {
    const current = read();
    if (
      current &&
      current.accessToken !== rejectedToken &&
      current.expiresAt > now()
    )
      return current.accessToken;
    return (await refresh()).accessToken;
  }

  return { installId, read, token, recover, refresh };
}

export type DeviceSessionStore = ReturnType<typeof createDeviceSessionStore>;
