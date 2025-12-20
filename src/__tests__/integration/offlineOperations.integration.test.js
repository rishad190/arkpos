/**
 * Integration Tests: Offline Operation Processing
 * Tests offline queue management and operation processing
 * 
 * Requirements: 1.1, 6.5
 */

import { AtomicOperationService } from '@/services/atomicOperations'
import logger from '@/utils/logger'

describe('Integration: Offline Operations', () => {
  let atomicOperations
  let mockDispatch
  let mockGetState
  let stateData

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Initialize state
    stateData = {
      connectionState: 'connected',
      offlineQueue: [],
      performanceMetrics: {
        operationCount: 0,
        slowOperations: 0,
        averageResponseTime: 0,
      },
      pendingOperations: [],
    }

    mockDispatch = jest.fn((action) => {
      // Simulate state updates
      if (action.type === 'ADD_TO_OFFLINE_QUEUE') {
        stateData.offlineQueue.push(action.payload)
      } else if (action.type === 'REMOVE_FROM_OFFLINE_QUEUE') {
        stateData.offlineQueue.splice(action.payload, 1)
      } else if (action.type === 'UPDATE_OFFLINE_QUEUE_ITEM') {
        const { index, updates } = action.payload
        stateData.offlineQueue[index] = {
          ...stateData.offlineQueue[index],
          ...updates,
        }
      } else if (action.type === 'ADD_PENDING_OPERATION') {
        stateData.pendingOperations.push(action.payload)
      } else if (action.type === 'REMOVE_PENDING_OPERATION') {
        const index = stateData.pendingOperations.indexOf(action.payload)
        if (index > -1) {
          stateData.pendingOperations.splice(index, 1)
        }
      }
    })

    mockGetState = jest.fn(() => stateData)

    atomicOperations = new AtomicOperationService(mockDispatch, mockGetState)
  })

  describe('Offline Queue Management', () => {
    test('should queue operations when disconnected', async () => {
      // Set connection state to disconnected
      stateData.connectionState = 'disconnected'

      const operationFn = jest.fn().mockResolvedValue('result')

      try {
        await atomicOperations.execute('testOperation', operationFn)
      } catch (error) {
        expect(error.message).toBe('Operation queued for offline processing')
      }

      // Verify operation was queued
      expect(stateData.offlineQueue).toHaveLength(1)
      expect(stateData.offlineQueue[0].name).toBe('testOperation')
      expect(stateData.offlineQueue[0].retryCount).toBe(0)
      
      // Verify operation function was not executed
      expect(operationFn).not.toHaveBeenCalled()
    })

    test('should execute operations immediately when connected', async () => {
      stateData.connectionState = 'connected'

      const operationFn = jest.fn().mockResolvedValue('success')

      const result = await atomicOperations.execute('testOperation', operationFn)

      expect(result).toBe('success')
      expect(operationFn).toHaveBeenCalled()
      expect(stateData.offlineQueue).toHaveLength(0)
    })

    test('should process offline queue in FIFO order', async () => {
      // Add operations to queue
      stateData.offlineQueue = [
        {
          id: 'op1',
          name: 'operation1',
          fn: jest.fn().mockResolvedValue('result1'),
          timestamp: '2024-01-01T10:00:00.000Z',
          retryCount: 0,
        },
        {
          id: 'op2',
          name: 'operation2',
          fn: jest.fn().mockResolvedValue('result2'),
          timestamp: '2024-01-01T10:01:00.000Z',
          retryCount: 0,
        },
        {
          id: 'op3',
          name: 'operation3',
          fn: jest.fn().mockResolvedValue('result3'),
          timestamp: '2024-01-01T10:02:00.000Z',
          retryCount: 0,
        },
      ]

      const executionOrder = []
      stateData.offlineQueue.forEach((op, index) => {
        const originalFn = op.fn
        op.fn = jest.fn(async () => {
          executionOrder.push(index)
          return originalFn()
        })
      })

      await atomicOperations.processOfflineQueue()

      // Verify operations were executed in FIFO order
      expect(executionOrder).toEqual([0, 1, 2])
      
      // Verify all operations were removed from queue
      expect(stateData.offlineQueue).toHaveLength(0)
    })

    test('should handle failed operations with retry logic', async () => {
      const failingOperation = jest.fn()
      // We mock executeWithRetry to simulate a scenario where internal retries have exhausted
      // This allows us to test the queue management logic without waiting for timeouts
      jest.spyOn(atomicOperations, 'executeWithRetry').mockRejectedValue(new Error('Network timeout'))

      stateData.offlineQueue = [
        {
          id: 'op1',
          name: 'failingOperation',
          fn: failingOperation,
          timestamp: '2024-01-01T10:00:00.000Z',
          retryCount: 0,
        },
      ]

      await atomicOperations.processOfflineQueue()

      // First attempt should fail and update retry count
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_OFFLINE_QUEUE_ITEM',
          payload: expect.objectContaining({
            updates: { retryCount: 1 },
          }),
        })
      )
    })

    test('should remove operations after max retries exceeded', async () => {
      const alwaysFailingOperation = jest.fn()
        .mockRejectedValue(new Error('Network timeout'))

      stateData.offlineQueue = [
        {
          id: 'op1',
          name: 'alwaysFailingOperation',
          fn: alwaysFailingOperation,
          timestamp: '2024-01-01T10:00:00.000Z',
          retryCount: 3, // Already at max retries
        },
      ]

      await atomicOperations.processOfflineQueue()

      // Operation should be removed from queue
      expect(stateData.offlineQueue).toHaveLength(0)
    })

    test('should execute rollback on permanent failure', async () => {
      const failingOperation = jest.fn()
        .mockRejectedValue(new Error('Network timeout'))
      
      const rollbackFn = jest.fn()

      stateData.offlineQueue = [
        {
          id: 'op1',
          name: 'failingOperation',
          fn: failingOperation,
          rollbackFn,
          timestamp: '2024-01-01T10:00:00.000Z',
          retryCount: 3, // At max retries
        },
      ]

      await atomicOperations.processOfflineQueue()

      // Rollback should be executed
      expect(rollbackFn).toHaveBeenCalled()
    })

    test('should execute fallback on permanent failure', async () => {
      const failingOperation = jest.fn()
        .mockRejectedValue(new Error('Network timeout'))
      
      const fallbackFn = jest.fn().mockResolvedValue(undefined)

      stateData.offlineQueue = [
        {
          id: 'op1',
          name: 'failingOperation',
          fn: failingOperation,
          fallbackFn,
          timestamp: '2024-01-01T10:00:00.000Z',
          retryCount: 3, // At max retries
        },
      ]

      await atomicOperations.processOfflineQueue()

      // Fallback should be executed
      expect(fallbackFn).toHaveBeenCalled()
    })
  })

  describe('Optimistic Updates', () => {
    test('should apply optimistic update when enabled', async () => {
      stateData.connectionState = 'connected'

      const operationFn = jest.fn().mockResolvedValue('success')
      const optimisticUpdateFn = jest.fn()

      await atomicOperations.execute(
        'testOperation',
        operationFn,
        null,
        {
          enableOptimisticUpdate: true,
          optimisticUpdateFn,
        }
      )

      expect(optimisticUpdateFn).toHaveBeenCalled()
      expect(operationFn).toHaveBeenCalled()
    })

    test('should rollback optimistic update on failure', async () => {
      stateData.connectionState = 'connected'

      const operationFn = jest.fn().mockRejectedValue(new Error('Operation failed'))
      const optimisticUpdateFn = jest.fn()
      const rollbackFn = jest.fn()

      try {
        await atomicOperations.execute(
          'testOperation',
          operationFn,
          null,
          {
            enableOptimisticUpdate: true,
            optimisticUpdateFn,
            rollbackFn,
          }
        )
      } catch (error) {
        // Expected to throw
      }

      expect(optimisticUpdateFn).toHaveBeenCalled()
      expect(rollbackFn).toHaveBeenCalled()
    })

    test('should not rollback if optimistic update was not applied', async () => {
      stateData.connectionState = 'connected'

      const operationFn = jest.fn().mockRejectedValue(new Error('Operation failed'))
      const rollbackFn = jest.fn()

      try {
        await atomicOperations.execute(
          'testOperation',
          operationFn,
          null,
          {
            enableOptimisticUpdate: false,
            rollbackFn,
          }
        )
      } catch (error) {
        // Expected to throw
      }

      expect(rollbackFn).not.toHaveBeenCalled()
    })

    test('should queue operation with rollback when offline', async () => {
      stateData.connectionState = 'disconnected'

      const operationFn = jest.fn().mockResolvedValue('success')
      const optimisticUpdateFn = jest.fn()
      const rollbackFn = jest.fn()

      const result = await atomicOperations.execute(
        'testOperation',
        operationFn,
        null,
        {
          enableOptimisticUpdate: true,
          optimisticUpdateFn,
          rollbackFn,
        }
      )

      // Should return null for queued operation
      expect(result).toBeNull()
      
      // Optimistic update should be applied
      expect(optimisticUpdateFn).toHaveBeenCalled()
      
      // Operation should be queued with rollback
      expect(stateData.offlineQueue).toHaveLength(1)
      expect(stateData.offlineQueue[0].rollbackFn).toBe(rollbackFn)
    })
  })

  describe('Retry Logic with Exponential Backoff', () => {
    test('should calculate exponential backoff delays correctly', () => {
      const delay0 = atomicOperations.calculateBackoffDelay(0)
      const delay1 = atomicOperations.calculateBackoffDelay(1)
      const delay2 = atomicOperations.calculateBackoffDelay(2)
      const delay3 = atomicOperations.calculateBackoffDelay(3)

      expect(delay0).toBe(1000) // 1 * 2^0 = 1 second
      expect(delay1).toBe(2000) // 1 * 2^1 = 2 seconds
      expect(delay2).toBe(4000) // 1 * 2^2 = 4 seconds
      expect(delay3).toBe(8000) // 1 * 2^3 = 8 seconds
    })

    test('should cap backoff delay at maximum', () => {
      const delay10 = atomicOperations.calculateBackoffDelay(10)
      const delay20 = atomicOperations.calculateBackoffDelay(20)

      // Should be capped at 30 seconds
      expect(delay10).toBe(30000)
      expect(delay20).toBe(30000)
    })

    test('should retry retryable errors with exponential backoff', async () => {
      stateData.connectionState = 'connected'

      let attemptCount = 0
      const operationFn = jest.fn(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Network timeout')
        }
        return 'success'
      })

      // Mock setTimeout to avoid actual delays
      jest.useFakeTimers()

      const executePromise = atomicOperations.execute('testOperation', operationFn)

      // Fast-forward through all timers
      await jest.runAllTimersAsync()

      const result = await executePromise

      expect(result).toBe('success')
      expect(operationFn).toHaveBeenCalledTimes(3)

      jest.useRealTimers()
    })

    test('should not retry non-retryable errors', async () => {
      stateData.connectionState = 'connected'

      const operationFn = jest.fn()
        .mockRejectedValue(new Error('Validation failed'))

      await expect(
        atomicOperations.execute('testOperation', operationFn)
      ).rejects.toThrow('Validation failed')

      // Should only be called once (no retries)
      expect(operationFn).toHaveBeenCalledTimes(1)
    })

    test('should identify retryable errors correctly', () => {
      const networkError = new Error('Network timeout')
      const unavailableError = new Error('Service unavailable')
      const validationError = new Error('Validation failed')
      const notFoundError = new Error('Not found')

      expect(atomicOperations.isRetryableError(networkError)).toBe(true)
      expect(atomicOperations.isRetryableError(unavailableError)).toBe(true)
      expect(atomicOperations.isRetryableError(validationError)).toBe(false)
      expect(atomicOperations.isRetryableError(notFoundError)).toBe(false)
    })
  })

  describe('Performance Tracking', () => {
    test('should track operation performance', async () => {
      stateData.connectionState = 'connected'

      const operationFn = jest.fn().mockResolvedValue('success')

      await atomicOperations.execute('testOperation', operationFn)

      // Verify performance metrics were updated
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_PERFORMANCE_METRICS',
        })
      )
    })

    test('should flag slow operations', async () => {
      stateData.connectionState = 'connected'

      // Mock slow operation (takes 3 seconds)
      const slowOperation = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        return 'success'
      })

      jest.useFakeTimers()

      const executePromise = atomicOperations.execute('slowOperation', slowOperation)

      await jest.advanceTimersByTimeAsync(3000)

      await executePromise

      // Verify slow operation was tracked
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_PERFORMANCE_METRICS',
          payload: expect.objectContaining({
            slowOperations: expect.any(Number),
          }),
        })
      )

      jest.useRealTimers()
    })
  })
})
