/**
 * Production-ready logging utility
 * Provides structured logging with different levels and environment-aware behavior
 */

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
    };

    this.currentLevel =
      process.env.NODE_ENV === "production"
        ? this.levels.WARN
        : this.levels.DEBUG;
  }

  shouldLog(level) {
    return level <= this.currentLevel;
  }

  formatMessage(level, message, context = "") {
    const timestamp = new Date().toISOString();
    const levelStr = Object.keys(this.levels).find(
      (key) => this.levels[key] === level
    );
    const contextStr = context ? `[${context}]` : "";

    return {
      timestamp,
      level: levelStr,
      context,
      message,
      environment: process.env.NODE_ENV,
    };
  }

  error(message, context = "") {
    if (this.shouldLog(this.levels.ERROR)) {
      const formatted = this.formatMessage(this.levels.ERROR, message, context);
      console.error(JSON.stringify(formatted));

      // In production, you might want to send to error tracking service
      if (process.env.NODE_ENV === "production") {
        this.sendToErrorService(formatted);
      }
    }
  }

  warn(message, context = "") {
    if (this.shouldLog(this.levels.WARN)) {
      const formatted = this.formatMessage(this.levels.WARN, message, context);
      console.warn(JSON.stringify(formatted));
    }
  }

  info(message, context = "") {
    if (this.shouldLog(this.levels.INFO)) {
      const formatted = this.formatMessage(this.levels.INFO, message, context);
      console.info(JSON.stringify(formatted));
    }
  }

  debug(message, context = "") {
    if (this.shouldLog(this.levels.DEBUG)) {
      const formatted = this.formatMessage(this.levels.DEBUG, message, context);
      console.debug(JSON.stringify(formatted));
    }
  }

  // Performance monitoring
  trackPerformance(operationName, startTime) {
    const duration = Date.now() - startTime;
    const isSlow = duration > 2000; // 2 seconds
    const isVerySlow = duration > 5000; // 5 seconds

    if (isVerySlow) {
      this.warn(
        `Very slow operation: ${operationName} took ${duration}ms`,
        "Performance"
      );
    } else if (isSlow) {
      this.info(
        `Slow operation: ${operationName} took ${duration}ms`,
        "Performance"
      );
    } else {
      this.debug(
        `Operation completed: ${operationName} took ${duration}ms`,
        "Performance"
      );
    }

    return duration;
  }

  // Error reporting service integration (stub for now)
  sendToErrorService(errorData) {
    // Integration with services like Sentry, LogRocket, etc.
    // This is a stub - implement based on your error reporting service
    try {
      // Example: Sentry.captureException(new Error(errorData.message), { extra: errorData });
    } catch (error) {
      console.error("Failed to send error to monitoring service:", error);
    }
  }

  // Firebase operation specific logging
  firebaseOperation(operation, success, duration, additionalData = {}) {
    const level = success ? this.levels.INFO : this.levels.ERROR;
    const message = success
      ? `Firebase ${operation} completed in ${duration}ms`
      : `Firebase ${operation} failed after ${duration}ms`;

    const logData = {
      ...this.formatMessage(level, message, "Firebase"),
      operation,
      success,
      duration,
      ...additionalData,
    };

    if (success) {
      this.info(JSON.stringify(logData));
    } else {
      this.error(JSON.stringify(logData));
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export for use throughout the application
export default logger;

// Convenience exports for common use cases
export const logError = (message, context) => logger.error(message, context);
export const logWarn = (message, context) => logger.warn(message, context);
export const logInfo = (message, context) => logger.info(message, context);
export const logDebug = (message, context) => logger.debug(message, context);
export const trackPerformance = (operationName, startTime) =>
  logger.trackPerformance(operationName, startTime);
export const logFirebaseOp = (operation, success, duration, additionalData) =>
  logger.firebaseOperation(operation, success, duration, additionalData);
