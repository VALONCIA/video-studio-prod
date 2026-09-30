import { Component, type ReactNode } from 'react';
import { AppErrorRecovery } from './Recovery';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main>
          <AppErrorRecovery />
        </main>
      );
    }
    return this.props.children;
  }
}
