import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconButton,
  MediaFrame,
  Progress,
  SegmentedChoice,
  Tabs,
  Tooltip,
} from './index';

describe('design controls', () => {
  it('allows the enabled button while disabling busy and explicitly disabled actions', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Button onClick={onClick}>Create</Button>
        <Button loading loadingLabel="Creating" onClick={onClick}>
          Create
        </Button>
        <Button disabled onClick={onClick}>
          Unavailable
        </Button>
        <IconButton icon="help" label="Help" onClick={onClick} />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await user.click(screen.getByRole('button', { name: 'Help' }));
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Creating' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Creating' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  });

  it('selects a labeled radio option with the keyboard', async () => {
    const user = userEvent.setup();
    function Example() {
      const [value, setValue] = useState<'balanced' | 'quick'>('balanced');
      return (
        <SegmentedChoice
          label="Cut goal"
          options={[
            { value: 'balanced', label: 'Balanced' },
            { value: 'quick', label: 'Quick' },
          ]}
          value={value}
          onChange={setValue}
        />
      );
    }
    render(<Example />);
    const first = screen.getByRole('radio', { name: 'Balanced' });
    const second = screen.getByRole('radio', { name: 'Quick' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(second).toBeChecked();
  });

  it('announces only known progress and provides plain-language error recovery', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(
      <>
        <Progress label="Upload" value={25} detail="Sending video" />
        <Progress label="Creating cut" />
        <ErrorState
          title="Could not load the project"
          description="Please try again."
          onRetry={retry}
        />
        <EmptyState
          title="No sources yet"
          description="Add a video to begin."
        />
      </>,
    );
    expect(screen.getByRole('progressbar', { name: 'Upload' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    expect(
      screen.getByRole('progressbar', { name: 'Creating cut' }),
    ).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load the project',
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('moves through tabs with arrow keys and keeps the active panel associated', async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        label="Edit tools"
        items={[
          {
            value: 'adjust',
            label: 'Adjust',
            content: <p>Describe the next version</p>,
          },
          {
            value: 'versions',
            label: 'Versions',
            content: <p>Version history</p>,
          },
        ]}
      />,
    );
    const adjust = screen.getByRole('tab', { name: 'Adjust' });
    adjust.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Versions' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Version history');
  });

  it('opens a labeled dialog and restores trigger focus on Escape', async () => {
    const user = userEvent.setup();
    render(
      <Dialog
        trigger={<Button>Open confirmation</Button>}
        title="Confirm action"
        description="Review the action before continuing."
        footer={<Button>Continue</Button>}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Open confirmation' });
    await user.click(trigger);
    expect(
      screen.getByRole('dialog', { name: 'Confirm action' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('exposes help on focus and gives an empty media frame a text status', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Tooltip content="Choose a source to preview">
          <IconButton icon="help" label="Source help" />
        </Tooltip>
        <MediaFrame label="Selected video" />
      </>,
    );
    screen.getByRole('button', { name: 'Source help' }).focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Choose a source to preview',
    );
    expect(
      screen.getByRole('group', { name: 'Selected video' }),
    ).toHaveTextContent('No video available');
    await user.keyboard('{Tab}');
  });
});
