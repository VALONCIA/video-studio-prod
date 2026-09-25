import { createRootRoute, Link } from '@tanstack/react-router';
import { Shell } from '@/app/Shell';

export const Route = createRootRoute({
  component: Shell,
  notFoundComponent: () => (
    <>
      <h1>Page not found</h1>
      <Link to="/">Return home</Link>
    </>
  ),
  errorComponent: ({ reset }) => (
    <section role="alert">
      <h1>This page couldn’t open</h1>
      <button onClick={reset}>Try again</button>
    </section>
  ),
});
