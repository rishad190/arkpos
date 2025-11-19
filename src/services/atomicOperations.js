"use client";
import logger from "@/utils/logger";

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION: 2000, // 2 seconds
  VERY_SLOW_OPERATION: 5000, // 5 seconds
};

// Connection state constants
const CONNECTION_STATES = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
};

// Retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 30000, // 30 seconds
};

/**
 * Atomic Operation Service - Handles atomic Firebase operations with performance tracking
 * @typedef {import('../types/models').PerformanceMetrics} PerformanceMetrics
 */
export class AtomicOperationService {
  /**
   * Create a new AtomicOperationService instance
   * @param {Function} dispatch - Redux-style dispatch function for state updates
   * @param {Function} getState - Function to get current state
   */
  constructor(dispatch, getState) {
    this.dispatch = dispatch;
    this.getState = getState;
    this.retryAttempts = new Map(); // Track retry attempts per operation
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attemptNumber - The current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  calculateBackoffDelay(attemptNumber) {
    const delay = RETRY_CONFIG.BASE_DELAY * Math.pow(2, attemptNumber);
    return Math.min(delay, RETRY_CONFIG.MAX_DELAY);
  }

  /**
   * Determine if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} True if the error is retryable
   */
  isRetryableError(error) {
    // Network errors, timeouts, and temporary Firebase errors are retryable
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /unavailable/i,
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /503/,
      /502/,
      /504/,
    ];

    const errorMessage = error.message || error.toString();
    return retryablePatterns.some((pattern) => pattern.test(errorMessage));
  }

  /**
   * Execute an atomic operation with performance tracking and error handling
   * @template T
   * @param {string} operationName - Name of the operation for logging and tracking
   * @param {() => Promise<T>} operationFn - Async function to execute
   * @param {(() => Promise<void>)|null} [fallbackFn=null] - Optional fallback function to execute on error
   * @param {Object} [options={}] - Additional options
   * @param {boolean} [options.enableOptimisticUpdate=false] - Enable optimistic UI updates
   * @param {Function} [options.optimisticUpdateFn=null] - Function to apply optimistic update
   * @param {Function} [options.rollbackFn=null] - Function to rollback optimistic update
   * @returns {Promise<T>} Result of the operation
   * @throws {Error} If operation fails and no fallback is provided, or if fallback also fails
   */
  async execute(operationName, operationFn, fallbackFn = null, options = {}) {
    const operationId = `${operationName}_${Date.now()}`;
    const startTime = Date.now();
    const {
      enableOptimisticUpdate = false,
      optimisticUpdateFn = null,
      rollbackFn = null,
    } = options;

    this.dispatch({ type: "ADD_PENDING_OPERATION", payload: operationId });

    // Apply optimistic update if enabled
    let optimisticUpdateApplied = false;
    if (enableOptimisticUpdate && optimisticUpdateFn) {
      try {
        optimisticUpdateFn();
        optimisticUpdateApplied = true;
        logger.info(
          `[AtomicOperation] Optimistic update applied: ${operationName}`
        );
      } catch (error) {
        logger.error(
          `[AtomicOperation] Optimistic update failed: ${operationName}`,
          error
        );
      }
    }

    try {
      // Check connection state
      const state = this.getState();
      if (state.connectionState === CONNECTION_STATES.DISCONNECTED) {
        // Queue for offline processing
        this.dispatch({
          type: "ADD_TO_OFFLINE_QUEUE",
          payload: {
            id: operationId,
            name: operationName,
            fn: operationFn,
            fallbackFn,
            rollbackFn: optimisticUpdateApplied ? rollbackFn : null,
            timestamp: new Date().toISOString(),
            retryCount: 0,
          },
        });
        logger.info(
          `[AtomicOperation] Operation queued for offline processing: ${operationName}`
        );
        // Don't throw error if optimistic update was applied
        if (optimisticUpdateApplied) {
          return null; // Return null to indicate queued operation
        }
        throw new Error("Operation queued for offline processing");
      }

      const result = await this.executeWithRetry(
        operationName,
        operationFn,
        operationId
      );

      // Track performance
      const duration = Date.now() - startTime;
      this.trackPerformance(operationName, duration);

      // Clear retry attempts on success
      this.retryAttempts.delete(operationId);

      return result;
    } catch (error) {
      logger.error(
        `[AtomicOperation] Operation failed: ${operationName}`,
        error
      );

      // Rollback optimistic update if it was applied
      if (optimisticUpdateApplied && rollbackFn) {
        try {
          rollbackFn();
          logger.info(
            `[AtomicOperation] Optimistic update rolled back: ${operationName}`
          );
        } catch (rollbackError) {
          logger.error(
            `[AtomicOperation] Rollback failed: ${operationName}`,
            rollbackError
          );
        }
      }

      // Execute fallback if provided
      if (fallbackFn && typeof fallbackFn === "function") {
        try {
          await fallbackFn();
        } catch (fallbackError) {
          logger.error(
            `[AtomicOperation] Fallback failed: ${operationName}`,
            fallbackError
          );
        }
      }

      throw error;
    } finally {
      this.dispatch({ type: "REMOVE_PENDING_OPERATION", payload: operationId });
    }
  }

  /**
   * Execute an operation with retry logic and exponential backoff
   * @template T
   * @param {string} operationName - Name of the operation
   * @param {() => Promise<T>} operationFn - Async function to execute
   * @param {string} operationId - Unique operation ID
   * @returns {Promise<T>} Result of the operation
   * @throws {Error} If all retry attempts fail
   */
  async executeWithRetry(operationName, operationFn, operationId) {
    const currentAttempt = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operationFn();
      return result;
    } catch (error) {
      // Check if error is retryable and we haven't exceeded max retries
      if (
        this.isRetryableError(error) &&
        currentAttempt < RETRY_CONFIG.MAX_RETRIES
      ) {
        const nextAttempt = currentAttempt + 1;
        this.retryAttempts.set(operationId, nextAttempt);

        const delay = this.calculateBackoffDelay(currentAttempt);
        logger.warn(
          `[AtomicOperation] Retrying ${operationName} (attempt ${nextAttempt}/${RETRY_CONFIG.MAX_RETRIES}) after ${delay}ms`
        );

        // Wait for backoff delay
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Retry the operation
        return this.executeWithRetry(operationName, operationFn, operationId);
      }

      // If not retryable or max retries exceeded, throw the error
      throw error;
    }
  }

  /**
   * Track operation performance and update metrics
   * @param {string} operationName - Name of the operation
   * @param {number} duration - Duration of the operation in milliseconds
   * @returns {void}
   */
  trackPerformance(operationName, duration) {
    const isSlow = duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION;
    const isVerySlow = duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION;

    this.dispatch({
      type: "UPDATE_PERFORMANCE_METRICS",
      payload: {
        operationCount: this.getState().performanceMetrics.operationCount + 1,
        slowOperations:
          this.getState().performanceMetrics.slowOperations + (isSlow ? 1 : 0),
        averageResponseTime:
          (this.getState().performanceMetrics.averageResponseTime *
            this.getState().performanceMetrics.operationCount +
            duration) /
          (this.getState().performanceMetrics.operationCount + 1),
        lastOperationTime: new Date().toISOString(),
      },
    });

    if (isVerySlow) {
      logger.warn(
        `[Performance] Very slow operation: ${operationName} took ${duration}ms`
      );
    } else if (isSlow) {
      logger.info(
        `[Performance] Slow operation: ${operationName} took ${duration}ms`
      );
    }
  }

  /**
   * Process offline queue when connection is restored
   * Executes queued operations in FIFO order with retry logic
   * @returns {Promise<void>}
   */
  async processOfflineQueue() {
    const state = this.getState();
    if (state.offlineQueue.length === 0) return;

    logger.info(
      `[AtomicOperation] Processing ${state.offlineQueue.length} offline operations`
    );

    const successfulOperations = [];
    const failedOperations = [];

    // Process operations in FIFO order
    for (let i = 0; i < state.offlineQueue.length; i++) {
      const operation = state.offlineQueue[i];
      const operationId = `offline_${operation.id}_${i}`;

      try {
        // Execute with retry logic
        await this.executeWithRetry(
          operation.name,
          operation.fn,
          operationId
        );
        successfulOperations.push(i);
        logger.info(
          `[AtomicOperation] Offline operation ${operation.name} completed successfully`
        );
      } catch (error) {
        // Check if we should retry this operation
        const retryCount = operation.retryCount || 0;
        if (
          this.isRetryableError(error) &&
          retryCount < RETRY_CONFIG.MAX_RETRIES
        ) {
          // Update retry count and keep in queue
          this.dispatch({
            type: "UPDATE_OFFLINE_QUEUE_ITEM",
            payload: {
              index: i,
              updates: { retryCount: retryCount + 1 },
            },
          });
          logger.warn(
            `[AtomicOperation] Offline operation ${operation.name} will be retried (attempt ${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES})`
          );
        } else {
          // Max retries exceeded or non-retryable error
          failedOperations.push({ index: i, error, operation });
          logger.error(
            `[AtomicOperation] Offline operation ${operation.name} failed permanently:`,
            error
          );

          // Rollback optimistic update if present
          if (operation.rollbackFn) {
            try {
              operation.rollbackFn();
              logger.info(
                `[AtomicOperation] Rolled back optimistic update for ${operation.name}`
              );
            } catch (rollbackError) {
              logger.error(
                `[AtomicOperation] Rollback failed for ${operation.name}:`,
                rollbackError
              );
            }
          }

          // Execute fallback if provided
          if (operation.fallbackFn) {
            try {
              await operation.fallbackFn();
              logger.info(
                `[AtomicOperation] Fallback executed for ${operation.name}`
              );
            } catch (fallbackError) {
              logger.error(
                `[AtomicOperation] Fallback failed for ${operation.name}:`,
                fallbackError
              );
            }
          }
        }
      }
    }

    // Remove successful operations from queue (in reverse order to maintain indices)
    successfulOperations.reverse().forEach((index) => {
      this.dispatch({ type: "REMOVE_FROM_OFFLINE_QUEUE", payload: index });
    });

    // Remove permanently failed operations from queue (in reverse order)
    failedOperations.reverse().forEach(({ index }) => {
      this.dispatch({ type: "REMOVE_FROM_OFFLINE_QUEUE", payload: index });
    });

    if (failedOperations.length > 0) {
      logger.warn(
        `[AtomicOperation] ${failedOperations.length} offline operations failed permanently`
      );
    }

    if (successfulOperations.length > 0) {
      logger.info(
        `[AtomicOperation] ${successfulOperations.length} offline operations completed successfully`
      );
    }
  }
}

/**
 * Factory function to create an AtomicOperationService instance
 * @param {Function} dispatch - Redux-style dispatch function
 * @param {Function} getState - Function to get current state
 * @returns {AtomicOperationService} New service instance
 */
export const createAtomicOperationService = (dispatch, getState) => {
  return new AtomicOperationService(dispatch, getState);
};

/**
 * Legacy function for backward compatibility - executes an atomic operation
 * @deprecated Use AtomicOperationService.execute() instead
 * @template T
 * @param {string} operationName - Name of the operation
 * @param {() => Promise<T>} operationFn - Async function to execute
 * @param {(() => Promise<void>)|null} [fallbackFn=null] - Optional fallback function
 * @param {Function} dispatch - Redux-style dispatch function
 * @param {Function} getState - Function to get current state
 * @returns {Promise<T>} Result of the operation
 */
export const executeAtomicOperation = async (
  operationName,
  operationFn,
  fallbackFn = null,
  dispatch,
  getState
) => {
  const service = new AtomicOperationService(dispatch, getState);
  return service.execute(operationName, operationFn, fallbackFn);
};
