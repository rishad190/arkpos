/**
 * Integration Tests: Inventory Management Flow
 * Tests complete inventory management operations with FIFO strategy
 * 
 * Requirements: 1.1, 6.5
 */

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

// Mock dispatch and getState for AtomicOperationService
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

describe('Integration: Inventory Management', () => {
  let fabricService
  let atomicOperations

  beforeEach(() => {
    jest.clearAllMocks()
    atomicOperations = new AtomicOperationService(mockDispatch, mockGetState)
    fabricService = new FabricService(mockDb, logger, atomicOperations)
  })

  describe('Complete Inventory Flow', () => {
    test('should create fabric, add batches, and reduce inventory using FIFO', async () => {
      // Step 1: Create fabric
      const fabricData = {
        name: 'Cotton Fabric',
        category: 'Cotton',
        unit: 'meter',
      }

      const mockFabricRef = {
        key: 'fabric-123',
      }

      mockDb.ref.mockReturnValue({})
      mockDb.push.mockReturnValue(mockFabricRef)
      mockDb.set.mockResolvedValue(undefined)

      const fabricId = await fabricService.addFabric(fabricData)
      expect(fabricId).toBe('fabric-123')

      // Step 2: Add first batch (older)
      const batch1Data = {
        fabricId: 'fabric-123',
        items: [
          { colorName: 'Blue', quantity: 50, colorCode: '#0000FF' },
          { colorName: 'Red', quantity: 30, colorCode: '#FF0000' },
        ],
        purchaseDate: '2024-01-01',
        unitCost: 100,
        supplier: 'Supplier A',
      }

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          ...fabricData,
          batches: {},
        }),
      })
      mockDb.update.mockResolvedValue(undefined)

      const batch1Id = await fabricService.addFabricBatch(batch1Data)
      expect(batch1Id).toMatch(/^batch_/)

      // Step 3: Add second batch (newer)
      const batch2Data = {
        fabricId: 'fabric-123',
        items: [
          { colorName: 'Blue', quantity: 40, colorCode: '#0000FF' },
          { colorName: 'Green', quantity: 25, colorCode: '#00FF00' },
        ],
        purchaseDate: '2024-01-15',
        unitCost: 110,
        supplier: 'Supplier B',
      }

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          ...fabricData,
          batches: {
            [batch1Id]: {
              ...batch1Data,
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          },
        }),
      })

      const batch2Id = await fabricService.addFabricBatch(batch2Data)
      expect(batch2Id).toMatch(/^batch_/)

      // Step 4: Reduce inventory using FIFO
      const saleProducts = [
        {
          fabricId: 'fabric-123',
          name: 'Cotton Fabric',
          color: 'Blue',
          quantity: 60, // Should take 50 from batch1, 10 from batch2
        },
      ]

      // Mock fabric with both batches
      const fabricWithBatches = {
        ...fabricData,
        batches: {
          [batch1Id]: {
            items: [
              { colorName: 'Blue', quantity: 50, colorCode: '#0000FF' },
              { colorName: 'Red', quantity: 30, colorCode: '#FF0000' },
            ],
            purchaseDate: '2024-01-01',
            unitCost: 100,
            supplier: 'Supplier A',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          [batch2Id]: {
            items: [
              { colorName: 'Blue', quantity: 40, colorCode: '#0000FF' },
              { colorName: 'Green', quantity: 25, colorCode: '#00FF00' },
            ],
            purchaseDate: '2024-01-15',
            unitCost: 110,
            supplier: 'Supplier B',
            createdAt: '2024-01-15T00:00:00.000Z',
          },
        },
      }

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => fabricWithBatches,
      })

      // Mock lock functions
      const acquireLock = jest.fn().mockResolvedValue(true)
      const releaseLock = jest.fn().mockResolvedValue(undefined)

      await fabricService.reduceInventory(saleProducts, acquireLock, releaseLock)

      // Verify locks were acquired and released
      expect(acquireLock).toHaveBeenCalledTimes(2)
      expect(releaseLock).toHaveBeenCalledTimes(2)

      // Verify batch updates were called
      expect(mockDb.update).toHaveBeenCalled()
    })

    test('should reject inventory reduction when insufficient stock', async () => {
      const fabricId = 'fabric-456'
      const batchId = 'batch-001'

      const fabricWithLowStock = {
        name: 'Silk Fabric',
        category: 'Silk',
        unit: 'meter',
        batches: {
          [batchId]: {
            items: [
              { colorName: 'White', quantity: 20 },
            ],
            purchaseDate: '2024-01-01',
            unitCost: 200,
            supplier: 'Supplier C',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      }

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => fabricWithLowStock,
      })

      const saleProducts = [
        {
          fabricId,
          name: 'Silk Fabric',
          color: 'White',
          quantity: 30, // More than available
        },
      ]

      const acquireLock = jest.fn().mockResolvedValue(true)
      const releaseLock = jest.fn().mockResolvedValue(undefined)

      await expect(
        fabricService.reduceInventory(saleProducts, acquireLock, releaseLock)
      ).rejects.toThrow('Insufficient stock')
    })

    test('should handle FIFO reduction across multiple batches', async () => {
      const fabricId = 'fabric-789'
      const batch1Id = 'batch-001'
      const batch2Id = 'batch-002'
      const batch3Id = 'batch-003'

      const fabricWithMultipleBatches = {
        name: 'Polyester Fabric',
        category: 'Polyester',
        unit: 'meter',
        batches: {
          [batch1Id]: {
            items: [{ colorName: 'Black', quantity: 15 }],
            purchaseDate: '2024-01-01',
            unitCost: 80,
            supplier: 'Supplier A',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          [batch2Id]: {
            items: [{ colorName: 'Black', quantity: 25 }],
            purchaseDate: '2024-01-10',
            unitCost: 85,
            supplier: 'Supplier B',
            createdAt: '2024-01-10T00:00:00.000Z',
          },
          [batch3Id]: {
            items: [{ colorName: 'Black', quantity: 30 }],
            purchaseDate: '2024-01-20',
            unitCost: 90,
            supplier: 'Supplier C',
            createdAt: '2024-01-20T00:00:00.000Z',
          },
        },
      }

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => fabricWithMultipleBatches,
      })

      const saleProducts = [
        {
          fabricId,
          name: 'Polyester Fabric',
          color: 'Black',
          quantity: 50, // Should take 15 from batch1, 25 from batch2, 10 from batch3
        },
      ]

      const acquireLock = jest.fn().mockResolvedValue(true)
      const releaseLock = jest.fn().mockResolvedValue(undefined)

      await fabricService.reduceInventory(saleProducts, acquireLock, releaseLock)

      // Verify all three batches were locked
      expect(acquireLock).toHaveBeenCalledWith(batch1Id)
      expect(acquireLock).toHaveBeenCalledWith(batch2Id)
      expect(acquireLock).toHaveBeenCalledWith(batch3Id)

      // Verify all locks were released
      expect(releaseLock).toHaveBeenCalledTimes(3)
    })

    test('should prevent negative stock during FIFO reduction', async () => {
      const fabricId = 'fabric-999'
      const batchId = 'batch-001'

      const fabricData = {
        name: 'Test Fabric',
        category: 'Test',
        unit: 'meter',
        batches: {
          [batchId]: {
            items: [{ colorName: 'Yellow', quantity: 10 }],
            purchaseDate: '2024-01-01',
            unitCost: 50,
            supplier: 'Supplier X',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      }

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => fabricData,
      })

      const saleProducts = [
        {
          fabricId,
          name: 'Test Fabric',
          color: 'Yellow',
          quantity: 15, // More than available
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
  })

  describe('Batch Management', () => {
    test('should update existing batch', async () => {
      const fabricId = 'fabric-111'
      const batchId = 'batch-222'

      const existingFabric = {
        name: 'Wool Fabric',
        category: 'Wool',
        unit: 'meter',
        batches: {
          [batchId]: {
            items: [{ colorName: 'Gray', quantity: 40 }],
            purchaseDate: '2024-01-01',
            unitCost: 150,
            supplier: 'Supplier D',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      }

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => existingFabric,
      })
      mockDb.update.mockResolvedValue(undefined)

      const updatedBatchData = {
        fabricId,
        items: [
          { colorName: 'Gray', quantity: 35 },
          { colorName: 'Charcoal', quantity: 20 },
        ],
        purchaseDate: '2024-01-01',
        unitCost: 150,
        supplier: 'Supplier D',
      }

      await fabricService.updateFabricBatch(fabricId, batchId, updatedBatchData)

      expect(mockDb.update).toHaveBeenCalled()
    })

    test('should reject batch update when fabric not found', async () => {
      mockDb.get.mockResolvedValue({
        exists: () => false,
      })

      const updatedBatchData = {
        fabricId: 'nonexistent',
        items: [{ colorName: 'Test', quantity: 10 }],
        purchaseDate: '2024-01-01',
        unitCost: 100,
        supplier: 'Test',
      }

      await expect(
        fabricService.updateFabricBatch('nonexistent', 'batch-123', updatedBatchData)
      ).rejects.toThrow('Fabric with ID nonexistent not found')
    })

    test('should reject batch update when batch not found', async () => {
      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          name: 'Test Fabric',
          batches: {},
        }),
      })

      const updatedBatchData = {
        fabricId: 'fabric-123',
        items: [{ colorName: 'Test', quantity: 10 }],
        purchaseDate: '2024-01-01',
        unitCost: 100,
        supplier: 'Test',
      }

      await expect(
        fabricService.updateFabricBatch('fabric-123', 'nonexistent-batch', updatedBatchData)
      ).rejects.toThrow('Batch with ID nonexistent-batch not found')
    })
  })

  describe('Inventory Statistics', () => {
    test('should calculate inventory statistics correctly', () => {
      const fabrics = [
        {
          id: 'fabric-1',
          name: 'Cotton',
          batches: {
            'batch-1': {
              items: [
                { colorName: 'Blue', quantity: 50 },
                { colorName: 'Red', quantity: 30 },
              ],
              unitCost: 100,
            },
            'batch-2': {
              items: [
                { colorName: 'Green', quantity: 5 }, // Low stock
              ],
              unitCost: 110,
            },
          },
        },
        {
          id: 'fabric-2',
          name: 'Silk',
          batches: {
            'batch-3': {
              items: [
                { colorName: 'White', quantity: 20 },
                { colorName: 'Black', quantity: 8 }, // Low stock
              ],
              unitCost: 200,
            },
          },
        },
      ]

      const stats = fabricService.calculateInventoryStats(fabrics)

      expect(stats.totalQuantity).toBe(113) // 50+30+5+20+8
      expect(stats.totalStockValue).toBe(14150) // (50+30)*100 + 5*110 + (20+8)*200
      expect(stats.lowStockItems).toBe(2) // Items with quantity < 10
      expect(stats.fabricCount).toBe(2)
    })

    test('should handle empty fabric array', () => {
      const stats = fabricService.calculateInventoryStats([])

      expect(stats.totalQuantity).toBe(0)
      expect(stats.totalStockValue).toBe(0)
      expect(stats.lowStockItems).toBe(0)
      expect(stats.fabricCount).toBe(0)
    })
  })

  describe('Concurrent Operations', () => {
    test('should handle lock acquisition failure', async () => {
      const fabricId = 'fabric-concurrent'
      const batchId = 'batch-001'

      const fabricData = {
        name: 'Test Fabric',
        category: 'Test',
        unit: 'meter',
        batches: {
          [batchId]: {
            items: [{ colorName: 'Purple', quantity: 50 }],
            purchaseDate: '2024-01-01',
            unitCost: 100,
            supplier: 'Supplier E',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      }

      mockDb.get.mockResolvedValue({
        exists: () => true,
        val: () => fabricData,
      })

      const saleProducts = [
        {
          fabricId,
          name: 'Test Fabric',
          color: 'Purple',
          quantity: 20,
        },
      ]

      // Simulate lock acquisition failure
      const acquireLock = jest.fn().mockResolvedValue(false)
      const releaseLock = jest.fn().mockResolvedValue(undefined)

      await expect(
        fabricService.reduceInventory(saleProducts, acquireLock, releaseLock)
      ).rejects.toThrow('Could not acquire lock')
    })
  })
})
