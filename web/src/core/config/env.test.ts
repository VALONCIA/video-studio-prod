import { describe, expect, it } from 'vitest';
import { parsePublicEnv } from './env';

describe('public environment configuration', () => {
  it('defaults only development to the local API', () => {
    expect(parsePublicEnv({}, false).apiBaseUrl).toBe('http://localhost:8000');
    expect(() => parsePublicEnv({}, true)).toThrow('VITE_API_BASE_URL');
  });

  it('normalizes a valid API URL and omits unrelated configuration', () => {
    expect(
      parsePublicEnv(
        {
          VITE_API_BASE_URL: 'https://api.example.com/',
          PRIVATE_KEY: 'not-public',
        },
        true,
      ),
    ).toEqual({ apiBaseUrl: 'https://api.example.com' });
  });

  it.each([
    '',
    'relative/path',
    'ftp://api.example.com',
    'https://name:password@api.example.com',
    'https://api.example.com?token=secret',
    'https://api.example.com#fragment',
  ])('rejects invalid production configuration: %s', (value) => {
    expect(() => parsePublicEnv({ VITE_API_BASE_URL: value }, true)).toThrow(
      'VITE_API_BASE_URL',
    );
  });
});
