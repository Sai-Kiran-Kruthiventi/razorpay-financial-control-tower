import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Financial Control Tower UI:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public handleDismiss = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#FCFAF8] flex items-center justify-center p-6 text-[#1A1A1A]">
          <div className="max-w-lg w-full bg-white border border-[#E5E7EB] shadow-lg p-8 rounded-xs">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E5E7EB]">
              <div className="w-10 h-10 rounded-xs bg-rose-50 border border-rose-200 flex items-center justify-center text-[#800020]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Financial Control Tower Error Intercept
                </h2>
                <span className="text-[10px] font-mono text-black/50">
                  Track 04 Safety Isolation Boundary
                </span>
              </div>
            </div>

            <p className="text-xs text-black/70 leading-relaxed mb-4">
              A runtime component exception occurred. The system has safely isolated the UI state to preserve data integrity and prevent cascade corruption.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-neutral-50 border border-neutral-200 rounded-xs">
                <div className="text-[10px] font-mono uppercase text-black/50 tracking-wider mb-1">
                  Exception Details
                </div>
                <div className="text-xs font-mono text-rose-700 break-words font-medium">
                  {this.state.error.name}: {this.state.error.message}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                id="btn-error-boundary-reload"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-[#800020] hover:bg-[#660018] text-white rounded-xs text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Control Tower</span>
              </button>
              <button
                id="btn-error-boundary-dismiss"
                onClick={this.handleDismiss}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-neutral-50 text-black/80 rounded-xs text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

