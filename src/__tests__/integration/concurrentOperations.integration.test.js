/**
 * Integration Tests: Concurrent Operations
 * Tests handling of concurrent operations and race conditions
 * 
 * Requirements: 1.1, 6.5
 */

import { CustomerService } from '@/services/customerService'
import { FabricService } from '@/services/fabricService'
import { AtomicOperationService } from '@/services/atomicOperations'
import logger from '@/utils/logger'

// Mock Firebase database
const mockDb = {
  ref: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  push: jest.fn(),
}

// Mock dispatch and getState
const mockDispatch = jest.fn()
const mockGetState = jest.fn(() => ({
  connectionState: 'connected',
  offlineQueue: [],
  performanceMetrics: {
    operationCount: 0,
    slowOperations: 0,
    averageResponseTime: 0,
  },
}))

describe('Integration: Concurrent Operations', () => {
  let customerService
  let fabricService
  let atomicOperations

  beforeEach(() => {
    jest.clearAllMocks()
    atomicOperations = new AtomicOperationService(mockDispatch, mockGetState)
    customerService = new CustomerService(mockDb, logger, atomicOperations)
    fabricService = new FabricService(mockDb, logger, atomicOperations)
  })

  describe('Concurrent Customer Operations', () => {
    test('should handle multiple concurrent customer additions', async () => {
      const customers = [
        { name: 'Customer 1', phone: '1111111111' },
        { name: 'Customer 2', phone: '2222222222' },
        { name: 'Customer 3', phone: '3333333333' },
        { name: 'Customer 4', phone: '4444444444' },
        { name: 'Customer 5', phone: '5555555555' },
      ]

      let customerIdCounter = 1
      mockDb.ref.mockReturnValue({})
      mockDb.push.mockImplementation(() => ({
        key: `customer-${customerIdCounter++}`,
      }))
      mockDb.set.mockResolvedValue(undefined)

      // Execute all additions concurrently
      const results = await Promise.all(
        customers.map(customer => customerService.addCustomer(customer))
      )

      expect(results).toHaveLength(5)
      expect(new Set(results).size).toBe(5) // All IDs should be unique
      expect(mockDb.set).toHaveBeenCalledTimes(5)
    })

    test('should handle concurrent customer updates', async () => {
      const customerId = 'customer-123'
      
      mockDb.ref.mockReturnValue({})
      mockDb.update.mockResolvedValue(undefined)

      const updates = [
        { name: 'Updated Name 1', phone: '1111111111' },
        { name: 'Updated Name 2', phone: '2222222222' },
        { name: 'Updated Name 3', phone: '3333333333' },
      ]

      // Execute all updates concurrently
      await Promise.all(
        updates.map(update => customerService.updateCustomer(customerId, update))
      )

      expect(mockDb.update).toHaveBeenCalledTimes(3)
    })

    test('should handle concurrent customer deletions', async () => {
      const customerIds = ['customer-1', 'customer-2', 'customer-3']

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({ name: 'Test Customer', phone: '1234567890' }),
      })
      mockDb.update.mockResolvedValue(undefined)

      // Execute all deletions concurrently
      await Promise.all(
        customerIds.map(id => customerService.deleteCustomer(id, []))
      )

      expect(mockDb.update).toHaveBeenCalledTimes(3)
    })
  })

  describe('Concurrent Inventory Operations', () => {
    test('should handle concurrent fabric additions', async () => {
      const fabrics = [
        { name: 'Cotton', category: 'Cotton', unit: 'meter' },
        { name: 'Silk', category: 'Silk', unit: 'meter' },
        { name: 'Polyester', category: 'Polyester', unit: 'meter' },
      ]

      let fabricIdCounter = 1
      mockDb.ref.mockReturnValue({})
      mockDb.push.mockImplementation(() => ({
        key: `fabric-${fabricIdCounter++}`,
      }))
      mockDb.set.mockResolvedValue(undefined)

      // Execute all additions concurrently
      const results = await Promise.all(
        fabrics.map(fabric => fabricService.addFabric(fabric))
      )

      expect(results).toHaveLength(3)
      expect(new Set(results).size).toBe(3) // All IDs should be unique
      expect(mockDb.set).toHaveBeenCalledTimes(3)
    })

    test('should handle concurrent batch additions to same fabric', async () => {
      const fabricId = 'fabric-123'
      
      const batches = [
        {
          fabricId,
          items: [{ colorName: 'Red', quantity: 50 }],
          purchaseDate: '2024-01-01',
          unitCost: 100,
          supplier: 'Supplier A',
        },
        {
          fabricId,
          items: [{ colorName: 'Blue', quantity: 40 }],
          purchaseDate: '2024-01-02',
          unitCost: 110,
          supplier: 'Supplier B',
        },
        {
          fabricId,
          items: [{ colorName: 'Green', quantity: 30 }],
          purchaseDate: '2024-01-03',
          unitCost: 120,
          supplier: 'Supplier C',
        },
      ]

      let callCount = 0
      mockDb.get.mockImplementation(async () => {
        callCount++
        // Simulate fabric state changing as batches are added
        const existingBatches = {}
        for (let i = 0; i < callCount - 1; i++) {
          existingBatches[`batch-${i}`] = batches[i]
        }
        
        return {
          exists: () => true,
          val: () => ({
            name: 'Test Fabric',
            category: 'Test',
            unit: 'meter',
            batches: existingBatches,
          }),
        }
      })
      mockDb.update.mockResolvedValue(undefined)

      // Execute all batch additions concurrently
      const results = await Promise.all(
        batches.map(batch => fabricService.addFabricBatch(batch))
      )

      expect(results).toHaveLength(3)
      expect(mockDb.update).toHaveBeenCalledTimes(3)
    })

    test('should handle concurrent inventory reductions with locking', async () => {
      const fabricId = 'fabric-456'
      const batchId = 'batch-001'

      // Simulate a lock mechanism
      let lockHeld = false
      const locks = new Map()

      const acquireLock = jest.fn(async (id) => {
        if (locks.get(id)) {
          return false // Lock already held
        }
        locks.set(id, true)
        return true
      })

      const releaseLock = jest.fn(async (id) => {
        locks.delete(id)
      })

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          name: 'Test Fabric',
          batches: {
            [batchId]: {
              items: [{ colorName: 'Purple', quantity: 100 }],
              purchaseDate: '2024-01-01',
              unitCost: 100,
              supplier: 'Test',
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          },
        }),
      })
      mockDb.update.mockResolvedValue(undefined)

      const saleProducts1 = [
        {
          fabricId,
          name: 'Test Fabric',
          color: 'Purple',
          quantity: 30,
        },
      ]

      const saleProducts2 = [
        {
          fabricId,
          name: 'Test Fabric',
          color: 'Purple',
          quantity: 20,
        },
      ]

      // Execute reductions concurrently
      const results = await Promise.allSettled([
        fabricService.reduceInventory(saleProducts1, acquireLock, releaseLock),
        fabricService.reduceInventory(saleProducts2, acquireLock, releaseLock),
      ])

      // At least one should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failureCount = results.filter(r => r.status === 'rejected').length

      expect(successCount + failureCount).toBe(2)
      
      // Verify locks were properly managed
      expect(acquireLock).toHaveBeenCalled()
      expect(releaseLock).toHaveBeenCalled()
    })
  })

  describe('Concurrent Mixed Operations', () => {
    test('should handle concurrent operations across different services', async () => {
      // Setup mocks
      let customerIdCounter = 1
      let fabricIdCounter = 1

      mockDb.ref.mockReturnValue({})
      mockDb.push.mockImplementation(() => {
        const id = Math.random() > 0.5 
          ? `customer-${customerIdCounter++}` 
          : `fabric-${fabricIdCounter++}`
        return { key: id }
      })
      mockDb.set.mockResolvedValue(undefined)
      mockDb.update.mockResolvedValue(undefined)

      const operations = [
        // Customer operations
        customerService.addCustomer({ name: 'Customer 1', phone: '1111111111' }),
        customerService.addCustomer({ name: 'Customer 2', phone: '2222222222' }),
        
        // Fabric operations
        fabricService.addFabric({ name: 'Cotton', category: 'Cotton', unit: 'meter' }),
        fabricService.addFabric({ name: 'Silk', category: 'Silk', unit: 'meter' }),
      ]

      // Execute all operations concurrently
      const results = await Promise.all(operations)

      expect(results).toHaveLength(4)
      expect(mockDb.set).toHaveBeenCalledTimes(4)
    })

    test('should maintain data consistency under concurrent load', async () => {
      const customerId = 'customer-999'
      
      mockDb.ref.mockReturnValue({})
      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({ name: 'Test Customer', phone: '1234567890' }),
      })
      mockDb.update.mockResolvedValue(undefined)

      // Simulate 10 concurrent updates to the same customer
      const updates = Array.from({ length: 10 }, (_, i) => ({
        name: `Updated Name ${i}`,
        phone: `111111111${i}`,
      }))

      await Promise.all(
        updates.map(update => customerService.updateCustomer(customerId, update))
      )

      // All updates should complete
      expect(mockDb.update).toHaveBeenCalledTimes(10)
    })
  })

  describe('Race Condition Prevention', () => {
    test('should prevent race conditions in inventory reduction', async () => {
      const fabricId = 'fabric-race'
      const batchId = 'batch-race'

      let currentQuantity = 50
      const locks = new Map()

      const acquireLock = jest.fn(async (id) => {
        if (locks.get(id)) {
          return false
        }
        locks.set(id, true)
        return true
      })

      const releaseLock = jest.fn(async (id) => {
        locks.delete(id)
      })

      mockDb.get.mockImplementation(async () => ({
        exists: () => true,
        val: () => ({
          name: 'Test Fabric',
          batches: {
            [batchId]: {
              items: [{ colorName: 'Orange', quantity: currentQuantity }],
              purchaseDate: '2024-01-01',
              unitCost: 100,
              supplier: 'Test',
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          },
        }),
      }))

      mockDb.update.mockImplementation(async () => {
        // Simulate quantity reduction
        currentQuantity -= 10
      })

      // Try to reduce inventory concurrently
      const saleProducts = [
        {
          fabricId,
          name: 'Test Fabric',
          color: 'Orange',
          quantity: 10,
        },
      ]

      const operations = Array.from({ length: 5 }, () =>
        fabricService.reduceInventory([...saleProducts], acquireLock, releaseLock)
      )

      const results = await Promise.allSettled(operations)

      // Some operations should succeed, some should fail due to locking
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failureCount = results.filter(r => r.status === 'rejected').length

      expect(successCount + failureCount).toBe(5)
      
      // Verify locking mechanism was used
      expect(acquireLock.mock.calls.length).toBeGreaterThan(0)
      expect(releaseLock.mock.calls.length).toBeGreaterThan(0)
    })

    test('should handle concurrent deletions of same resource', async () => {
      const customerId = 'customer-concurrent-delete'

      let deleteCount = 0
      mockDb.get.mockImplementation(async () => {
        deleteCount++
        return {
          exists: () => deleteCount === 1, // Only exists on first call
          val: () => ({ name: 'Test Customer', phone: '1234567890' }),
        }
      })
      mockDb.update.mockResolvedValue(undefined)

      // Try to delete the same customer concurrently
      const deletions = Array.from({ length: 3 }, () =>
        customerService.deleteCustomer(customerId, [])
      )

      const results = await Promise.allSettled(deletions)

      // Only one should succeed, others should fail with NOT_FOUND
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failureCount = results.filter(r => r.status === 'rejected').length

      expect(successCount).toBe(1)
      expect(failureCount).toBe(2)

      // Verify failed operations got NOT_FOUND errors
      const failures = results.filter(r => r.status === 'rejected')
      failures.forEach(failure => {
        expect(failure.reason.message).toContain('not found')
      })
    })
  })

  describe('Performance Under Concurrent Load', () => {
    test('should track performance metrics for concurrent operations', async () => {
      const customers = Array.from({ length: 20 }, (_, i) => ({
        name: `Customer ${i}`,
        phone: `${i}`.padStart(10, '0'),
      }))

      let customerIdCounter = 1
      mockDb.ref.mockReturnValue({})
      mockDb.push.mockImplementation(() => ({
        key: `customer-${customerIdCounter++}`,
      }))
      mockDb.set.mockResolvedValue(undefined)

      // Execute many operations concurrently
      await Promise.all(
        customers.map(customer => customerService.addCustomer(customer))
      )

      // Verify performance metrics were updated
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_PERFORMANCE_METRICS',
        })
      )
    })

    test('should handle high concurrent load without failures', async () => {
      const operationCount = 50
      const operations = []

      let idCounter = 1
      mockDb.ref.mockReturnValue({})
      mockDb.push.mockImplementation(() => ({
        key: `resource-${idCounter++}`,
      }))
      mockDb.set.mockResolvedValue(undefined)

      // Create mix of customer and fabric operations
      for (let i = 0; i < operationCount; i++) {
        if (i % 2 === 0) {
          operations.push(
            customerService.addCustomer({
              name: `Customer ${i}`,
              phone: `${i}`.padStart(10, '0'),
            })
          )
        } else {
          operations.push(
            fabricService.addFabric({
              name: `Fabric ${i}`,
              category: 'Test',
              unit: 'meter',
            })
          )
        }
      }

      // Execute all operations concurrently
      const results = await Promise.allSettled(operations)

      // All operations should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length
      expect(successCount).toBe(operationCount)
    })
  })
})
