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
