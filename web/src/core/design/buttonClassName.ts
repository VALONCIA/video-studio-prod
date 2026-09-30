import styles from './components.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';

export function buttonClassName(
  variant: ButtonVariant = 'secondary',
  className?: string,
) {
  return [styles.button, styles[variant], className].filter(Boolean).join(' ');
}
