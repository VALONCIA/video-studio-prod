import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  useId,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { AppIcon, type AppIconName } from './AppIcon';
import { buttonClassName, type ButtonVariant } from './buttonClassName';
import styles from './components.module.css';

export function Button({
  children,
  variant = 'secondary',
  loading = false,
  loadingLabel = 'Working',
  disabled,
  type = 'button',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClassName(variant, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span aria-hidden="true" className={styles.spinner} />}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export function IconButton({
  icon,
  label,
  variant = 'secondary',
  loading = false,
  disabled,
  type = 'button',
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  icon: AppIconName;
  label: string;
  variant?: Exclude<ButtonVariant, 'primary'>;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      type={type}
      className={[styles.iconButton, styles[variant], className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
    >
      {loading ? (
        <span aria-hidden="true" className={styles.spinner} />
      ) : (
        <AppIcon name={icon} />
      )}
    </button>
  );
}

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function SegmentedChoice<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  name?: string;
  options: readonly SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const generatedName = useId();
  return (
    <fieldset className={styles.segmentedGroup} disabled={disabled}>
      <legend className={styles.groupLabel}>{label}</legend>
      <div className={styles.segmentedOptions}>
        {options.map((option) => (
          <label className={styles.segment} key={option.value}>
            <input
              type="radio"
              name={name ?? generatedName}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              disabled={option.disabled}
            />
            <span className={styles.segmentContent}>
              <span className={styles.segmentTitle}>
                <span className={styles.segmentLabel}>{option.label}</span>
                {option.value === value && <AppIcon name="check" size={16} />}
              </span>
              {option.description && (
                <span className={styles.segmentDescription}>
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Progress({
  label,
  value,
  max = 100,
  detail,
}: {
  label: string;
  value?: number;
  max?: number;
  detail?: string;
}) {
  const isDeterminate = Number.isFinite(value) && max > 0;
  const safeValue = isDeterminate
    ? Math.min(Math.max(value ?? 0, 0), max)
    : undefined;
  const percent = safeValue === undefined ? undefined : (safeValue / max) * 100;
  return (
    <div className={styles.progress}>
      <div className={styles.progressHeader}>
        <span>{label}</span>
        <span>
          {percent === undefined ? 'In progress' : `${Math.round(percent)}%`}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={label}
        aria-valuemin={isDeterminate ? 0 : undefined}
        aria-valuemax={isDeterminate ? max : undefined}
        aria-valuenow={safeValue}
        aria-valuetext={detail ?? (isDeterminate ? undefined : 'In progress')}
      >
        <span
          className={[
            styles.progressFill,
            isDeterminate ? '' : styles.progressIndeterminate,
          ]
            .filter(Boolean)
            .join(' ')}
          style={
            percent === undefined
              ? undefined
              : ({ '--progress-width': `${percent}%` } as CSSProperties)
          }
        />
      </div>
      {detail && <p className={styles.progressDetail}>{detail}</p>}
    </div>
  );
}

export function EmptyState({
  icon = 'folder',
  title,
  description,
  action,
}: {
  icon?: AppIconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className={styles.state} aria-label={title}>
      <AppIcon name={icon} size={28} className={styles.stateIcon} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className={styles.stateAction}>{action}</div>}
    </section>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <section className={styles.state} role="alert">
      <AppIcon name="alert" size={28} className={styles.errorIcon} />
      <h2>{title}</h2>
      <p>{description}</p>
      {onRetry && (
        <div className={styles.stateAction}>
          <Button onClick={onRetry}>{retryLabel}</Button>
        </div>
      )}
    </section>
  );
}

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactElement;
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.dialogOverlay} />
        <DialogPrimitive.Content className={styles.dialogContent}>
          <div className={styles.dialogHeader}>
            <DialogPrimitive.Title className={styles.dialogTitle}>
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton
                icon="close"
                label="Close dialog"
                variant="tertiary"
              />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className={styles.dialogDescription}>
            {description}
          </DialogPrimitive.Description>
          {children}
          {footer && <div className={styles.dialogFooter}>{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export type TabItem = {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
};

export function Tabs({
  label,
  items,
  value,
  defaultValue,
  onValueChange,
}: {
  label: string;
  items: readonly TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={onValueChange}
      className={styles.tabsRoot}
    >
      <TabsPrimitive.List aria-label={label} className={styles.tabsList}>
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className={styles.tabTrigger}
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          className={styles.tabContent}
          key={item.value}
          value={item.value}
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: string;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={400}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={styles.tooltip}
            side={side}
            sideOffset={8}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export function MediaFrame({
  label,
  children,
  aspectRatio = '9 / 16',
  className,
}: {
  label: string;
  children?: ReactNode;
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div
      className={[styles.mediaFrame, className].filter(Boolean).join(' ')}
      style={{ aspectRatio }}
      role="group"
      aria-label={label}
    >
      {children ?? (
        <div className={styles.mediaEmpty} role="status">
          <AppIcon name="video" size={32} />
          <span>No video available</span>
        </div>
      )}
    </div>
  );
}
