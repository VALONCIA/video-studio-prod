import { render } from '@testing-library/react';
import { createMemoryHistory } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { AppProviders } from '@/app/AppProviders';
import { createQueryClient } from '@/app/query-client';
import { createAppRouter } from '@/app/router';

export function renderApp({
  path = '/',
  children,
}: { path?: string; children?: ReactNode } = {}) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false, gcTime: 0 } });
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  return {
    ...render(
      <AppProviders queryClient={queryClient} router={router}>
        {children}
      </AppProviders>,
    ),
    queryClient,
    router,
  };
}
