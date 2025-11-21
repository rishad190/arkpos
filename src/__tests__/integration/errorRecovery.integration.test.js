/**
 * Integration Tests: Error Recovery Scenarios
 * Tests error handling and recovery across services
 * 
 * Requirements: 1.1, 6.5
 */

import { CustomerService } from '@/services/customerService'
import { TransactionService } from '@/services/transactionService'
import { FabricService } from '@/services/fabricService'
import { AtomicOperationService } from '@/services/atomicOperations'
import { AppError, ERROR_TYPES } from '@/lib/errors'
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

describe('Integration: Error Recovery', () => {
  let customerService
  let transactionService
  let fabricService
  let atomicOperations

  beforeEach(() => {
    jest.clearAllMocks()
    atomicOperations = new AtomicOperationService(mockDispatch, mockGetState)
    customerService = new CustomerService(mockDb, logger, atomicOperations)
    transactionService = new TransactionService(mockDb, logger, atomicOperations)
    fabricService = new FabricService(mockDb, logger, atomicOperations)
  })

  describe('Validation Error Recovery', () => {
    test('should handle invalid customer data gracefully', async () => {
      const invalidCustomer = {
        name: '', // Invalid: empty name
        phone: '123', // Invalid: too short
        email: 'invalid-email', // Invalid: bad format
      }

      await expect(
        customerService.addCustomer(invalidCustomer)
      ).rejects.toThrow(AppError)

      try {
        await customerService.addCustomer(invalidCustomer)
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.VALIDATION)
        expect(error.context.validationErrors).toBeDefined()
        expect(error.context.validationErrors.length).toBeGreaterThan(0)
      }
    })

    test('should handle invalid transaction data gracefully', async () => {
      const invalidTransaction = {
        customerId: '', // Invalid: empty
        total: -100, // Invalid: negative
        deposit: 200, // Invalid: exceeds total
      }

      await expect(
        transactionService.addTransaction(invalidTransaction)
      ).rejects.toThrow(AppError)

      try {
        await transactionService.addTransaction(invalidTransaction)
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.VALIDATION)
        expect(error.context.validationErrors).toBeDefined()
      }
    })

    test('should handle invalid fabric data gracefully', async () => {
      const invalidFabric = {
        name: '', // Invalid: empty
        category: '', // Invalid: empty
        unit: '', // Invalid: empty
      }

      await expect(
        fabricService.addFabric(invalidFabric)
      ).rejects.toThrow(AppError)

      try {
        await fabricService.addFabric(invalidFabric)
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.VALIDATION)
      }
    })
  })

  describe('Network Error Recovery', () => {
    test('should handle Firebase connection failures', async () => {
      const customerData = {
        name: 'Test Customer',
        phone: '1234567890',
      }

      mockDb.ref.mockReturnValue({})
      mockDb.push.mockReturnValue({ key: 'customer-123' })
      mockDb.set.mockRejectedValue(new Error('Network timeout'))

      await expect(
        customerService.addCustomer(customerData)
      ).rejects.toThrow('Network timeout')
    })

    test('should retry on network errors', async () => {
      const customerData = {
        name: 'Test Customer',
        phone: '1234567890',
      }

      let attemptCount = 0
      mockDb.ref.mockReturnValue({})
      mockDb.push.mockReturnValue({ key: 'customer-123' })
      mockDb.set.mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Network timeout')
        }
        return undefined
      })

      jest.useFakeTimers()

      const addPromise = customerService.addCustomer(customerData)

      // Fast-forward through retry delays
      await jest.runAllTimersAsync()

      const result = await addPromise

      expect(result).toBe('customer-123')
      expect(attemptCount).toBe(3)

      jest.useRealTimers()
    })

    test('should execute fallback on persistent network failure', async () => {
      const customerData = {
        name: 'Test Customer',
        phone: '1234567890',
      }

      mockDb.ref.mockReturnValue({})
      mockDb.push.mockReturnValue({ key: 'customer-123' })
      mockDb.set.mockRejectedValue(new Error('Network timeout'))

      const fallbackFn = jest.fn().mockResolvedValue(undefined)

      jest.useFakeTimers()

      try {
        await atomicOperations.execute(
          'addCustomer',
          async () => {
            const customersRef = mockDb.ref('customers')
            const newCustomerRef = mockDb.push(customersRef)
            await mockDb.set(newCustomerRef, customerData)
            return newCustomerRef.key
          },
          fallbackFn
        )
      } catch (error) {
        // Expected to fail
      }

      await jest.runAllTimersAsync()

      // Fallback should be executed after max retries
      expect(fallbackFn).toHaveBeenCalled()

      jest.useRealTimers()
    })
  })

  describe('Not Found Error Recovery', () => {
    test('should handle customer not found gracefully', async () => {
      mockDb.get.mockResolvedValue({
        exists: () => false,
      })

      const customer = await customerService.getCustomer('nonexistent-id')
      expect(customer).toBeNull()
    })

    test('should throw error when deleting nonexistent customer', async () => {
      mockDb.get.mockResolvedValue({
        exists: () => false,
      })

      await expect(
        customerService.deleteCustomer('nonexistent-id', [])
      ).rejects.toThrow(AppError)

      try {
        await customerService.deleteCustomer('nonexistent-id', [])
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.NOT_FOUND)
        expect(error.message).toContain('not found')
      }
    })

    test('should handle fabric not found during batch addition', async () => {
      mockDb.get.mockResolvedValue({
        exists: () => false,
      })

      const batchData = {
        fabricId: 'nonexistent-fabric',
        items: [{ colorName: 'Blue', quantity: 10 }],
        purchaseDate: '2024-01-01',
        unitCost: 100,
        supplier: 'Test Supplier',
      }

      await expect(
        fabricService.addFabricBatch(batchData)
      ).rejects.toThrow(AppError)

      try {
        await fabricService.addFabricBatch(batchData)
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.NOT_FOUND)
      }
    })
  })

  describe('Conflict Error Recovery', () => {
    test('should handle concurrent modification conflicts', async () => {
      const fabricId = 'fabric-123'
      const batchId = 'batch-456'

      // Simulate concurrent modification
      let modificationCount = 0
      mockDb.get.mockImplementation(async () => {
        modificationCount++
        return {
          exists: () => true,
          val: () => ({
            name: 'Test Fabric',
            batches: {
              [batchId]: {
                items: [{ colorName: 'Red', quantity: modificationCount === 1 ? 50 : 30 }],
                purchaseDate: '2024-01-01',
                unitCost: 100,
                supplier: 'Test',
                createdAt: '2024-01-01T00:00:00.000Z',
              },
            },
          }),
        }
      })

      mockDb.update.mockResolvedValue(undefined)

      const updatedBatchData = {
        fabricId,
        items: [{ colorName: 'Red', quantity: 40 }],
        purchaseDate: '2024-01-01',
        unitCost: 100,
        supplier: 'Test',
      }

      // First update should succeed
      await fabricService.updateFabricBatch(fabricId, batchId, updatedBatchData)

      // Second update should also succeed (gets latest data)
      await fabricService.updateFabricBatch(fabricId, batchId, updatedBatchData)

      expect(mockDb.get).toHaveBeenCalledTimes(2)
      expect(mockDb.update).toHaveBeenCalledTimes(2)
    })

    test('should handle lock acquisition failure during inventory reduction', async () => {
      const fabricId = 'fabric-789'
      const batchId = 'batch-001'

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          name: 'Test Fabric',
          batches: {
            [batchId]: {
              items: [{ colorName: 'Green', quantity: 50 }],
              purchaseDate: '2024-01-01',
              unitCost: 100,
              supplier: 'Test',
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          },
        }),
      })

      const saleProducts = [
        {
          fabricId,
          name: 'Test Fabric',
          color: 'Green',
          quantity: 20,
        },
      ]

      // Simulate lock acquisition failure (another process has the lock)
      const acquireLock = jest.fn().mockResolvedValue(false)
      const releaseLock = jest.fn().mockResolvedValue(undefined)

      await expect(
        fabricService.reduceInventory(saleProducts, acquireLock, releaseLock)
      ).rejects.toThrow(AppError)

      try {
        await fabricService.reduceInventory(saleProducts, acquireLock, releaseLock)
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.CONFLICT)
        expect(error.message).toContain('lock')
      }
    })
  })

  describe('Data Consistency Error Recovery', () => {
    test('should prevent negative inventory during reduction', async () => {
      const fabricId = 'fabric-999'
      const batchId = 'batch-001'

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          name: 'Test Fabric',
          batches: {
            [batchId]: {
              items: [{ colorName: 'Yellow', quantity: 10 }],
              purchaseDate: '2024-01-01',
              unitCost: 100,
              supplier: 'Test',
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          },
        }),
      })

      const saleProducts = [
        {
          fabricId,
          name: 'Test Fabric',
          color: 'Yellow',
          quantity: 20, // More than available
        },
      ]

      const acquireLock = jest.fn().mockResolvedValue(true)
      const releaseLock = jest.fn().mockResolvedValue(undefined)

      await expect(
        fabricService.reduceInventory(saleProducts, acquireLock, releaseLock)
      ).rejects.toThrow('Insufficient stock')

      // Verify lock was released even on error
      expect(releaseLock).toHaveBeenCalled()
    })

    test('should handle deposit exceeding total in transaction', async () => {
      const invalidTransaction = {
        customerId: 'customer-123',
        total: 100,
        deposit: 150, // Exceeds total
        date: '2024-01-01',
      }

      await expect(
        transactionService.addTransaction(invalidTransaction)
      ).rejects.toThrow(AppError)

      try {
        await transactionService.addTransaction(invalidTransaction)
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.VALIDATION)
        expect(error.context.validationErrors).toContainEqual(
          expect.objectContaining({
            field: 'deposit',
            message: expect.stringContaining('exceed'),
          })
        )
      }
    })

    test('should maintain atomicity during customer deletion', async () => {
      const customerId = 'customer-123'
      const transactions = [
        { id: 'txn-1', customerId },
        { id: 'txn-2', customerId },
      ]

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({ name: 'Test Customer', phone: '1234567890' }),
      })

      // Simulate partial failure
      mockDb.update.mockRejectedValue(new Error('Update failed'))

      await expect(
        customerService.deleteCustomer(customerId, transactions)
      ).rejects.toThrow('Update failed')

      // Verify atomic update was attempted with all deletions
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [`customers/${customerId}`]: null,
          'transactions/txn-1': null,
          'transactions/txn-2': null,
        })
      )
    })
  })

  describe('Cascading Error Recovery', () => {
    test('should handle errors during transaction cascade deletion', async () => {
      const customerId = 'customer-456'
      const transactions = [
        { id: 'txn-1', customerId },
        { id: 'txn-2', customerId },
        { id: 'txn-3', customerId },
      ]

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({ name: 'Test Customer', phone: '1234567890' }),
      })

      mockDb.update.mockRejectedValue(new Error('Cascade deletion failed'))

      await expect(
        customerService.deleteCustomer(customerId, transactions)
      ).rejects.toThrow('Cascade deletion failed')

      // Verify all transactions were included in deletion attempt
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'transactions/txn-1': null,
          'transactions/txn-2': null,
          'transactions/txn-3': null,
        })
      )
    })
  })

  describe('Error Context and Logging', () => {
    test('should include context in validation errors', async () => {
      const invalidCustomer = {
        name: '',
        phone: '123',
      }

      try {
        await customerService.addCustomer(invalidCustomer)
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect(error.context).toBeDefined()
        expect(error.context.customerData).toBeDefined()
        expect(error.context.validationErrors).toBeDefined()
      }
    })

    test('should include context in not found errors', async () => {
      mockDb.get.mockResolvedValue({
        exists: () => false,
      })

      try {
        await customerService.deleteCustomer('nonexistent-id', [])
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect(error.context).toBeDefined()
        expect(error.context.customerId).toBe('nonexistent-id')
      }
    })

    test('should include context in conflict errors', async () => {
      const fabricId = 'fabric-123'
      const batchId = 'batch-456'

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          name: 'Test Fabric',
          batches: {
            [batchId]: {
              items: [{ colorName: 'Blue', quantity: 50 }],
              purchaseDate: '2024-01-01',
              unitCost: 100,
              supplier: 'Test',
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          },
        }),
      })

      const saleProducts = [
        {
          fabricId,
          name: 'Test Fabric',
          color: 'Blue',
          quantity: 20,
        },
      ]

      const acquireLock = jest.fn().mockResolvedValue(false)
      const releaseLock = jest.fn().mockResolvedValue(undefined)

      try {
        await fabricService.reduceInventory(saleProducts, acquireLock, releaseLock)
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect(error.context).toBeDefined()
        expect(error.context.batchId).toBe(batchId)
      }
    })
  })
})
