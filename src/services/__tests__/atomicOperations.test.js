/**
 * Unit tests for AtomicOperationService
 * Requirements: 1.1, 1.3
 */

import { AtomicOperationService } from '../atomicOperations'
import logger from '@/utils/logger'
import * as fc from 'fast-check'

// Mock the logger
jest.mock('@/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
}))

describe('AtomicOperationService', () => {
  let service
  let mockDispatch
  let mockGetState
  let defaultState

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock dispatch and getState
    mockDispatch = jest.fn()
    
    defaultState = {
      connectionState: 'connected',
      offlineQueue: [],
      performanceMetrics: {
        operationCount: 0,
        slowOperations: 0,
        averageResponseTime: 0,
        lastOperationTime: null,
      },
    }
    
    mockGetState = jest.fn(() => defaultState)

    // Create service instance
    service = new AtomicOperationService(mockDispatch, mockGetState)
  })

  describe('execute method with successful operations', () => {
    test('should execute operation successfully and return result', async () => {
      const operationFn = jest.fn().mockResolvedValue('success')
      const result = await service.execute('testOperation', operationFn)

      expect(result).toBe('success')
      expect(operationFn).toHaveBeenCalledTimes(1)
    })

    test('should add and remove pending operation', async () => {
      const operationFn = jest.fn().mockResolvedValue('success')
      await service.execute('testOperation', operationFn)

      // Check that ADD_PENDING_OPERATION was dispatched
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_PENDING_OPERATION',
          payload: expect.stringContaining('testOperation_'),
        })
      )

      // Check that REMOVE_PENDING_OPERATION was dispatched
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REMOVE_PENDING_OPERATION',
          payload: expect.stringContaining('testOperation_'),
        })
      )
    })

    test('should track performance metrics for successful operation', async () => {
      const operationFn = jest.fn().mockResolvedValue('success')
      await service.execute('testOperation', operationFn)

      // Check that UPDATE_PERFORMANCE_METRICS was dispatched
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_PERFORMANCE_METRICS',
          payload: expect.objectContaining({
            operationCount: 1,
            slowOperations: 0,
            averageResponseTime: expect.any(Number),
            lastOperationTime: expect.any(String),
          }),
        })
      )
    })

    test('should not log warning for fast operations', async () => {
      const operationFn = jest.fn().mockResolvedValue('success')
      await service.execute('fastOperation', operationFn)

      expect(logger.warn).not.toHaveBeenCalled()
      expect(logger.info).not.toHaveBeenCalled()
    })

    test('should log info for slow operations (> 2 seconds)', async () => {
      const operationFn = jest.fn().mockImplementation(async () => {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 2100))
        return 'success'
      })

      await service.execute('slowOperation', operationFn)

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Performance] Slow operation: slowOperation took')
      )
    })

    test('should log warning for very slow operations (> 5 seconds)', async () => {
      const operationFn = jest.fn().mockImplementation(async () => {
        // Simulate very slow operation
        await new Promise(resolve => setTimeout(resolve, 5100))
        return 'success'
      })

      await service.execute('verySlowOperation', operationFn)

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[Performance] Very slow operation: verySlowOperation took')
      )
    })
  })

  describe('execute method with failed operations', () => {
    test('should throw error when operation fails', async () => {
      const error = new Error('Operation failed')
      const operationFn = jest.fn().mockRejectedValue(error)

      await expect(service.execute('failedOperation', operationFn)).rejects.toThrow('Operation failed')
    })

    test('should log error when operation fails', async () => {
      const error = new Error('Operation failed')
      const operationFn = jest.fn().mockRejectedValue(error)

      try {
        await service.execute('failedOperation', operationFn)
      } catch (e) {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalledWith(
        '[AtomicOperation] Operation failed: failedOperation',
        error
      )
    })

    test('should execute fallback function when operation fails', async () => {
      const error = new Error('Operation failed')
      const operationFn = jest.fn().mockRejectedValue(error)
      const fallbackFn = jest.fn().mockResolvedValue()

      try {
        await service.execute('failedOperation', operationFn, fallbackFn)
      } catch (e) {
        // Expected to throw
      }

      expect(fallbackFn).toHaveBeenCalledTimes(1)
    })

    test('should log error if fallback function fails', async () => {
      const error = new Error('Operation failed')
      const fallbackError = new Error('Fallback failed')
      const operationFn = jest.fn().mockRejectedValue(error)
      const fallbackFn = jest.fn().mockRejectedValue(fallbackError)

      try {
        await service.execute('failedOperation', operationFn, fallbackFn)
      } catch (e) {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalledWith(
        '[AtomicOperation] Fallback failed: failedOperation',
        fallbackError
      )
    })

    test('should remove pending operation even when operation fails', async () => {
      const error = new Error('Operation failed')
      const operationFn = jest.fn().mockRejectedValue(error)

      try {
        await service.execute('failedOperation', operationFn)
      } catch (e) {
        // Expected to throw
      }

      // Check that REMOVE_PENDING_OPERATION was dispatched
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REMOVE_PENDING_OPERATION',
          payload: expect.stringContaining('failedOperation_'),
        })
      )
    })

    test('should not execute fallback if not provided', async () => {
      const error = new Error('Operation failed')
      const operationFn = jest.fn().mockRejectedValue(error)

      try {
        await service.execute('failedOperation', operationFn)
      } catch (e) {
        // Expected to throw
      }

      // Only the operation error should be logged, not a fallback error
      expect(logger.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('offline queue behavior', () => {
    test('should queue operation when disconnected', async () => {
      // Set connection state to disconnected
      defaultState.connectionState = 'disconnected'

      const operationFn = jest.fn().mockResolvedValue('success')

      await expect(service.execute('offlineOperation', operationFn)).rejects.toThrow(
        'Operation queued for offline processing'
      )

      // Check that operation was added to offline queue
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_TO_OFFLINE_QUEUE',
          payload: expect.objectContaining({
            id: expect.stringContaining('offlineOperation_'),
            name: 'offlineOperation',
            fn: operationFn,
            timestamp: expect.any(String),
          }),
        })
      )
    })

    test('should not execute operation when disconnected', async () => {
      // Set connection state to disconnected
      defaultState.connectionState = 'disconnected'

      const operationFn = jest.fn().mockResolvedValue('success')

      try {
        await service.execute('offlineOperation', operationFn)
      } catch (e) {
        // Expected to throw
      }

      // Operation function should not be called
      expect(operationFn).not.toHaveBeenCalled()
    })

    test('should process offline queue successfully', async () => {
      const operation1 = jest.fn().mockResolvedValue('result1')
      const operation2 = jest.fn().mockResolvedValue('result2')

      defaultState.offlineQueue = [
        { id: 'op1', name: 'operation1', fn: operation1, timestamp: new Date().toISOString() },
        { id: 'op2', name: 'operation2', fn: operation2, timestamp: new Date().toISOString() },
      ]

      await service.processOfflineQueue()

      expect(operation1).toHaveBeenCalledTimes(1)
      expect(operation2).toHaveBeenCalledTimes(1)

      // Check that operations were removed from queue
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REMOVE_FROM_OFFLINE_QUEUE',
          payload: 0,
        })
      )
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REMOVE_FROM_OFFLINE_QUEUE',
          payload: 1,
        })
      )
    })

    test('should handle failed operations in offline queue', async () => {
      const operation1 = jest.fn().mockResolvedValue('result1')
      const operation2 = jest.fn().mockRejectedValue(new Error('Failed'))
      const operation3 = jest.fn().mockResolvedValue('result3')

      defaultState.offlineQueue = [
        { id: 'op1', name: 'operation1', fn: operation1, timestamp: new Date().toISOString() },
        { id: 'op2', name: 'operation2', fn: operation2, timestamp: new Date().toISOString() },
        { id: 'op3', name: 'operation3', fn: operation3, timestamp: new Date().toISOString() },
      ]

      await service.processOfflineQueue()

      expect(operation1).toHaveBeenCalledTimes(1)
      expect(operation2).toHaveBeenCalledTimes(1)
      expect(operation3).toHaveBeenCalledTimes(1)

      // Successful operations should be removed
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REMOVE_FROM_OFFLINE_QUEUE',
          payload: 0,
        })
      )
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REMOVE_FROM_OFFLINE_QUEUE',
          payload: 2,
        })
      )

      // Failed operation should be logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AtomicOperation] Offline operation operation2 failed permanently:'),
        expect.any(Error)
      )

      // Warning should be logged for failed operations
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AtomicOperation] 1 offline operations failed permanently')
      )
    })

    test('should do nothing when offline queue is empty', async () => {
      defaultState.offlineQueue = []

      await service.processOfflineQueue()

      expect(mockDispatch).not.toHaveBeenCalled()
    })

    test('should log info when processing offline queue', async () => {
      const operation1 = jest.fn().mockResolvedValue('result1')

      defaultState.offlineQueue = [
        { id: 'op1', name: 'operation1', fn: operation1, timestamp: new Date().toISOString() },
      ]

      await service.processOfflineQueue()

      expect(logger.info).toHaveBeenCalledWith(
        '[AtomicOperation] Processing 1 offline operations'
      )
    })
  })

  describe('performance tracking', () => {
    test('should track operation count', async () => {
      const operationFn = jest.fn().mockResolvedValue('success')
      
      await service.execute('operation1', operationFn)

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_PERFORMANCE_METRICS',
          payload: expect.objectContaining({
            operationCount: 1,
          }),
        })
      )
    })

    test('should track slow operations count', async () => {
      const operationFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2100))
        return 'success'
      })

      await service.execute('slowOperation', operationFn)

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_PERFORMANCE_METRICS',
          payload: expect.objectContaining({
            slowOperations: 1,
          }),
        })
      )
    })

    test('should calculate average response time', async () => {
      const operationFn = jest.fn().mockResolvedValue('success')
      
      await service.execute('operation1', operationFn)

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_PERFORMANCE_METRICS',
          payload: expect.objectContaining({
            averageResponseTime: expect.any(Number),
          }),
        })
      )

      const call = mockDispatch.mock.calls.find(
        call => call[0].type === 'UPDATE_PERFORMANCE_METRICS'
      )
      expect(call[0].payload.averageResponseTime).toBeGreaterThanOrEqual(0)
    })

    test('should update last operation time', async () => {
      const operationFn = jest.fn().mockResolvedValue('success')
      
      await service.execute('operation1', operationFn)

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_PERFORMANCE_METRICS',
          payload: expect.objectContaining({
            lastOperationTime: expect.any(String),
          }),
        })
      )

      const call = mockDispatch.mock.calls.find(
        call => call[0].type === 'UPDATE_PERFORMANCE_METRICS'
      )
      
      // Verify it's a valid ISO date string
      expect(() => new Date(call[0].payload.lastOperationTime)).not.toThrow()
    })

    test('should calculate cumulative average response time', async () => {
      // Set initial state with existing metrics
      defaultState.performanceMetrics = {
        operationCount: 2,
        slowOperations: 0,
        averageResponseTime: 100,
        lastOperationTime: new Date().toISOString(),
      }

      const operationFn = jest.fn().mockResolvedValue('success')
      await service.execute('operation3', operationFn)

      const call = mockDispatch.mock.calls.find(
        call => call[0].type === 'UPDATE_PERFORMANCE_METRICS'
      )

      // New average should be calculated from previous average
      expect(call[0].payload.operationCount).toBe(3)
      expect(call[0].payload.averageResponseTime).toBeGreaterThan(0)
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * Feature: codebase-improvements, Property 4: Atomic operations maintain consistency
     * Validates: Requirements 2.4
     * 
     * For any atomic operation that fails partway through, the database state 
     * should remain unchanged from before the operation started.
     */
    test('Property 4: Atomic operations maintain consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            operationName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            shouldFail: fc.boolean(),
            stepsBeforeFailure: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ operationName, shouldFail, stepsBeforeFailure }) => {
            // Reset mocks for each property test iteration
            jest.clearAllMocks()
            
            // Create fresh state for this test
            const testState = {
              connectionState: 'connected',
              offlineQueue: [],
              performanceMetrics: {
                operationCount: 0,
                slowOperations: 0,
                averageResponseTime: 0,
                lastOperationTime: null,
              },
              data: { value: 0 }, // Simulated database state
            }
            
            const testDispatch = jest.fn()
            const testGetState = jest.fn(() => testState)
            const testService = new AtomicOperationService(testDispatch, testGetState)
            
            // Track state changes
            const stateChanges = []
            
            // Create an operation that modifies state and potentially fails
            const operationFn = jest.fn(async () => {
              for (let i = 0; i < stepsBeforeFailure; i++) {
                stateChanges.push({ step: i, value: testState.data.value })
                testState.data.value += 1
              }
              
              // Fail at the last step if shouldFail is true
              if (shouldFail) {
                throw new Error('Operation failed at step ' + (stepsBeforeFailure - 1))
              }
              
              return 'success'
            })
            
            // Create a fallback that rolls back state changes
            const fallbackFn = jest.fn(async () => {
              // Rollback: restore to initial state
              testState.data.value = 0
            })
            
            // Capture initial state
            const initialValue = testState.data.value
            
            // Execute the operation
            let operationSucceeded = false
            let operationFailed = false
            
            try {
              await testService.execute(operationName, operationFn, fallbackFn)
              operationSucceeded = true
            } catch (error) {
              operationFailed = true
            }
            
            // Verify consistency based on operation outcome
            if (operationSucceeded && !shouldFail) {
              // Success case: state should be modified
              if (testState.data.value !== initialValue + stepsBeforeFailure) {
                return false
              }
            }
            
            if (operationFailed && shouldFail) {
              // Failure case: fallback should have been called
              if (fallbackFn.mock.calls.length !== 1) {
                return false
              }
              
              // After fallback, state should be restored to initial value
              if (testState.data.value !== initialValue) {
                return false
              }
            }
            
            // Verify that pending operations are always cleaned up
            const removePendingCalls = testDispatch.mock.calls.filter(
              call => call[0].type === 'REMOVE_PENDING_OPERATION'
            )
            if (removePendingCalls.length === 0) {
              return false
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: codebase-improvements, Property 13: Offline operations are queued
     * Validates: Requirements 7.1
     * 
     * For any operation attempted while the connection state is DISCONNECTED, 
     * the operation should be added to the offline queue.
     */
    test('Property 13: Offline operations are queued', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            operationName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            operationResult: fc.anything(),
            hasFallback: fc.boolean(),
            hasOptimisticUpdate: fc.boolean(),
          }),
          async ({ operationName, operationResult, hasFallback, hasOptimisticUpdate }) => {
            // Reset mocks for each property test iteration
            jest.clearAllMocks()
            
            // Create fresh state with DISCONNECTED connection
            const testState = {
              connectionState: 'disconnected',
              offlineQueue: [],
              performanceMetrics: {
                operationCount: 0,
                slowOperations: 0,
                averageResponseTime: 0,
                lastOperationTime: null,
              },
            }
            
            const testDispatch = jest.fn()
            const testGetState = jest.fn(() => testState)
            const testService = new AtomicOperationService(testDispatch, testGetState)
            
            // Create operation function
            const operationFn = jest.fn().mockResolvedValue(operationResult)
            
            // Create optional fallback
            const fallbackFn = hasFallback ? jest.fn().mockResolvedValue() : null
            
            // Create optional optimistic update functions
            const optimisticUpdateFn = hasOptimisticUpdate ? jest.fn() : null
            const rollbackFn = hasOptimisticUpdate ? jest.fn() : null
            
            // Capture initial queue length
            const initialQueueLength = testState.offlineQueue.length
            
            // Execute the operation
            let threwError = false
            let returnedNull = false
            
            try {
              const result = await testService.execute(
                operationName, 
                operationFn, 
                fallbackFn,
                hasOptimisticUpdate ? {
                  enableOptimisticUpdate: true,
                  optimisticUpdateFn,
                  rollbackFn,
                } : {}
              )
              
              if (result === null) {
                returnedNull = true
              }
            } catch (error) {
              threwError = true
            }
            
            // Verify that operation was NOT executed immediately
            if (operationFn.mock.calls.length !== 0) {
              return false
            }
            
            // Verify that ADD_TO_OFFLINE_QUEUE was dispatched
            const addToQueueCalls = testDispatch.mock.calls.filter(
              call => call[0].type === 'ADD_TO_OFFLINE_QUEUE'
            )
            
            if (addToQueueCalls.length !== 1) {
              return false
            }
            
            // Verify the queued operation has correct structure
            const queuedOperation = addToQueueCalls[0][0].payload
            
            if (queuedOperation.name !== operationName) {
              return false
            }
            
            if (queuedOperation.fn !== operationFn) {
              return false
            }
            
            if (queuedOperation.fallbackFn !== fallbackFn) {
              return false
            }
            
            if (!queuedOperation.id || !queuedOperation.id.includes(operationName)) {
              return false
            }
            
            if (!queuedOperation.timestamp) {
              return false
            }
            
            if (queuedOperation.retryCount !== 0) {
              return false
            }
            
            // Verify rollback function is included if optimistic update was applied
            if (hasOptimisticUpdate) {
              if (optimisticUpdateFn.mock.calls.length !== 1) {
                return false
              }
              
              if (queuedOperation.rollbackFn !== rollbackFn) {
                return false
              }
              
              // Should return null when optimistic update is applied
              if (!returnedNull) {
                return false
              }
            } else {
              // Should throw error when no optimistic update
              if (!threwError) {
                return false
              }
            }
            
            // Verify pending operation was added and removed
            const addPendingCalls = testDispatch.mock.calls.filter(
              call => call[0].type === 'ADD_PENDING_OPERATION'
            )
            const removePendingCalls = testDispatch.mock.calls.filter(
              call => call[0].type === 'REMOVE_PENDING_OPERATION'
            )
            
            if (addPendingCalls.length !== 1 || removePendingCalls.length !== 1) {
              return false
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: codebase-improvements, Property 14: Queued operations process in order
     * Validates: Requirements 7.2
     * 
     * For any offline queue with multiple operations, when connection is restored, 
     * operations should be processed in FIFO order.
     */
    /**
     * Feature: codebase-improvements, Property 15: Retry delays increase exponentially
     * Validates: Requirements 7.3
     * 
     * For any failed operation retry sequence, each subsequent retry delay should be 
     * exponentially larger than the previous delay.
     */
    test('Property 15: Retry delays increase exponentially', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            operationName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            maxAttempts: fc.integer({ min: 2, max: 10 }),
          }),
          async ({ operationName, maxAttempts }) => {
            // Reset mocks for each property test iteration
            jest.clearAllMocks()
            
            // Track actual delays between retry attempts
            const actualDelays = []
            let attemptCount = 0
            
            // Mock setTimeout to capture delays
            const originalSetTimeout = global.setTimeout
            global.setTimeout = jest.fn((fn, delay) => {
              actualDelays.push(delay)
              // Execute immediately for testing
              fn()
              return 0
            })
            
            // Create fresh state
            const testState = {
              connectionState: 'connected',
              offlineQueue: [],
              performanceMetrics: {
                operationCount: 0,
                slowOperations: 0,
                averageResponseTime: 0,
                lastOperationTime: null,
              },
            }
            
            const testDispatch = jest.fn()
            const testGetState = jest.fn(() => testState)
            const testService = new AtomicOperationService(testDispatch, testGetState)
            
            // Create an operation that fails with a retryable error for maxAttempts times
            const operationFn = jest.fn().mockImplementation(() => {
              attemptCount++
              if (attemptCount <= maxAttempts) {
                // Throw retryable network error
                return Promise.reject(new Error('Network timeout'))
              }
              return Promise.resolve('success')
            })
            
            // Execute the operation
            try {
              await testService.execute(operationName, operationFn)
            } catch (error) {
              // Operation may fail if maxAttempts exceeds MAX_RETRIES
            }
            
            // Restore original setTimeout
            global.setTimeout = originalSetTimeout
            
            // Verify that delays were recorded
            if (actualDelays.length === 0) {
              // No retries occurred (operation succeeded on first try or failed immediately)
              return true
            }
            
            // Verify exponential backoff pattern
            // Each delay should be approximately double the previous delay
            // Formula: delay = BASE_DELAY * 2^attemptNumber
            // BASE_DELAY = 1000ms, MAX_DELAY = 30000ms
            const BASE_DELAY = 1000
            const MAX_DELAY = 30000
            
            for (let i = 0; i < actualDelays.length; i++) {
              const expectedDelay = Math.min(BASE_DELAY * Math.pow(2, i), MAX_DELAY)
              const actualDelay = actualDelays[i]
              
              // Verify the delay matches the exponential backoff formula
              if (actualDelay !== expectedDelay) {
                return false
              }
              
              // Verify exponential growth: each delay should be at least as large as the previous
              if (i > 0) {
                const previousDelay = actualDelays[i - 1]
                
                // If we haven't hit the max delay, the current delay should be larger
                if (previousDelay < MAX_DELAY && actualDelay <= previousDelay) {
                  return false
                }
                
                // If previous delay was at max, current should also be at max
                if (previousDelay === MAX_DELAY && actualDelay !== MAX_DELAY) {
                  return false
                }
                
                // Verify the exponential relationship (2x growth until max)
                if (previousDelay < MAX_DELAY) {
                  const expectedRatio = 2.0
                  const actualRatio = actualDelay / previousDelay
                  
                  // Allow small floating point tolerance
                  if (Math.abs(actualRatio - expectedRatio) > 0.01) {
                    return false
                  }
                }
              }
            }
            
            // Verify delays never exceed MAX_DELAY
            for (const delay of actualDelays) {
              if (delay > MAX_DELAY) {
                return false
              }
            }
            
            // Verify the sequence follows the exponential pattern
            // For attempts 0, 1, 2, 3, ... delays should be 1000, 2000, 4000, 8000, ...
            for (let i = 0; i < actualDelays.length; i++) {
              const expectedDelay = Math.min(BASE_DELAY * Math.pow(2, i), MAX_DELAY)
              if (actualDelays[i] !== expectedDelay) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: codebase-improvements, Property 16: Optimistic updates rollback on failure
     * Validates: Requirements 7.5
     * 
     * For any offline operation with optimistic UI update, if the operation fails when processed, 
     * the UI state should revert to the pre-operation state.
     */
    test('Property 16: Optimistic updates rollback on failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initialStateValue: fc.integer({ min: 0, max: 1000 }),
            optimisticChange: fc.integer({ min: 1, max: 100 }),
            shouldFail: fc.boolean(),
          }),
          async ({ initialStateValue, optimisticChange, shouldFail }) => {
            // Reset mocks for each property test iteration
            jest.clearAllMocks()
            
            // Create fresh state for this test (always online for simplicity)
            const testState = {
              connectionState: 'connected',
              offlineQueue: [],
              performanceMetrics: {
                operationCount: 0,
                slowOperations: 0,
                averageResponseTime: 0,
                lastOperationTime: null,
              },
              uiState: { value: initialStateValue }, // Simulated UI state
            }
            
            const testDispatch = jest.fn()
            const testGetState = jest.fn(() => testState)
            const testService = new AtomicOperationService(testDispatch, testGetState)
            
            // Create optimistic update function that modifies UI state
            const optimisticUpdateFn = jest.fn(() => {
              testState.uiState.value += optimisticChange
            })
            
            // Create rollback function that reverts UI state
            const rollbackFn = jest.fn(() => {
              testState.uiState.value = initialStateValue
            })
            
            // Create operation that may fail
            const operationFn = jest.fn(async () => {
              if (shouldFail) {
                throw new Error('Operation failed')
              }
              return 'success'
            })
            
            // Execute the operation with optimistic update enabled
            let operationSucceeded = false
            let operationFailed = false
            
            try {
              await testService.execute(
                'testOperation',
                operationFn,
                null,
                {
                  enableOptimisticUpdate: true,
                  optimisticUpdateFn,
                  rollbackFn,
                }
              )
              operationSucceeded = true
            } catch (error) {
              operationFailed = true
            }
            
            // Verify optimistic update was applied
            if (optimisticUpdateFn.mock.calls.length !== 1) {
              return false
            }
            
            // Verify behavior based on operation outcome
            if (shouldFail) {
              // Operation should have failed
              if (!operationFailed) {
                return false
              }
              
              // Rollback should have been called
              if (rollbackFn.mock.calls.length !== 1) {
                return false
              }
              
              // State should be reverted to initial value
              if (testState.uiState.value !== initialStateValue) {
                return false
              }
            } else {
              // Operation should have succeeded
              if (!operationSucceeded) {
                return false
              }
              
              // Rollback should NOT have been called
              if (rollbackFn.mock.calls.length !== 0) {
                return false
              }
              
              // State should retain the optimistic update
              if (testState.uiState.value !== initialStateValue + optimisticChange) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 60000) // 60 second timeout for property test

    /**
     * Feature: codebase-improvements, Property 14: Queued operations process in order
     * Validates: Requirements 7.2
     * 
     * For any offline queue with multiple operations, when connection is restored, 
     * operations should be processed in FIFO order.
     */
    test('Property 14: Queued operations process in order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            operationCount: fc.integer({ min: 2, max: 10 }),
            failurePattern: fc.constantFrom('none', 'some', 'all'),
          }),
          async ({ operationCount, failurePattern }) => {
            // Reset mocks for each property test iteration
            jest.clearAllMocks()
            
            // Track execution order
            const executionOrder = []
            
            // Create operations that track their execution order
            const operations = []
            for (let i = 0; i < operationCount; i++) {
              const operationIndex = i
              let shouldFail = false
              
              if (failurePattern === 'all') {
                shouldFail = true
              } else if (failurePattern === 'some') {
                shouldFail = i % 3 === 0 // Every 3rd operation fails
              }
              
              const operationFn = jest.fn().mockImplementation(async () => {
                executionOrder.push(operationIndex)
                if (shouldFail) {
                  // Non-retryable error (validation error)
                  throw new Error(`Validation failed for operation ${operationIndex}`)
                }
                return `result_${operationIndex}`
              })
              
              operations.push({
                id: `op_${i}`,
                name: `operation_${i}`,
                fn: operationFn,
                timestamp: new Date(Date.now() + i).toISOString(), // Ensure unique timestamps
                retryCount: 0,
              })
            }
            
            // Create fresh state with operations in queue
            const testState = {
              connectionState: 'connected',
              offlineQueue: [...operations], // Copy the operations array
              performanceMetrics: {
                operationCount: 0,
                slowOperations: 0,
                averageResponseTime: 0,
                lastOperationTime: null,
              },
            }
            
            const testDispatch = jest.fn()
            const testGetState = jest.fn(() => testState)
            const testService = new AtomicOperationService(testDispatch, testGetState)
            
            // Process the offline queue
            await testService.processOfflineQueue()
            
            // Verify all operations were attempted
            if (executionOrder.length !== operationCount) {
              return false
            }
            
            // CRITICAL: Verify operations were executed in FIFO order (0, 1, 2, 3, ...)
            // This is the core property we're testing
            for (let i = 0; i < operationCount; i++) {
              if (executionOrder[i] !== i) {
                return false
              }
            }
            
            // Verify each operation function was called exactly once
            for (let i = 0; i < operationCount; i++) {
              if (operations[i].fn.mock.calls.length !== 1) {
                return false
              }
            }
            
            // Verify operations were removed from queue
            const removeFromQueueCalls = testDispatch.mock.calls.filter(
              call => call[0].type === 'REMOVE_FROM_OFFLINE_QUEUE'
            )
            
            // All operations should be removed (successful or failed)
            if (removeFromQueueCalls.length !== operationCount) {
              return false
            }
            
            // Verify all indices from 0 to operationCount-1 were removed
            const removalIndices = removeFromQueueCalls.map(call => call[0].payload)
            const sortedRemovalIndices = [...removalIndices].sort((a, b) => a - b)
            
            for (let i = 0; i < operationCount; i++) {
              if (sortedRemovalIndices[i] !== i) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('retry logic with exponential backoff', () => {
    test('should retry retryable errors with exponential backoff', async () => {
      const networkError = new Error('Network timeout')
      let attemptCount = 0
      const operationFn = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.reject(networkError)
        }
        return Promise.resolve('success')
      })

      const result = await service.execute('testOperation', operationFn)

      expect(result).toBe('success')
      expect(operationFn).toHaveBeenCalledTimes(3)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retrying testOperation')
      )
    })

    test('should not retry non-retryable errors', async () => {
      const validationError = new Error('Validation failed')
      const operationFn = jest.fn().mockRejectedValue(validationError)

      await expect(service.execute('testOperation', operationFn)).rejects.toThrow(
        'Validation failed'
      )

      expect(operationFn).toHaveBeenCalledTimes(1)
    })

    test('should stop retrying after max retries', async () => {
      const networkError = new Error('Network unavailable')
      const operationFn = jest.fn().mockRejectedValue(networkError)

      await expect(service.execute('testOperation', operationFn)).rejects.toThrow(
        'Network unavailable'
      )

      // Should try initial + 3 retries = 4 times
      expect(operationFn).toHaveBeenCalledTimes(4)
    })

    test('should calculate exponential backoff correctly', () => {
      expect(service.calculateBackoffDelay(0)).toBe(1000) // 1 second
      expect(service.calculateBackoffDelay(1)).toBe(2000) // 2 seconds
      expect(service.calculateBackoffDelay(2)).toBe(4000) // 4 seconds
      expect(service.calculateBackoffDelay(3)).toBe(8000) // 8 seconds
      expect(service.calculateBackoffDelay(10)).toBe(30000) // Max 30 seconds
    })

    test('should identify retryable errors correctly', () => {
      expect(service.isRetryableError(new Error('Network timeout'))).toBe(true)
      expect(service.isRetryableError(new Error('ECONNREFUSED'))).toBe(true)
      expect(service.isRetryableError(new Error('Service unavailable'))).toBe(true)
      expect(service.isRetryableError(new Error('503 error'))).toBe(true)
      expect(service.isRetryableError(new Error('Validation failed'))).toBe(false)
      expect(service.isRetryableError(new Error('Not found'))).toBe(false)
    })
  })

  describe('optimistic updates with rollback', () => {
    test('should apply optimistic update before operation', async () => {
      const optimisticUpdateFn = jest.fn()
      const operationFn = jest.fn().mockResolvedValue('success')

      await service.execute('testOperation', operationFn, null, {
        enableOptimisticUpdate: true,
        optimisticUpdateFn,
      })

      expect(optimisticUpdateFn).toHaveBeenCalledTimes(1)
      expect(operationFn).toHaveBeenCalledTimes(1)
    })

    test('should rollback optimistic update on operation failure', async () => {
      const optimisticUpdateFn = jest.fn()
      const rollbackFn = jest.fn()
      const operationFn = jest.fn().mockRejectedValue(new Error('Operation failed'))

      await expect(
        service.execute('testOperation', operationFn, null, {
          enableOptimisticUpdate: true,
          optimisticUpdateFn,
          rollbackFn,
        })
      ).rejects.toThrow('Operation failed')

      expect(optimisticUpdateFn).toHaveBeenCalledTimes(1)
      expect(rollbackFn).toHaveBeenCalledTimes(1)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Optimistic update rolled back')
      )
    })

    test('should not rollback if operation succeeds', async () => {
      const optimisticUpdateFn = jest.fn()
      const rollbackFn = jest.fn()
      const operationFn = jest.fn().mockResolvedValue('success')

      await service.execute('testOperation', operationFn, null, {
        enableOptimisticUpdate: true,
        optimisticUpdateFn,
        rollbackFn,
      })

      expect(optimisticUpdateFn).toHaveBeenCalledTimes(1)
      expect(rollbackFn).not.toHaveBeenCalled()
    })

    test('should queue operation with rollback when offline', async () => {
      defaultState.connectionState = 'disconnected'
      const optimisticUpdateFn = jest.fn()
      const rollbackFn = jest.fn()
      const operationFn = jest.fn().mockResolvedValue('success')

      const result = await service.execute('testOperation', operationFn, null, {
        enableOptimisticUpdate: true,
        optimisticUpdateFn,
        rollbackFn,
      })

      expect(result).toBeNull()
      expect(optimisticUpdateFn).toHaveBeenCalledTimes(1)
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_TO_OFFLINE_QUEUE',
          payload: expect.objectContaining({
            name: 'testOperation',
            rollbackFn,
          }),
        })
      )
    })

    test('should rollback optimistic update when offline operation fails permanently', async () => {
      const rollbackFn = jest.fn()
      const failedOperation = jest.fn().mockRejectedValue(new Error('Failed'))

      defaultState.offlineQueue = [
        {
          id: 'op1',
          name: 'operation1',
          fn: failedOperation,
          rollbackFn,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        },
      ]

      await service.processOfflineQueue()

      expect(rollbackFn).toHaveBeenCalledTimes(1)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rolled back optimistic update')
      )
    })
  })

  describe('enhanced offline queue processing', () => {
    test('should retry failed operations in offline queue', async () => {
      let attemptCount = 0
      const retryableOperation = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 2) {
          return Promise.reject(new Error('Network timeout'))
        }
        return Promise.resolve('success')
      })

      defaultState.offlineQueue = [
        {
          id: 'op1',
          name: 'operation1',
          fn: retryableOperation,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        },
      ]

      await service.processOfflineQueue()

      expect(retryableOperation).toHaveBeenCalledTimes(2)
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REMOVE_FROM_OFFLINE_QUEUE',
          payload: 0,
        })
      )
    })

    test('should update retry count for failed retryable operations', async () => {
      const retryableOperation = jest.fn().mockRejectedValue(new Error('Network timeout'))

      defaultState.offlineQueue = [
        {
          id: 'op1',
          name: 'operation1',
          fn: retryableOperation,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        },
      ]

      await service.processOfflineQueue()

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_OFFLINE_QUEUE_ITEM',
          payload: expect.objectContaining({
            index: 0,
            updates: { retryCount: 1 },
          }),
        })
      )
    })

    test('should remove operations that exceed max retries', async () => {
      const retryableOperation = jest.fn().mockRejectedValue(new Error('Network timeout'))

      defaultState.offlineQueue = [
        {
          id: 'op1',
          name: 'operation1',
          fn: retryableOperation,
          timestamp: new Date().toISOString(),
          retryCount: 3, // Already at max retries
        },
      ]

      await service.processOfflineQueue()

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REMOVE_FROM_OFFLINE_QUEUE',
          payload: 0,
        })
      )
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed permanently'),
        expect.any(Error)
      )
    })
  })
})
