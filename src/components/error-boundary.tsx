"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-taskly-light p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <div className="size-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-6">
                <AlertTriangle className="size-8 text-red-500" />
              </div>

              <h1 className="text-2xl font-bold text-taskly-dark mb-2">
                Something went wrong
              </h1>

              <p className="text-gray-500 mb-6">
                We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-6 p-4 bg-gray-100 rounded-xl text-left">
                  <p className="text-xs font-mono text-red-600 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="mt-2 text-xs font-mono text-gray-600 overflow-auto max-h-32 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="w-full bg-taskly-orange hover:bg-taskly-orange/90"
                >
                  <RefreshCw className="size-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/dashboard"}
                  className="w-full"
                >
                  <Home className="size-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
