import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Prevent infinite loops with Suspense errors
    if (error.message?.includes('suspended') || 
        error.message?.includes('Suspense') ||
        error.message?.includes('lazy')) {
      console.warn('Suspense-related error suppressed:', error.message);
      // Don't update state for Suspense errors
      return;
    }
    
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.349 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đã xảy ra lỗi</h2>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'Ứng dụng gặp sự cố không mong muốn.'}
            </p>
            {/* eslint-disable i18next/no-literal-string */}
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
            >
              Tải lại trang
            </button>
            {/* eslint-enable i18next/no-literal-string */}
            
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left text-xs text-gray-500">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <summary className="cursor-pointer font-medium">Chi tiết lỗi (Development only)</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
