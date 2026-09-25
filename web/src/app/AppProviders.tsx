import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import type { AppRouter } from './router';

export function AppProviders({
  queryClient,
  router,
  children,
}: {
  queryClient: QueryClient;
  router: AppRouter;
  children?: ReactNode;
}) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
