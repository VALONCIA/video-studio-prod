import { createRootRoute } from '@tanstack/react-router';
import { NotFoundRecovery, RouteErrorRecovery } from '@/app/Recovery';
import { Shell } from '@/app/Shell';

export const Route = createRootRoute({
  component: Shell,
  notFoundComponent: NotFoundRecovery,
  errorComponent: ({ reset }) => <RouteErrorRecovery onRetry={reset} />,
});
