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

/**
 * Atomic Operation Service - Handles atomic Firebase operations with performance tracking
 */
export class AtomicOperationService {
  constructor(dispatch, getState) {
    this.dispatch = dispatch;
    this.getState = getState;
  }

  /**
   * Execute an atomic operation with performance tracking and error handling
   */
  async execute(operationName, operationFn, fallbackFn = null) {
    const operationId = `${operationName}_${Date.now()}`;
    const startTime = Date.now();

    this.dispatch({ type: "ADD_PENDING_OPERATION", payload: operationId });

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
            timestamp: new Date().toISOString(),
          },
        });
        throw new Error("Operation queued for offline processing");
      }

      const result = await operationFn();

      // Track performance
      const duration = Date.now() - startTime;
      this.trackPerformance(operationName, duration);

      return result;
    } catch (error) {
      logger.error(
        `[AtomicOperation] Operation failed: ${operationName}`,
        error
      );

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
   * Track operation performance
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
   */
  async processOfflineQueue() {
    const state = this.getState();
    if (state.offlineQueue.length === 0) return;

    logger.info(
      `[AtomicOperation] Processing ${state.offlineQueue.length} offline operations`
    );

    const successfulOperations = [];
    const failedOperations = [];

    for (let i = 0; i < state.offlineQueue.length; i++) {
      const operation = state.offlineQueue[i];
      try {
        await operation.fn();
        successfulOperations.push(i);
        logger.info(
          `[AtomicOperation] Offline operation ${i} completed successfully`
        );
      } catch (error) {
        failedOperations.push({ index: i, error });
        logger.error(`[AtomicOperation] Offline operation ${i} failed:`, error);
      }
    }

    // Remove successful operations from queue
    successfulOperations.forEach((index) => {
      this.dispatch({ type: "REMOVE_FROM_OFFLINE_QUEUE", payload: index });
    });

    if (failedOperations.length > 0) {
      logger.warn(
        `[AtomicOperation] ${failedOperations.length} offline operations failed`
      );
    }
  }
}

// Export singleton instance factory
export const createAtomicOperationService = (dispatch, getState) => {
  return new AtomicOperationService(dispatch, getState);
};

// Legacy export for backward compatibility
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
