"use client";

import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary — catches render errors and shows a bohemian fallback UI.
 *
 * Displays "A taverna está temporariamente fechada" with a retry button.
 * Logs errors to console (no external tracking).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[Taberna ErrorBoundary]", error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg px-4">
          <div className="max-w-md rounded-lg border-2 border-accent bg-card p-8 text-center shadow-lg">
            <div className="mb-4 text-5xl" aria-hidden="true">
              🍷
            </div>
            <h2 className="mb-2 font-serif text-2xl font-bold text-primary">
              A taverna está temporariamente fechada
            </h2>
            <p className="mb-6 font-sans text-base text-text opacity-80">
              Algo inesperado aconteceu. Os filósofos estão confusos.
            </p>
            <button
              onClick={this.handleRetry}
              className="rounded-md border-2 border-accent bg-primary px-6 py-2 font-sans text-base font-semibold text-text-light transition-colors duration-200 hover:bg-primary-light"
              type="button"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
