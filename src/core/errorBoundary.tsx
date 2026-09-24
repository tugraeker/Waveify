import React from 'react';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): RouteErrorBoundaryState {
    return { hasError: true, message: err instanceof Error ? err.message : 'Beklenmeyen bir hata olustu.' };
  }

  componentDidCatch(error: unknown): void {
    console.error('[RouteErrorBoundary]', error);
  }

  retry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <h2 className="text-lg font-semibold">Bir seyler ters gitti</h2>
          <p className="text-sm opacity-70">{this.state.message}</p>
          <button
            onClick={this.retry}
            className="px-4 py-2 rounded-xl border border-surface-700/50 bg-surface-800/80 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Tekrar Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
