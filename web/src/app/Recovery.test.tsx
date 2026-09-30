import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { ErrorBoundary } from './ErrorBoundary';
import { RouteErrorRecovery } from './Recovery';

function BrokenComponent(): never {
  throw new Error('Test render failure');
}

describe('application recovery', () => {
  it('shows a keyboard-reachable shared Reload control after an application error', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('AdCut couldn’t open');
    const reload = screen.getByRole('button', { name: 'Reload' });
    await user.tab();
    expect(reload).toHaveFocus();
  });

  it('uses the shared Try again control and invokes the route reset', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<RouteErrorRecovery onRetry={onRetry} />);
    const retry = screen.getByRole('button', { name: 'Try again' });
    await user.tab();
    expect(retry).toHaveFocus();
    await user.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders Return home as a real route link for missing pages', async () => {
    renderApp({ path: '/missing-page' });
    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    const link = screen.getByRole('link', { name: 'Return home' });
    expect(link).toHaveAttribute('href', '/');
  });
});
