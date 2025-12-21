"use client";
import { Component } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home, FileText, Package } from "lucide-react";
import { useRouter } from "next/navigation";

// Enhanced base error boundary with better error handling and recovery options
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {

    this.setState({ errorInfo });

    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // In a real app, this would send to Sentry, LogRocket, etc.
    // console.log("Error logged to service:", {
    //   error: error.toString(),
    //   errorInfo: errorInfo.componentStack,
    //   timestamp: new Date().toISOString(),
    //   url: window.location.href,
    // });
  };

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      const { fallback, showDetails = false } = this.props;

      if (fallback) {
        return fallback({ error, errorInfo, onRetry: this.handleRetry });
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-3">
              <div className="flex justify-center">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {this.props.title || "Something went wrong"}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {this.props.description ||
                    "We encountered an unexpected error. Please try again."}
                </p>
                {error?.message && (
                  <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
                    {error.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="flex items-center gap-2"
                disabled={retryCount >= 3}
              >
                <RefreshCw className="h-4 w-4" />
                {retryCount >= 3 ? "Max retries reached" : "Try again"}
              </Button>

              {this.props.showHomeButton && (
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/")}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              )}
            </div>

            {showDetails && errorInfo && (
              <details className="text-left mt-4 p-4 bg-gray-50 rounded-lg">
                <summary className="cursor-pointer font-medium text-sm">
                  Error Details
                </summary>
                <pre className="text-xs mt-2 whitespace-pre-wrap text-gray-600">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Retry attempt: {retryCount}/3
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different contexts
export class DataErrorBoundary extends Component {
  render() {
    return (
      <ErrorBoundary
        title="Data Loading Error"
        description="We couldn't load the required data. This might be due to network issues or server problems."
        showHomeButton={true}
        {...this.props}
      />
    );
  }
}

export class FormErrorBoundary extends Component {
  render() {
    return (
      <ErrorBoundary
        title="Form Error"
        description="There was a problem with the form. Please check your inputs and try again."
        {...this.props}
      />
    );
  }
}

export class InventoryErrorBoundary extends Component {
  render() {
    return (
      <ErrorBoundary
        title="Inventory Error"
        description="We encountered an issue with inventory management. Please try again or contact support."
        showHomeButton={true}
        {...this.props}
      />
    );
  }
}

export class TransactionErrorBoundary extends Component {
  render() {
    return (
      <ErrorBoundary
        title="Transaction Error"
        description="There was a problem processing your transaction. Please check the details and try again."
        {...this.props}
      />
    );
  }
}

// HOC for wrapping components with error boundaries
export const withErrorBoundary = (
  Component,
  ErrorBoundaryComponent = ErrorBoundary
) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundaryComponent>
        <Component {...props} />
      </ErrorBoundaryComponent>
    );
  };
};

// Hook for error boundary context
export const useErrorHandler = () => {
  const router = useRouter();

  return {
    handleError: (error, context = "") => {
      console.error(`Error in ${context}:`, error);

      // In production, send to error reporting service
      if (process.env.NODE_ENV === "production") {
        // Send to error reporting service
        // console.log("Error reported to service:", { error, context });
      }

      return {
        message: error.message || "An unexpected error occurred",
        context,
        timestamp: new Date().toISOString(),
      };
    },

    navigateToError: (error) => {
      // Could navigate to a dedicated error page
      console.error("Navigation error:", error);
    },
  };
};