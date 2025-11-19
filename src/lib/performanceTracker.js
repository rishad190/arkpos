/**
 * Performance Tracker - Tracks and monitors application performance metrics
 * @typedef {import('../types/models').PerformanceMetrics} PerformanceMetrics
 * @typedef {import('../types/models').OperationHandle} OperationHandle
 * @typedef {import('../types/models').PerformanceReport} PerformanceReport
 * @typedef {import('../types/models').Bottleneck} Bottleneck
 */

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION: 2000, // 2 seconds
  VERY_SLOW_OPERATION: 5000, // 5 seconds
  WARNING_THRESHOLD: 1000, // 1 second
};

/**
 * PerformanceTracker class for monitoring application performance
 */
export class PerformanceTracker {
  constructor() {
    this.operations = new Map(); // Active operations
    this.completedOperations = []; // History of completed operations
    this.metrics = {
      totalOperations: 0,
      slowOperations: 0,
      verySlowOperations: 0,
      averageDuration: 0,
      totalDuration: 0,
    };
    this.maxHistorySize = 1000; // Keep last 1000 operations
  }

  /**
   * Start tracking an operation
   * @param {string} name - Name of the operation
   * @param {Object} [context={}] - Additional context about the operation
   * @returns {OperationHandle} Handle to end the operation
   */
  startOperation(name, context = {}) {
    const operationId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const handle = {
      id: operationId,
      name,
      startTime: Date.now(),
      context,
    };

    this.operations.set(operationId, handle);

    return handle;
  }

  /**
   * End tracking an operation and record metrics
   * @param {OperationHandle} handle - The operation handle from startOperation
   * @returns {Object} Metrics for this operation
   */
  endOperation(handle) {
    if (!handle || !handle.id) {
      console.warn('[PerformanceTracker] Invalid operation handle');
      return null;
    }

    const operation = this.operations.get(handle.id);
    if (!operation) {
      console.warn(`[PerformanceTracker] Operation ${handle.id} not found`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - operation.startTime;

    const metrics = {
      name: operation.name,
      duration,
      startTime: operation.startTime,
      endTime,
      context: operation.context,
      isSlow: duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION,
      isVerySlow: duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION,
      isWarning: duration > PERFORMANCE_THRESHOLDS.WARNING_THRESHOLD,
    };

    // Update global metrics
    this.metrics.totalOperations++;
    this.metrics.totalDuration += duration;
    this.metrics.averageDuration = this.metrics.totalDuration / this.metrics.totalOperations;

    if (metrics.isSlow) {
      this.metrics.slowOperations++;
    }
    if (metrics.isVerySlow) {
      this.metrics.verySlowOperations++;
    }

    // Add to completed operations history
    this.completedOperations.push(metrics);

    // Trim history if it exceeds max size
    if (this.completedOperations.length > this.maxHistorySize) {
      this.completedOperations.shift();
    }

    // Remove from active operations
    this.operations.delete(handle.id);

    // Log slow operations
    if (metrics.isVerySlow) {
      console.warn(
        `[Performance] Very slow operation: ${metrics.name} took ${duration}ms`,
        metrics.context
      );
    } else if (metrics.isSlow) {
      console.info(
        `[Performance] Slow operation: ${metrics.name} took ${duration}ms`,
        metrics.context
      );
    }

    return metrics;
  }

  /**
   * Get current performance metrics
   * @returns {PerformanceReport} Performance report with statistics
   */
  getMetrics() {
    const recentOperations = this.completedOperations.slice(-100); // Last 100 operations

    return {
      summary: {
        ...this.metrics,
        activeOperations: this.operations.size,
        slowOperationPercentage: this.metrics.totalOperations > 0
          ? (this.metrics.slowOperations / this.metrics.totalOperations) * 100
          : 0,
      },
      recentOperations: recentOperations.map(op => ({
        name: op.name,
        duration: op.duration,
        timestamp: op.endTime,
        isSlow: op.isSlow,
      })),
      activeOperations: Array.from(this.operations.values()).map(op => ({
        name: op.name,
        duration: Date.now() - op.startTime,
        startTime: op.startTime,
      })),
    };
  }

  /**
   * Identify performance bottlenecks
   * @returns {Array<Bottleneck>} List of identified bottlenecks
   */
  identifyBottlenecks() {
    const bottlenecks = [];

    // Group operations by name
    const operationsByName = new Map();
    this.completedOperations.forEach(op => {
      if (!operationsByName.has(op.name)) {
        operationsByName.set(op.name, []);
      }
      operationsByName.get(op.name).push(op);
    });

    // Analyze each operation type
    operationsByName.forEach((operations, name) => {
      const totalDuration = operations.reduce((sum, op) => sum + op.duration, 0);
      const avgDuration = totalDuration / operations.length;
      const slowCount = operations.filter(op => op.isSlow).length;
      const slowPercentage = (slowCount / operations.length) * 100;

      // Identify as bottleneck if:
      // 1. Average duration is slow
      // 2. More than 20% of operations are slow
      // 3. Total time spent is significant
      if (
        avgDuration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION ||
        slowPercentage > 20 ||
        totalDuration > 10000 // More than 10 seconds total
      ) {
        bottlenecks.push({
          operationName: name,
          count: operations.length,
          averageDuration: avgDuration,
          totalDuration,
          slowCount,
          slowPercentage,
          severity: avgDuration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION ? 'high' : 'medium',
          recommendation: this.getRecommendation(name, avgDuration, slowPercentage),
        });
      }
    });

    // Sort by severity and total duration
    return bottlenecks.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'high' ? -1 : 1;
      }
      return b.totalDuration - a.totalDuration;
    });
  }

  /**
   * Get performance recommendation for an operation
   * @param {string} operationName - Name of the operation
   * @param {number} avgDuration - Average duration in ms
   * @param {number} slowPercentage - Percentage of slow operations
   * @returns {string} Recommendation text
   */
  getRecommendation(operationName, avgDuration, slowPercentage) {
    if (operationName.includes('Firebase') || operationName.includes('fetch')) {
      return 'Consider adding indexes, caching, or pagination to reduce query time';
    }
    if (operationName.includes('calculate') || operationName.includes('compute')) {
      return 'Consider memoization or moving calculation to a web worker';
    }
    if (operationName.includes('render') || operationName.includes('update')) {
      return 'Consider using React.memo, useMemo, or virtualization for large lists';
    }
    if (slowPercentage > 50) {
      return 'High failure rate - investigate error handling and retry logic';
    }
    return 'Monitor and optimize if performance degrades further';
  }

  /**
   * Reset all metrics and history
   */
  reset() {
    this.operations.clear();
    this.completedOperations = [];
    this.metrics = {
      totalOperations: 0,
      slowOperations: 0,
      verySlowOperations: 0,
      averageDuration: 0,
      totalDuration: 0,
    };
  }

  /**
   * Get operations by name
   * @param {string} name - Operation name to filter by
   * @returns {Array<Object>} Filtered operations
   */
  getOperationsByName(name) {
    return this.completedOperations.filter(op => op.name === name);
  }

  /**
   * Get slow operations
   * @param {number} [threshold=PERFORMANCE_THRESHOLDS.SLOW_OPERATION] - Duration threshold
   * @returns {Array<Object>} Slow operations
   */
  getSlowOperations(threshold = PERFORMANCE_THRESHOLDS.SLOW_OPERATION) {
    return this.completedOperations.filter(op => op.duration > threshold);
  }
}

// Create singleton instance
const performanceTracker = new PerformanceTracker();

export default performanceTracker;
