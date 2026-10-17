import { Component, type ReactNode } from 'react';
import { reportError } from '@/lib/error-report';

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    reportError(error, { source: 'react-boundary' });
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
