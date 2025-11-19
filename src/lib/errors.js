/**
 * Enhanced Error Handling System
 * Provides structured error types and classification for the POS system
 */

/**
 * Error type constants
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
};

/**
 * AppError - Custom error class with type and context
 * @extends Error
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} type - Error type from ERROR_TYPES
   * @param {Object} context - Additional context about the error
   */
  constructor(message, type = ERROR_TYPES.NETWORK, context = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert error to JSON format
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * ErrorHandler - Handles error classification, retry logic, and logging
 */
export class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
  }

  /**
   * Classify an error into one of the ERROR_TYPES
   * @param {Error} error - The error to classify
   * @returns {string} - The error type
   */
  classify(error) {
    // Already classified AppError
    if (error instanceof AppError) {
      return error.type;
    }

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('offline') ||
      errorCode.includes('network') ||
      errorCode === 'unavailable'
    ) {
      return ERROR_TYPES.NETWORK;
    }

    // Permission errors
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('auth') ||
      errorCode.includes('permission') ||
      errorCode.includes('auth') ||
      errorCode === 'permission-denied'
    ) {
      return ERROR_TYPES.PERMISSION;
    }

    // Not found errors
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist') ||
      errorCode === 'not-found'
    ) {
      return ERROR_TYPES.NOT_FOUND;
    }

    // Validation errors
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('required') ||
      errorCode.includes('invalid') ||
      errorCode.includes('validation')
    ) {
      return ERROR_TYPES.VALIDATION;
    }

    // Conflict errors
    if (
      errorMessage.includes('conflict') ||
      errorMessage.includes('already exists') ||
      errorMessage.includes('concurrent') ||
      errorCode === 'already-exists'
    ) {
      return ERROR_TYPES.CONFLICT;
    }

    // Default to network error for unknown errors
    return ERROR_TYPES.NETWORK;
  }

  /**
   * Handle an error with classification and logging
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context about where the error occurred
   * @returns {AppError} - Formatted AppError
   */
  handle(error, context = {}) {
    const errorType = this.classify(error);
    
    // Create AppError if not already one
    const appError = error instanceof AppError
      ? error
      : new AppError(error.message, errorType, {
          ...context,
          originalError: {
            name: error.name,
            code: error.code,
            stack: error.stack,
          },
        });

    // Log the error with full context
    this.logError(appError, context);

    return appError;
  }

  /**
   * Determine if an error should be retried
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error should be retried
   */
  shouldRetry(error) {
    const errorType = error instanceof AppError ? error.type : this.classify(error);

    // Only retry network and conflict errors
    return errorType === ERROR_TYPES.NETWORK || errorType === ERROR_TYPES.CONFLICT;
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attemptNumber - The current attempt number (0-indexed)
   * @returns {number} - Delay in milliseconds
   */
  getRetryDelay(attemptNumber) {
    // Exponential backoff: baseDelay * 2^attemptNumber
    return this.baseDelay * Math.pow(2, attemptNumber);
  }

  /**
   * Log an error with full context
   * @param {AppError} error - The error to log
   * @param {Object} context - Additional context
   */
  logError(error, context = {}) {
    const logContext = {
      type: error.type,
      timestamp: error.timestamp,
      context: {
        ...error.context,
        ...context,
      },
      stack: error.stack,
    };

    this.logger.error(error.message, logContext);
  }

  /**
   * Execute an operation with retry logic
   * @param {Function} operation - The async operation to execute
   * @param {Object} context - Context for error logging
   * @param {number} maxRetries - Maximum number of retries (default: 3)
   * @returns {Promise<any>} - Result of the operation
   */
  async executeWithRetry(operation, context = {}, maxRetries = this.maxRetries) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.handle(error, { ...context, attempt });

        // Don't retry if it's the last attempt or error shouldn't be retried
        if (attempt === maxRetries || !this.shouldRetry(lastError)) {
          throw lastError;
        }

        // Wait before retrying
        const delay = this.getRetryDelay(attempt);
        this.logger.info(
          `Retrying operation after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          context
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - The error
   * @returns {string} - User-friendly message
   */
  getUserMessage(error) {
    const errorType = error instanceof AppError ? error.type : this.classify(error);

    switch (errorType) {
      case ERROR_TYPES.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      case ERROR_TYPES.VALIDATION:
        return error.message || 'Please check your input and try again.';
      case ERROR_TYPES.PERMISSION:
        return 'You do not have permission to perform this action. Please log in again.';
      case ERROR_TYPES.NOT_FOUND:
        return 'The requested item could not be found.';
      case ERROR_TYPES.CONFLICT:
        return 'This operation conflicts with another change. Please refresh and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Create a singleton ErrorHandler instance
 */
let errorHandlerInstance = null;

export const createErrorHandler = (logger) => {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler(logger);
  }
  return errorHandlerInstance;
};

export const getErrorHandler = () => {
  if (!errorHandlerInstance) {
    throw new Error('ErrorHandler not initialized. Call createErrorHandler first.');
  }
  return errorHandlerInstance;
};
