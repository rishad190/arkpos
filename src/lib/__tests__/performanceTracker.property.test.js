/**
 * Property-Based Tests for Performance Tracker
 * Feature: codebase-improvements, Property 8: Slow operations are flagged
 * Validates: Requirements 4.5
 * 
 * Property: For any operation that exceeds the performance threshold,
 * the performance tracker should flag it and log metrics.
 */

import * as fc from 'fast-check';
import { PerformanceTracker } from '@/lib/performanceTracker';

// Performance thresholds from performanceTracker.js
const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION: 2000, // 2 seconds
  VERY_SLOW_OPERATION: 5000, // 5 seconds
  WARNING_THRESHOLD: 1000, // 1 second
};

/**
 * Generator for operation names
 * Generates realistic operation names with alphanumeric characters, underscores, and hyphens
 */
const operationNameGenerator = () => {
  return fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/);
};

/**
 * Generator for operation durations
 * Generates durations across the full range: fast, warning, slow, and very slow
 */
const operationDurationGenerator = () => {
  return fc.integer({ min: 0, max: 10000 });
};

/**
 * Generator for operation context
 */
const operationContextGenerator = () => {
  return fc.option(
    fc.record({
      userId: fc.option(fc.string(), { nil: undefined }),
      operationType: fc.option(fc.constantFrom('read', 'write', 'delete', 'update'), { nil: undefined }),
      resourceId: fc.option(fc.string(), { nil: undefined }),
    }),
    { nil: {} }
  );
};

describe('Property 8: Slow operations are flagged', () => {
  let performanceTracker;

  beforeEach(() => {
    jest.useFakeTimers();
    performanceTracker = new PerformanceTracker();
    // Suppress console output during tests
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    performanceTracker.reset();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  /**
   * Feature: codebase-improvements, Property 8: Slow operations are flagged
   * Validates: Requirements 4.5
   * 
   * For any operation that exceeds the performance threshold,
   * the performance tracker should flag it and log metrics.
   */
  test('Property 8: Operations exceeding slow threshold are flagged as slow', () => {
    fc.assert(
      fc.property(
        operationNameGenerator(),
        operationDurationGenerator(),
        operationContextGenerator(),
        (operationName, duration, context) => {
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Start operation
          const handle = tracker.startOperation(operationName, context);
          
          // Simulate operation duration by adjusting start time
          handle.startTime = handle.startTime - duration;
          
          // End operation
          const metrics = tracker.endOperation(handle);
          
          // Property: If duration exceeds SLOW_OPERATION threshold, it should be flagged as slow
          if (duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION) {
            expect(metrics.isSlow).toBe(true);
            
            // Verify it's tracked in global metrics
            const globalMetrics = tracker.getMetrics();
            expect(globalMetrics.summary.slowOperations).toBeGreaterThan(0);
          } else {
            expect(metrics.isSlow).toBe(false);
          }
          
          // Property: If duration exceeds VERY_SLOW_OPERATION threshold, it should be flagged as very slow
          if (duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION) {
            expect(metrics.isVerySlow).toBe(true);
            
            // Verify it's tracked in global metrics
            const globalMetrics = tracker.getMetrics();
            expect(globalMetrics.summary.verySlowOperations).toBeGreaterThan(0);
          } else {
            expect(metrics.isVerySlow).toBe(false);
          }
          
          // Property: If duration exceeds WARNING_THRESHOLD, it should be flagged as warning
          if (duration > PERFORMANCE_THRESHOLDS.WARNING_THRESHOLD) {
            expect(metrics.isWarning).toBe(true);
          } else {
            expect(metrics.isWarning).toBe(false);
          }
          
          // Property: Metrics should contain the operation details
          expect(metrics.name).toBe(operationName);
          expect(metrics.duration).toBeGreaterThanOrEqual(duration); // Allow for small timing variations
          expect(metrics.duration).toBeLessThanOrEqual(duration + 10); // Within 10ms tolerance
          expect(metrics.context).toEqual(context);
          
          // Property: Metrics should be recorded in completed operations
          const allMetrics = tracker.getMetrics();
          expect(allMetrics.summary.totalOperations).toBe(1);
          
          // Verify operation is in recent operations
          expect(allMetrics.recentOperations.length).toBeGreaterThan(0);
          const recordedOp = allMetrics.recentOperations.find(op => op.name === operationName);
          expect(recordedOp).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Slow operation percentage is accurately calculated', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: operationNameGenerator(),
            duration: operationDurationGenerator(),
            context: operationContextGenerator(),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (operations) => {
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Execute all operations
          operations.forEach(({ name, duration, context }) => {
            const handle = tracker.startOperation(name, context);
            handle.startTime = handle.startTime - duration;
            tracker.endOperation(handle);
          });
          
          // Calculate expected slow operation count
          const expectedSlowCount = operations.filter(
            op => op.duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION
          ).length;
          
          const expectedSlowPercentage = (expectedSlowCount / operations.length) * 100;
          
          // Get actual metrics
          const metrics = tracker.getMetrics();
          
          // Property: Slow operation count should match expected
          expect(metrics.summary.slowOperations).toBe(expectedSlowCount);
          
          // Property: Slow operation percentage should be accurate
          expect(metrics.summary.slowOperationPercentage).toBeCloseTo(expectedSlowPercentage, 2);
          
          // Property: Total operations should match
          expect(metrics.summary.totalOperations).toBe(operations.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 8: getSlowOperations returns only operations exceeding threshold', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: operationNameGenerator(),
            duration: operationDurationGenerator(),
            context: operationContextGenerator(),
          }),
          { minLength: 5, maxLength: 30 }
        ),
        fc.integer({ min: 0, max: 10000 }), // Custom threshold
        (operations, customThreshold) => {
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Execute all operations
          operations.forEach(({ name, duration, context }) => {
            const handle = tracker.startOperation(name, context);
            handle.startTime = handle.startTime - duration;
            tracker.endOperation(handle);
          });
          
          // Get slow operations with custom threshold
          const slowOps = tracker.getSlowOperations(customThreshold);
          
          // Property: All returned operations should exceed the threshold
          slowOps.forEach(op => {
            expect(op.duration).toBeGreaterThan(customThreshold);
          });
          
          // Property: Count should match expected
          const expectedCount = operations.filter(op => op.duration > customThreshold).length;
          expect(slowOps.length).toBe(expectedCount);
          
          // Property: No operations below threshold should be included
          const slowOpDurations = slowOps.map(op => op.duration);
          operations.forEach(op => {
            if (op.duration <= customThreshold) {
              expect(slowOpDurations).not.toContain(op.duration);
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 8: identifyBottlenecks flags operations with high slow percentage', () => {
    fc.assert(
      fc.property(
        fc.record({
          slowOperationName: operationNameGenerator(),
          fastOperationName: operationNameGenerator(),
          slowCount: fc.integer({ min: 5, max: 20 }),
          fastCount: fc.integer({ min: 5, max: 20 }),
        }),
        ({ slowOperationName, fastOperationName, slowCount, fastCount }) => {
          // Ensure operation names are different
          fc.pre(slowOperationName !== fastOperationName);
          
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Execute slow operations (all exceed threshold)
          for (let i = 0; i < slowCount; i++) {
            const handle = tracker.startOperation(slowOperationName);
            const duration = PERFORMANCE_THRESHOLDS.SLOW_OPERATION + 1000; // Consistently slow
            handle.startTime = handle.startTime - duration;
            tracker.endOperation(handle);
          }
          
          // Execute fast operations (all below threshold)
          for (let i = 0; i < fastCount; i++) {
            const handle = tracker.startOperation(fastOperationName);
            const duration = 100; // Fast
            handle.startTime = handle.startTime - duration;
            tracker.endOperation(handle);
          }
          
          // Identify bottlenecks
          const bottlenecks = tracker.identifyBottlenecks();
          
          // Property: Slow operation should be identified as bottleneck
          const slowBottleneck = bottlenecks.find(b => b.operationName === slowOperationName);
          expect(slowBottleneck).toBeDefined();
          
          // Property: Slow bottleneck should have 100% slow percentage
          if (slowBottleneck) {
            expect(slowBottleneck.slowPercentage).toBe(100);
            expect(slowBottleneck.slowCount).toBe(slowCount);
          }
          
          // Property: Fast operation should not be a bottleneck (or have low severity)
          const fastBottleneck = bottlenecks.find(b => b.operationName === fastOperationName);
          if (fastBottleneck) {
            // If it appears, it should have 0% slow operations
            expect(fastBottleneck.slowPercentage).toBe(0);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test('Property 8: Very slow operations are flagged with higher severity', () => {
    fc.assert(
      fc.property(
        operationNameGenerator(),
        fc.integer({ min: PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION + 1, max: 15000 }),
        operationContextGenerator(),
        (operationName, duration, context) => {
          // Execute very slow operation
          const handle = performanceTracker.startOperation(operationName, context);
          handle.startTime = handle.startTime - duration;
          const metrics = performanceTracker.endOperation(handle);
          
          // Property: Should be flagged as both slow and very slow
          expect(metrics.isSlow).toBe(true);
          expect(metrics.isVerySlow).toBe(true);
          
          // Property: Should be tracked in very slow operations count
          const globalMetrics = performanceTracker.getMetrics();
          expect(globalMetrics.summary.verySlowOperations).toBeGreaterThan(0);
          
          // Property: Should appear in bottlenecks with high severity
          const bottlenecks = performanceTracker.identifyBottlenecks();
          if (bottlenecks.length > 0) {
            const bottleneck = bottlenecks.find(b => b.operationName === operationName);
            if (bottleneck) {
              expect(bottleneck.severity).toBe('high');
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 8: Average duration is correctly calculated across operations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: operationNameGenerator(),
            duration: operationDurationGenerator(),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (operations) => {
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Execute all operations
          operations.forEach(({ name, duration }) => {
            const handle = tracker.startOperation(name);
            handle.startTime = handle.startTime - duration;
            tracker.endOperation(handle);
          });
          
          // Calculate expected average (allowing for small timing variations)
          const totalDuration = operations.reduce((sum, op) => sum + op.duration, 0);
          const expectedAverage = totalDuration / operations.length;
          
          // Get actual metrics
          const metrics = tracker.getMetrics();
          
          // Property: Average duration should be close to expected (within 10ms per operation tolerance)
          const tolerance = 10 * operations.length;
          expect(metrics.summary.averageDuration).toBeGreaterThanOrEqual(expectedAverage - tolerance / operations.length);
          expect(metrics.summary.averageDuration).toBeLessThanOrEqual(expectedAverage + tolerance / operations.length);
          
          // Property: Total duration should be close to sum (within tolerance)
          expect(metrics.summary.totalDuration).toBeGreaterThanOrEqual(totalDuration);
          expect(metrics.summary.totalDuration).toBeLessThanOrEqual(totalDuration + tolerance);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property-Based Tests for Slow Operation Logging
 * Feature: codebase-improvements, Property 18: Slow operations are logged
 * Validates: Requirements 8.2
 * 
 * Property: For any operation that exceeds the slow operation threshold,
 * performance metrics should be logged.
 */
describe('Property 18: Slow operations are logged', () => {
  let performanceTracker;
  let consoleInfoSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    performanceTracker = new PerformanceTracker();
    // Spy on console methods to verify logging
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    performanceTracker.reset();
    jest.restoreAllMocks();
  });

  /**
   * Feature: codebase-improvements, Property 18: Slow operations are logged
   * Validates: Requirements 8.2
   * 
   * For any operation that exceeds the slow operation threshold,
   * performance metrics should be logged.
   */
  test('Property 18: Slow operations are logged with performance metrics', () => {
    fc.assert(
      fc.property(
        operationNameGenerator(),
        fc.integer({ min: PERFORMANCE_THRESHOLDS.SLOW_OPERATION + 1, max: PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION - 1 }),
        operationContextGenerator(),
        (operationName, duration, context) => {
          // Reset spies for each iteration
          consoleInfoSpy.mockClear();
          consoleWarnSpy.mockClear();
          
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Start operation
          const handle = tracker.startOperation(operationName, context);
          
          // Simulate operation duration by adjusting start time
          handle.startTime = handle.startTime - duration;
          
          // End operation (this should trigger logging)
          const metrics = tracker.endOperation(handle);
          
          // Property: Slow operations should be logged
          expect(metrics.isSlow).toBe(true);
          
          // Property: console.info should be called for slow (but not very slow) operations
          expect(consoleInfoSpy).toHaveBeenCalled();
          
          // Property: The log should contain the slow operation pattern and duration
          const logCalls = consoleInfoSpy.mock.calls;
          const hasSlowOperationLog = logCalls.some(call => {
            const message = call[0];
            // Check for the slow operation pattern and that it contains the duration
            return message.includes('[Performance]') && 
                   message.toLowerCase().includes('slow operation') &&
                   message.includes(`${duration}ms`);
          });
          expect(hasSlowOperationLog).toBe(true);
          
          // Property: The log should contain the operation name
          // Find the log entry that matches the pattern
          const relevantLog = logCalls.find(call => {
            const message = call[0];
            return message.includes('[Performance]') && 
                   message.toLowerCase().includes('slow operation') &&
                   message.includes(`${duration}ms`);
          });
          
          // Verify the log exists and contains the operation name
          // Use a more robust check that handles special characters
          expect(relevantLog).toBeDefined();
          if (relevantLog) {
            const logMessage = relevantLog[0];
            // The operation name should appear in the log message
            // Check by verifying the log structure: "[Performance] Slow operation: {name} took {duration}ms"
            const expectedPattern = `[Performance] Slow operation: ${operationName} took ${duration}ms`;
            expect(logMessage).toBe(expectedPattern);
          }
          
          // Property: Context should be logged as second argument if it has meaningful values
          // Filter out contexts that are empty or only have undefined values
          const hasValidContext = context && Object.keys(context).length > 0 && 
                                  Object.values(context).some(v => v !== undefined && v !== null && v !== '');
          
          if (hasValidContext) {
            // Check that context was passed as second argument
            expect(relevantLog.length).toBeGreaterThan(1);
            expect(relevantLog[1]).toEqual(context);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 18: Very slow operations are logged with higher severity', () => {
    fc.assert(
      fc.property(
        operationNameGenerator(),
        fc.integer({ min: PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION + 1, max: 15000 }),
        operationContextGenerator(),
        (operationName, duration, context) => {
          // Reset spies for each iteration
          consoleInfoSpy.mockClear();
          consoleWarnSpy.mockClear();
          
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Start operation
          const handle = tracker.startOperation(operationName, context);
          
          // Simulate operation duration by adjusting start time
          handle.startTime = handle.startTime - duration;
          
          // End operation (this should trigger logging)
          const metrics = tracker.endOperation(handle);
          
          // Property: Very slow operations should be flagged
          expect(metrics.isVerySlow).toBe(true);
          expect(metrics.isSlow).toBe(true);
          
          // Property: console.warn should be called for very slow operations
          expect(consoleWarnSpy).toHaveBeenCalled();
          
          // Property: The log should contain the operation name and duration
          const logCalls = consoleWarnSpy.mock.calls;
          const relevantLog = logCalls.find(call => 
            call[0].includes(operationName) && call[0].includes(`${duration}ms`)
          );
          expect(relevantLog).toBeDefined();
          
          // Property: The log should mention it's a very slow operation
          if (relevantLog) {
            expect(relevantLog[0]).toMatch(/very slow operation/i);
          }
          
          // Property: Context should be logged if provided
          if (context && Object.keys(context).length > 0) {
            const contextLog = logCalls.find(call => call.length > 1);
            if (contextLog) {
              expect(contextLog[1]).toEqual(context);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 18: Fast operations are not logged as slow', () => {
    fc.assert(
      fc.property(
        operationNameGenerator(),
        fc.integer({ min: 0, max: PERFORMANCE_THRESHOLDS.SLOW_OPERATION }),
        operationContextGenerator(),
        (operationName, duration, context) => {
          // Reset spies for each iteration
          consoleInfoSpy.mockClear();
          consoleWarnSpy.mockClear();
          
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Start operation
          const handle = tracker.startOperation(operationName, context);
          
          // Simulate operation duration by adjusting start time
          handle.startTime = handle.startTime - duration;
          
          // End operation
          const metrics = tracker.endOperation(handle);
          
          // Property: Fast operations should not be flagged as slow
          expect(metrics.isSlow).toBe(false);
          expect(metrics.isVerySlow).toBe(false);
          
          // Property: No slow operation logs should be generated
          const infoLogs = consoleInfoSpy.mock.calls.filter(call => 
            call[0].includes('Slow operation') || call[0].includes('slow operation')
          );
          const warnLogs = consoleWarnSpy.mock.calls.filter(call => 
            call[0].includes('Very slow operation') || call[0].includes('very slow operation')
          );
          
          expect(infoLogs.length).toBe(0);
          expect(warnLogs.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 18: All slow operations in a batch are logged', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: operationNameGenerator(),
            duration: fc.integer({ min: PERFORMANCE_THRESHOLDS.SLOW_OPERATION + 1, max: 10000 }),
            context: operationContextGenerator(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (operations) => {
          // Reset spies for each iteration
          consoleInfoSpy.mockClear();
          consoleWarnSpy.mockClear();
          
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Execute all operations
          operations.forEach(({ name, duration, context }) => {
            const handle = tracker.startOperation(name, context);
            handle.startTime = handle.startTime - duration;
            tracker.endOperation(handle);
          });
          
          // Property: Each slow operation should result in a log entry
          const totalLogCalls = consoleInfoSpy.mock.calls.length + consoleWarnSpy.mock.calls.length;
          
          // Count expected logs (slow but not very slow use info, very slow use warn)
          const expectedInfoLogs = operations.filter(
            op => op.duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION && 
                  op.duration <= PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION
          ).length;
          
          const expectedWarnLogs = operations.filter(
            op => op.duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION
          ).length;
          
          // Property: Total logs should match expected
          expect(totalLogCalls).toBe(expectedInfoLogs + expectedWarnLogs);
          
          // Property: Each operation should have a corresponding log
          // Check by matching the exact log format: "[Performance] Slow operation: {name} took {duration}ms"
          operations.forEach(({ name, duration }) => {
            const isVerySlow = duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION;
            const expectedMessage = isVerySlow 
              ? `[Performance] Very slow operation: ${name} took ${duration}ms`
              : `[Performance] Slow operation: ${name} took ${duration}ms`;
            
            const logCalls = isVerySlow ? consoleWarnSpy.mock.calls : consoleInfoSpy.mock.calls;
            const matchingLog = logCalls.find(call => call[0] === expectedMessage);
            
            // Should be logged with exact message format
            expect(matchingLog).toBeDefined();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 18: Logged metrics include operation name, duration, and context', () => {
    fc.assert(
      fc.property(
        operationNameGenerator(),
        fc.integer({ min: PERFORMANCE_THRESHOLDS.SLOW_OPERATION + 1, max: 10000 }),
        fc.record({
          userId: fc.stringMatching(/^[a-zA-Z0-9_-]{0,20}$/),
          operationType: fc.constantFrom('read', 'write', 'delete', 'update'),
          resourceId: fc.stringMatching(/^[a-zA-Z0-9_-]{0,20}$/),
        }),
        (operationName, duration, context) => {
          // Reset spies for each iteration
          consoleInfoSpy.mockClear();
          consoleWarnSpy.mockClear();
          
          // Create a fresh tracker for each property test iteration
          const tracker = new PerformanceTracker();
          
          // Start operation with context
          const handle = tracker.startOperation(operationName, context);
          
          // Simulate operation duration
          handle.startTime = handle.startTime - duration;
          
          // End operation
          const metrics = tracker.endOperation(handle);
          
          // Determine which console method was used
          const isVerySlow = duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION;
          const expectedMessage = isVerySlow 
            ? `[Performance] Very slow operation: ${operationName} took ${duration}ms`
            : `[Performance] Slow operation: ${operationName} took ${duration}ms`;
          
          const logCalls = isVerySlow ? consoleWarnSpy.mock.calls : consoleInfoSpy.mock.calls;
          
          // Property: Log should exist with exact message format
          expect(logCalls.length).toBeGreaterThan(0);
          
          // Property: Log should match expected format exactly
          const relevantLog = logCalls.find(call => call[0] === expectedMessage);
          expect(relevantLog).toBeDefined();
          
          // Property: Context should be passed as second argument
          if (relevantLog) {
            expect(relevantLog.length).toBeGreaterThan(1);
            expect(relevantLog[1]).toEqual(context);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
