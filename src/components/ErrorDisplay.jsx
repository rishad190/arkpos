"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  WifiOff, 
  ShieldAlert, 
  FileQuestion, 
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { ERROR_TYPES } from "@/lib/errors";

/**
 * ErrorDisplay Component
 * Displays user-friendly error messages with appropriate icons and actions
 * 
 * @param {Object} props
 * @param {Error|AppError} props.error - The error to display
 * @param {string} props.errorType - Error type from ERROR_TYPES
 * @param {string} props.message - Custom error message (overrides default)
 * @param {Function} props.onRetry - Callback for retry action
 * @param {Function} props.onDismiss - Callback to dismiss the error
 * @param {string} props.className - Additional CSS classes
 */
export function ErrorDisplay({ 
  error, 
  errorType,
  message,
  onRetry,
  onDismiss,
  className = ""
}) {
  // Determine error type if not provided
  const type = errorType || error?.type || ERROR_TYPES.NETWORK;
  
  // Get appropriate icon and variant based on error type
  const getErrorConfig = () => {
    switch (type) {
      case ERROR_TYPES.NETWORK:
        return {
          icon: <WifiOff className="h-5 w-5" />,
          title: "Connection Error",
          variant: "destructive",
          showRetry: true,
        };
      case ERROR_TYPES.VALIDATION:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          title: "Validation Error",
          variant: "destructive",
          showRetry: false,
        };
      case ERROR_TYPES.PERMISSION:
        return {
          icon: <ShieldAlert className="h-5 w-5" />,
          title: "Permission Denied",
          variant: "destructive",
          showRetry: false,
        };
      case ERROR_TYPES.NOT_FOUND:
        return {
          icon: <FileQuestion className="h-5 w-5" />,
          title: "Not Found",
          variant: "default",
          showRetry: false,
        };
      case ERROR_TYPES.CONFLICT:
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: "Conflict",
          variant: "destructive",
          showRetry: true,
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          title: "Error",
          variant: "destructive",
          showRetry: false,
        };
    }
  };

  const config = getErrorConfig();
  const errorMessage = message || error?.message || "An unexpected error occurred";

  return (
    <Alert variant={config.variant} className={className}>
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1">
          <AlertTitle className="mb-1">{config.title}</AlertTitle>
          <AlertDescription className="text-sm">
            {errorMessage}
          </AlertDescription>
          
          {/* Action buttons */}
          {(config.showRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {config.showRetry && onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="h-8"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="h-8"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}

/**
 * ErrorBoundaryFallback Component
 * Fallback UI for error boundaries
 */
export function ErrorBoundaryFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <ErrorDisplay
          error={error}
          message={error?.message || "Something went wrong. Please try again."}
          onRetry={resetErrorBoundary}
        />
      </div>
    </div>
  );
}

/**
 * InlineError Component
 * Compact error display for inline use in forms
 */
export function InlineError({ message, className = "" }) {
  if (!message) return null;
  
  return (
    <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}
