/**
 * Integration Tests: Customer Lifecycle
 * Tests complete customer lifecycle with Firebase operations
 * 
 * Requirements: 1.1, 6.5
 */

import { CustomerService } from '@/services/customerService'
import { TransactionService } from '@/services/transactionService'
import { AtomicOperationService } from '@/services/atomicOperations'
import logger from '@/utils/logger'

// Mock Firebase database functions
import { ref, get, set, update, remove, push } from 'firebase/database'

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  push: jest.fn(),
}))

const mockDb = {}

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

describe('Integration: Customer Lifecycle', () => {
  let customerService
  let transactionService
  let atomicOperations

  beforeEach(() => {
    jest.clearAllMocks()
    atomicOperations = new AtomicOperationService(mockDispatch, mockGetState)
    customerService = new CustomerService(mockDb, logger, atomicOperations)
    transactionService = new TransactionService(mockDb, logger, atomicOperations)
  })

  describe('Complete Customer Lifecycle', () => {
    test('should create customer, add transactions, make payments, and delete customer', async () => {
      // Step 1: Create customer
      const customerData = {
        name: 'John Doe',
        phone: '1234567890',
        address: '123 Main St',
        email: 'john@example.com',
      }

      const mockCustomerRef = {
        key: 'customer-123',
      }

      ref.mockReturnValue({})
      push.mockReturnValue(mockCustomerRef)
      set.mockResolvedValue(undefined)

      const customerId = await customerService.addCustomer(customerData)
      expect(customerId).toBe('customer-123')
      expect(mockDb.set).toHaveBeenCalled()

      // Step 2: Add sale transaction
      const saleData = {
        customerId: 'customer-123',
        memoNumber: 'MEMO-001',
        type: 'sale',
        total: 1000,
        deposit: 300,
        date: '2024-01-15',
        products: [
          {
            fabricId: 'fabric-1',
            fabricName: 'Cotton',
            colorName: 'Blue',
            quantity: 10,
            rate: 100,
            amount: 1000,
          },
        ],
      }

      const mockTransactionRef = {
        key: 'txn-001',
      }

      push.mockReturnValue(mockTransactionRef)
      const transactionId = await transactionService.addTransaction(saleData)
      expect(transactionId).toBe('txn-001')

      // Step 3: Add payment transaction
      const paymentData = {
        amount: 400,
        date: '2024-01-20',
        paymentMethod: 'cash',
        note: 'Partial payment',
      }

      const mockPaymentRef = {
        key: 'txn-002',
      }

      push.mockReturnValue(mockPaymentRef)
      const paymentId = await transactionService.addPaymentToMemo(
        'MEMO-001',
        paymentData,
        'customer-123'
      )
      expect(paymentId).toBe('txn-002')

      // Step 4: Verify memo details
      const allTransactions = [
        {
          id: 'txn-001',
          customerId: 'customer-123',
          memoNumber: 'MEMO-001',
          type: 'sale',
          total: 1000,
          deposit: 300,
          date: '2024-01-15',
        },
        {
          id: 'txn-002',
          customerId: 'customer-123',
          memoNumber: 'MEMO-001',
          type: 'payment',
          amount: 400,
          deposit: 400,
          date: '2024-01-20',
        },
      ]

      const memoDetails = transactionService.getMemoDetails('MEMO-001', allTransactions)
      expect(memoDetails).not.toBeNull()
      expect(memoDetails.totalAmount).toBe(1000)
      expect(memoDetails.totalPaid).toBe(700)
      expect(memoDetails.remainingDue).toBe(300)
      expect(memoDetails.status).toBe('partial')

      // Step 5: Delete customer (cascade delete transactions)
      get.mockResolvedValue({
        exists: () => true,
        val: () => customerData,
      })
      update.mockResolvedValue(undefined)

      await customerService.deleteCustomer('customer-123', allTransactions)
      
      // Verify atomic deletion
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'customers/customer-123': null,
          'transactions/txn-001': null,
          'transactions/txn-002': null,
        })
      )
    })

    test('should handle customer with multiple memos', async () => {
      const customerId = 'customer-456'
      
      const allTransactions = [
        // Memo 1
        {
          id: 'txn-101',
          customerId,
          memoNumber: 'MEMO-101',
          type: 'sale',
          total: 500,
          deposit: 200,
          date: '2024-01-10',
        },
        {
          id: 'txn-102',
          customerId,
          memoNumber: 'MEMO-101',
          type: 'payment',
          amount: 150,
          deposit: 150,
          date: '2024-01-15',
        },
        // Memo 2
        {
          id: 'txn-201',
          customerId,
          memoNumber: 'MEMO-102',
          type: 'sale',
          total: 800,
          deposit: 800,
          date: '2024-01-20',
        },
        // Memo 3
        {
          id: 'txn-301',
          customerId,
          memoNumber: 'MEMO-103',
          type: 'sale',
          total: 1200,
          deposit: 0,
          date: '2024-01-25',
        },
      ]

      // Get memos grouped by memo number
      const memoGroups = transactionService.getCustomerTransactionsByMemo(
        customerId,
        allTransactions
      )

      expect(memoGroups).toHaveLength(3)
      
      // Verify Memo 1 (partial payment)
      const memo1 = memoGroups.find(m => m.memoNumber === 'MEMO-101')
      expect(memo1.totalAmount).toBe(500)
      expect(memo1.paidAmount).toBe(350)
      expect(memo1.dueAmount).toBe(150)
      expect(memo1.status).toBe('partial')
      expect(memo1.paymentTransactions).toHaveLength(1)

      // Verify Memo 2 (fully paid)
      const memo2 = memoGroups.find(m => m.memoNumber === 'MEMO-102')
      expect(memo2.totalAmount).toBe(800)
      expect(memo2.paidAmount).toBe(800)
      expect(memo2.dueAmount).toBe(0)
      expect(memo2.status).toBe('paid')

      // Verify Memo 3 (unpaid)
      const memo3 = memoGroups.find(m => m.memoNumber === 'MEMO-103')
      expect(memo3.totalAmount).toBe(1200)
      expect(memo3.paidAmount).toBe(0)
      expect(memo3.dueAmount).toBe(1200)
      expect(memo3.status).toBe('unpaid')

      // Calculate total customer due
      const totalDue = transactionService.calculateCustomerTotalDue(
        customerId,
        allTransactions
      )
      expect(totalDue).toBe(1350) // 150 + 0 + 1200
    })

    test('should handle customer deletion when customer not found', async () => {
      get.mockResolvedValue({
        exists: () => false,
      })

      await expect(
        customerService.deleteCustomer('nonexistent-customer', [])
      ).rejects.toThrow('Customer with ID nonexistent-customer not found')
    })
  })

  describe('Customer Due Calculations', () => {
    test('should calculate customer due across multiple transactions', () => {
      const transactions = [
        { customerId: 'cust-1', total: 1000, deposit: 300 },
        { customerId: 'cust-1', total: 500, deposit: 500 },
        { customerId: 'cust-1', total: 800, deposit: 200 },
        { customerId: 'cust-2', total: 600, deposit: 100 },
      ]

      const customer1Due = customerService.calculateCustomerDue('cust-1', transactions)
      expect(customer1Due).toBe(1300) // (1000-300) + (500-500) + (800-200)

      const customer2Due = customerService.calculateCustomerDue('cust-2', transactions)
      expect(customer2Due).toBe(500) // (600-100)
    })

    test('should return zero due for customer with no transactions', () => {
      const transactions = []
      const due = customerService.calculateCustomerDue('cust-1', transactions)
      expect(due).toBe(0)
    })
  })

  describe('Transaction Statistics', () => {
    test('should calculate transaction statistics correctly', () => {
      const transactions = [
        { total: 1000, deposit: 300 },
        { total: 500, deposit: 500 },
        { total: 800, deposit: 200 },
      ]

      const stats = transactionService.calculateTransactionStats(transactions)
      
      expect(stats.totalRevenue).toBe(2300)
      expect(stats.totalDeposits).toBe(1000)
      expect(stats.totalDue).toBe(1300)
      expect(stats.transactionCount).toBe(3)
    })

    test('should handle empty transaction array', () => {
      const stats = transactionService.calculateTransactionStats([])
      
      expect(stats.totalRevenue).toBe(0)
      expect(stats.totalDeposits).toBe(0)
      expect(stats.totalDue).toBe(0)
      expect(stats.transactionCount).toBe(0)
    })
  })

  describe('Transaction Filtering', () => {
    test('should filter transactions by date range', () => {
      const transactions = [
        { id: '1', date: '2024-01-10', total: 100 },
        { id: '2', date: '2024-01-15', total: 200 },
        { id: '3', date: '2024-01-20', total: 300 },
        { id: '4', date: '2024-01-25', total: 400 },
      ]

      const startDate = new Date('2024-01-12')
      const endDate = new Date('2024-01-22')

      const filtered = transactionService.filterTransactionsByDate(
        transactions,
        startDate,
        endDate
      )

      expect(filtered).toHaveLength(2)
      expect(filtered[0].id).toBe('2')
      expect(filtered[1].id).toBe('3')
    })

    test('should filter transactions by customer', () => {
      const transactions = [
        { id: '1', customerId: 'cust-1', total: 100 },
        { id: '2', customerId: 'cust-2', total: 200 },
        { id: '3', customerId: 'cust-1', total: 300 },
        { id: '4', customerId: 'cust-3', total: 400 },
      ]

      const filtered = transactionService.getTransactionsByCustomer(
        transactions,
        'cust-1'
      )

      expect(filtered).toHaveLength(2)
      expect(filtered[0].id).toBe('1')
      expect(filtered[1].id).toBe('3')
    })
  })
})
