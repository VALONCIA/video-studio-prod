import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Button, buttonClassName } from '@/core/design';
import styles from './Recovery.module.css';

function RecoveryPanel({
  title,
  description,
  action,
  alert = false,
}: {
  title: string;
  description: string;
  action: ReactNode;
  alert?: boolean;
}) {
  return (
    <section className={styles.panel} role={alert ? 'alert' : undefined}>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className={styles.action}>{action}</div>
    </section>
  );
}

export function AppErrorRecovery() {
  return (
    <RecoveryPanel
      alert
      title="AdCut couldn’t open"
      description="Reload the page to try again."
      action={<Button onClick={() => window.location.reload()}>Reload</Button>}
    />
  );
}

export function RouteErrorRecovery({ onRetry }: { onRetry: () => void }) {
  return (
    <RecoveryPanel
      alert
      title="This page couldn’t open"
      description="Try opening this page again."
      action={<Button onClick={onRetry}>Try again</Button>}
    />
  );
}

export function NotFoundRecovery() {
  return (
    <RecoveryPanel
      title="Page not found"
      description="This page may have moved or the link may be incorrect."
      action={
        <Link className={buttonClassName()} to="/">
          Return home
        </Link>
      }
    />
  );
}
