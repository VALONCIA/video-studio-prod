import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { OnboardingShell, WorkspaceShell } from './index';

describe('layout shells', () => {
  it('keeps onboarding content in a single named step without creating workflow state', () => {
    render(
      <OnboardingShell
        step={2}
        totalSteps={3}
        title="Add your video"
        description="Choose one video to begin."
      >
        <p>Upload controls belong here.</p>
      </OnboardingShell>,
    );
    expect(
      screen.getByRole('heading', { name: 'Add your video' }),
    ).toBeVisible();
    expect(screen.getByText('Step 2 of 3')).toBeVisible();
    expect(screen.getByText('Step 2, current')).toBeInTheDocument();
    expect(screen.getByText('Upload controls belong here.')).toBeVisible();
  });

  it('retains cut and version identity while switching compact panes', async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceShell
        projectName="Project"
        cutName="Cut 1"
        versionName="Version 2"
        sources={<p>Source content</p>}
        canvas={<p>Review content</p>}
        inspector={<p>Adjustment content</p>}
      />,
    );
    expect(screen.getByText('Project')).toBeVisible();
    expect(screen.getByText('Cut 1')).toBeVisible();
    expect(screen.getByText('Version 2')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Sources' }));
    expect(
      screen.getByText('Source content').closest('[data-active-pane]'),
    ).toHaveAttribute('data-active-pane', 'sources');
    await user.click(screen.getByRole('button', { name: 'Show sources' }));
    expect(
      screen.getByRole('button', { name: 'Hide sources' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });
});
