/* eslint-disable react-refresh/only-export-components */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface DefaultFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

const DefaultErrorFallback = ({ error, onRetry }: DefaultFallbackProps) => {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 max-w-md">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          {t('errorBoundary.title', { defaultValue: 'Something went wrong' })}
        </h2>
        <p className="text-sm text-red-600 mb-4">
          {error?.message ||
            t('errorBoundary.body', { defaultValue: 'An unexpected error occurred.' })}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
        >
          {t('errorBoundary.retry', { defaultValue: 'Try again' })}
        </button>
      </div>
    </div>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}
