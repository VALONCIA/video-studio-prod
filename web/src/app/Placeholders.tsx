import { useState } from 'react';
import {
  Button,
  IconButton,
  SegmentedChoice,
  WorkspaceShell,
} from '@/core/design';
import { ErrorBoundary } from './ErrorBoundary';
import { RouteErrorRecovery } from './Recovery';

function CrashForPreview(): never {
  throw new Error('Recovery preview');
}

export function BootPlaceholder() {
  return (
    <>
      <h1>AdCut Web</h1>
      <p>The application foundation is ready.</p>
    </>
  );
}

export function FoundationPlaceholder() {
  const [choice, setChoice] = useState<'first' | 'second'>('first');
  const preview = new URLSearchParams(window.location.search);
  if (preview.get('recoveryPreview') === 'app') {
    return (
      <ErrorBoundary>
        <CrashForPreview />
      </ErrorBoundary>
    );
  }
  if (preview.get('recoveryPreview') === 'route') {
    return (
      <RouteErrorRecovery
        onRetry={() => window.location.assign('/foundation/check')}
      />
    );
  }
  if (preview.has('workspacePreview')) {
    return (
      <WorkspaceShell
        projectName="Layout preview"
        cutName="Cut context"
        versionName="Version context"
        sources={<p>Sources pane</p>}
        canvas={<p>Review pane</p>}
        inspector={<p>Adjust pane</p>}
      />
    );
  }
  return (
    <>
      <h1>Web foundation</h1>
      <p>This placeholder supports direct links and page refresh.</p>
      <section aria-label="Design controls preview">
        <h2>Design controls</h2>
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-12)' }}
        >
          <Button variant="primary">Primary action</Button>
          <Button>Secondary action</Button>
          <IconButton icon="help" label="Help about controls" />
        </div>
        <div style={{ marginTop: 'var(--space-24)' }}>
          <SegmentedChoice
            label="Preview choice"
            options={[
              { value: 'first', label: 'First' },
              { value: 'second', label: 'Second' },
            ]}
            value={choice}
            onChange={setChoice}
          />
        </div>
      </section>
    </>
  );
}
