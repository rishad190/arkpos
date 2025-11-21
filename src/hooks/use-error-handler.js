/**
 * Custom hook for error handling with ErrorHandler integration
 */
import { useState, useCallback } from "react";
import { ERROR_TYPES } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";

/**
 * useErrorHandler hook
 * Provides error state management and user-friendly error display
 * 
 * @returns {Object} Error handling utilities
 */
export function useErrorHandler() {
  const [error, setError] = useState(null);
  const { toast } = useToast();

  /**
   * Handle an error with classification and user feedback
   * @param {Error} err - The error to handle
   * @param {Object} options - Options for error handling
   * @param {boolean} options.showToast - Whether to show a toast notification
   * @param {string} options.customMessage - Custom error message
   * @param {Function} options.onError - Callback after error is handled
   */
  const handleError = useCallback((err, options = {}) => {
    const {
      showToast = true,
      customMessage,
      onError,
    } = options;

    // Classify error type
    const errorType = classifyError(err);
    const errorMessage = customMessage || getUserMessage(err, errorType);

    // Set error state
    const errorState = {
      type: errorType,
      message: errorMessage,
      originalError: err,
      timestamp: new Date().toISOString(),
    };
    
    setError(errorState);

    // Show toast notification
    if (showToast) {
      toast({
        title: getErrorTitle(errorType),
        description: errorMessage,
        variant: "destructive",
      });
    }

    // Call custom error handler
    if (onError) {
      onError(errorState);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error handled:", errorState);
    }

    return errorState;
  }, [toast]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Execute an async operation with error handling
   * @param {Function} operation - Async operation to execute
   * @param {Object} options - Error handling options
   * @returns {Promise<any>} Result of the operation
   */
  const executeWithErrorHandling = useCallback(async (operation, options = {}) => {
    try {
      clearError();
      return await operation();
    } catch (err) {
      handleError(err, options);
      throw err;
    }
  }, [handleError, clearError]);

  return {
    error,
    setError,
    handleError,
    clearError,
    executeWithErrorHandling,
  };
}

/**
 * Classify an error into ERROR_TYPES
 * @param {Error} error - The error to classify
 * @returns {string} Error type
 */
function classifyError(error) {
  if (error?.type) {
    return error.type;
  }

  const errorMessage = error?.message?.toLowerCase() || "";
  const errorCode = error?.code?.toLowerCase() || "";

  // Network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("offline") ||
    errorCode.includes("network") ||
    errorCode === "unavailable"
  ) {
    return ERROR_TYPES.NETWORK;
  }

  // Permission errors
  if (
    errorMessage.includes("permission") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("forbidden") ||
    errorMessage.includes("auth") ||
    errorCode.includes("permission") ||
    errorCode.includes("auth") ||
    errorCode === "permission-denied"
  ) {
    return ERROR_TYPES.PERMISSION;
  }

  // Not found errors
  if (
    errorMessage.includes("not found") ||
    errorMessage.includes("does not exist") ||
    errorCode === "not-found"
  ) {
    return ERROR_TYPES.NOT_FOUND;
  }

  // Validation errors
  if (
    errorMessage.includes("validation") ||
    errorMessage.includes("invalid") ||
    errorMessage.includes("required") ||
    errorCode.includes("invalid") ||
    errorCode.includes("validation")
  ) {
    return ERROR_TYPES.VALIDATION;
  }

  // Conflict errors
  if (
    errorMessage.includes("conflict") ||
    errorMessage.includes("already exists") ||
    errorMessage.includes("concurrent") ||
    errorCode === "already-exists"
  ) {
    return ERROR_TYPES.CONFLICT;
  }

  return ERROR_TYPES.NETWORK;
}

/**
 * Get user-friendly error message
 * @param {Error} error - The error
 * @param {string} errorType - The error type
 * @returns {string} User-friendly message
 */
function getUserMessage(error, errorType) {
  // Use error message if it's user-friendly
  if (error?.message && !error.message.includes("Error:") && error.message.length < 100) {
    return error.message;
  }

  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return "Network connection issue. Please check your internet connection and try again.";
    case ERROR_TYPES.VALIDATION:
      return "Please check your input and try again.";
    case ERROR_TYPES.PERMISSION:
      return "You do not have permission to perform this action. Please log in again.";
    case ERROR_TYPES.NOT_FOUND:
      return "The requested item could not be found.";
    case ERROR_TYPES.CONFLICT:
      return "This operation conflicts with another change. Please refresh and try again.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

/**
 * Get error title based on type
 * @param {string} errorType - The error type
 * @returns {string} Error title
 */
function getErrorTitle(errorType) {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return "Connection Error";
    case ERROR_TYPES.VALIDATION:
      return "Validation Error";
    case ERROR_TYPES.PERMISSION:
      return "Permission Denied";
    case ERROR_TYPES.NOT_FOUND:
      return "Not Found";
    case ERROR_TYPES.CONFLICT:
      return "Conflict";
    default:
      return "Error";
  }
}
