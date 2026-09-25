import { screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { renderApp } from './render';
import { server } from './server';

// Test-only transport probe: the shipped shell makes no API requests.
function QueryProbe() {
  const result = useQuery({
    queryKey: ['foundation-test'],
    queryFn: async () => {
      const response = await fetch('http://localhost/__test__/message');
      if (!response.ok) throw new Error('Request failed');
      return z.object({ message: z.string() }).parse(await response.json());
    },
  });
  if (result.isPending) return <p role="status">Loading test message</p>;
  if (result.isError) return <p role="alert">Unable to load test message</p>;
  return <p>{result.data.message}</p>;
}

describe('application providers', () => {
  it('renders a nested route through the shared application entry point', async () => {
    renderApp({ path: '/foundation/check' });
    expect(
      await screen.findByRole('heading', { name: 'Web foundation' }),
    ).toBeVisible();
  });

  it('renders query results from MSW with the same providers as the application', async () => {
    server.use(
      http.get('http://localhost/__test__/message', () =>
        HttpResponse.json({ message: 'Query provider ready' }),
      ),
    );
    renderApp({ children: <QueryProbe /> });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading test message',
    );
    expect(await screen.findByText('Query provider ready')).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: 'AdCut Web' }),
    ).toBeVisible();
  });

  it('isolates server errors without leaking response details', async () => {
    server.use(
      http.get(
        'http://localhost/__test__/message',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp({ children: <QueryProbe /> });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load test message',
    );
  });
});
