import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 border border-hairline-2 mx-auto mb-6 flex items-center justify-center relative">
              <svg className="w-7 h-7 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-hairline-3" />
              <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-hairline-3" />
              <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-hairline-3" />
              <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-hairline-3" />
            </div>
            <div className="label-mono mb-3">Error 500</div>
            <h2 className="text-xl font-semibold text-ink mb-2 tracking-tight">Something went wrong</h2>
            <p className="text-ink-2 mb-6 text-[14px]">
              An unexpected error occurred. Reload to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="h-11 px-6 bg-white text-canvas text-[14px] font-semibold hover:bg-ink-2 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
