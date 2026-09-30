import { useState, type ReactNode } from 'react';
import { AppIcon } from './AppIcon';
import { Button, IconButton } from './components';
import styles from './shells.module.css';

export function OnboardingShell({
  step,
  totalSteps,
  title,
  description,
  children,
  trailingAction,
}: {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  children: ReactNode;
  trailingAction?: ReactNode;
}) {
  const safeTotalSteps = Math.max(1, totalSteps);
  const currentStep = Math.max(1, Math.min(step, safeTotalSteps));
  return (
    <div className={styles.onboarding}>
      <header className={styles.onboardingHeader}>
        <span className={styles.brand}>AdCut</span>
        {trailingAction}
      </header>
      <div className={styles.onboardingMain}>
        <p className={styles.stepLabel}>
          Step {currentStep} of {safeTotalSteps}
        </p>
        <ol aria-label="Setup progress" className={styles.stepTrack}>
          {Array.from({ length: safeTotalSteps }, (_, index) => (
            <li
              aria-current={index + 1 === currentStep ? 'step' : undefined}
              className={
                index + 1 <= currentStep ? styles.stepReached : undefined
              }
              key={index}
            >
              <span className={styles.visuallyHidden}>
                Step {index + 1}
                {index + 1 < currentStep
                  ? ', complete'
                  : index + 1 === currentStep
                    ? ', current'
                    : ', upcoming'}
              </span>
            </li>
          ))}
        </ol>
        <div className={styles.onboardingContent} key={currentStep}>
          <div className={styles.onboardingTitle}>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export type WorkspacePane = 'sources' | 'canvas' | 'inspector';

export function WorkspaceShell({
  projectName,
  cutName,
  versionName,
  sources,
  canvas,
  inspector,
  headerActions,
  inspectorLabel = 'Adjust',
}: {
  projectName: string;
  cutName: string;
  versionName: string;
  sources: ReactNode;
  canvas: ReactNode;
  inspector: ReactNode;
  headerActions?: ReactNode;
  inspectorLabel?: string;
}) {
  const [activePane, setActivePane] = useState<WorkspacePane>('canvas');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  return (
    <div className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <span className={styles.brand}>AdCut</span>
        <div className={styles.workspaceIdentity}>
          <span className={styles.projectName}>{projectName}</span>
          <AppIcon name="chevronRight" size={16} />
          <strong>{cutName}</strong>
          <span className={styles.versionName}>{versionName}</span>
        </div>
        <div className={styles.headerActions}>{headerActions}</div>
      </header>
      <div className={styles.workspaceToolbar}>
        <div className={styles.mediumSourceToggle}>
          <IconButton
            icon={sourcesOpen ? 'close' : 'folder'}
            label={sourcesOpen ? 'Hide sources' : 'Show sources'}
            aria-expanded={sourcesOpen}
            aria-controls="workspace-sources"
            onClick={() => setSourcesOpen((open) => !open)}
          />
        </div>
        <nav aria-label="Workspace panes" className={styles.paneSwitch}>
          {(
            [
              ['sources', 'Sources'],
              ['canvas', 'Review'],
              ['inspector', inspectorLabel],
            ] as const
          ).map(([pane, label]) => (
            <Button
              key={pane}
              variant={activePane === pane ? 'secondary' : 'tertiary'}
              aria-current={activePane === pane ? 'page' : undefined}
              onClick={() => setActivePane(pane)}
            >
              {label}
            </Button>
          ))}
        </nav>
      </div>
      <div
        className={styles.workspaceGrid}
        data-active-pane={activePane}
        data-sources-open={sourcesOpen}
      >
        <aside
          aria-label="Sources"
          className={styles.sourcesPane}
          id="workspace-sources"
        >
          {sources}
        </aside>
        <section aria-label="Review canvas" className={styles.canvasPane}>
          {canvas}
        </section>
        <aside aria-label={inspectorLabel} className={styles.inspectorPane}>
          {inspector}
        </aside>
      </div>
    </div>
  );
}
