import { z } from 'zod';

const apiBaseUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      );
    } catch {
      return false;
    }
  });

export function parsePublicEnv(
  values: Record<string, unknown>,
  production: boolean,
) {
  const value = values.VITE_API_BASE_URL;
  const parsed = apiBaseUrl.safeParse(
    !production && (value === undefined || value === '')
      ? 'http://localhost:8000'
      : value,
  );

  if (!parsed.success) {
    throw new Error(
      'VITE_API_BASE_URL is required for production and must be an absolute HTTP(S) URL without credentials, query parameters, or a fragment.',
    );
  }

  return { apiBaseUrl: parsed.data.replace(/\/+$/, '') };
}
