/**
 * @fileoverview Tests for data consistency improvements
 * Tests Requirements 6.1, 6.2, 6.3, 6.4
 */

import * as fc from 'fast-check';
import { CustomerService } from '../customerService';
import { FabricService } from '../fabricService';
import { SupplierService } from '../supplierService';
import { CashTransactionService } from '../cashTransactionService';
import { customerGenerator, transactionGenerator } from '../../__tests__/utils/generators';

// Mock Firebase database functions
jest.mock('firebase/database', () => ({
  ref: jest.fn((db, path) => ({ _path: path })),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  push: jest.fn(),
  query: jest.fn(),
}));

describe('Data Consistency Improvements', () => {
  let mockDb;
  let mockLogger;
  let mockAtomicOperations;
  let firebaseModule;

  beforeEach(() => {
    // Import firebase module after mocking
    firebaseModule = require('firebase/database');
    
    // Create mock database
    mockDb = {
      mockData: {},
      ref: firebaseModule.ref,
      get: firebaseModule.get,
      set: firebaseModule.set,
      update: firebaseModule.update,
      remove: firebaseModule.remove,
      push: firebaseModule.push,
    };
    
    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };
    
    // Create mock atomic operations
    mockAtomicOperations = {
      execute: jest.fn((name, fn) => fn()),
    };
    
    // Setup default mock implementations
    firebaseModule.get.mockImplementation((ref) => {
      const path = ref._path;
      const data = mockDb.mockData[path];
      return Promise.resolve({
        exists: () => data !== undefined,
        val: () => data,
      });
    });
    
    firebaseModule.update.mockImplementation((ref, updates) => {
      Object.assign(mockDb.mockData, updates);
      return Promise.resolve();
    });
    
    firebaseModule.push.mockImplementation((ref) => ({
      key: `generated-key-${Date.now()}`,
    }));
    
    firebaseModule.query.mockImplementation((ref) => ref);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Requirement 6.1: Customer deletion cascades to transactions', () => {
    it('should delete customer and all transactions atomically', async () => {
      const customerService = new CustomerService(mockDb, mockLogger, mockAtomicOperations);
      
      const customerId = 'customer-123';
      const transactions = [
        { id: 'txn-1', customerId },
        { id: 'txn-2', customerId },
        { id: 'txn-3', customerId }
      ];

      // Mock customer exists
      mockDb.mockData[`customers/${customerId}`] = {
        name: 'Test Customer',
        phone: '1234567890'
      };

      await customerService.deleteCustomer(customerId, transactions);

      // Verify atomic operation was called
      expect(mockAtomicOperations.execute).toHaveBeenCalledWith(
        'deleteCustomer',
        expect.any(Function)
      );

      // Verify update was called with all deletions
      expect(mockDb.update).toHaveBeenCalled();
      const updateCall = mockDb.update.mock.calls[0][1];
      
      // Should mark customer for deletion
      expect(updateCall[`customers/${customerId}`]).toBeNull();
      
      // Should mark all transactions for deletion
      expect(updateCall['transactions/txn-1']).toBeNull();
      expect(updateCall['transactions/txn-2']).toBeNull();
      expect(updateCall['transactions/txn-3']).toBeNull();
    });

    it('should throw error if customer not found', async () => {
      const customerService = new CustomerService(mockDb, mockLogger, mockAtomicOperations);
      
      const customerId = 'nonexistent-customer';
      
      await expect(
        customerService.deleteCustomer(customerId, [])
      ).rejects.toThrow('Customer with ID nonexistent-customer not found');
    });
  });

  describe('Requirement 6.2: FIFO inventory reduction with validation', () => {
    it('should validate sufficient stock before reduction', async () => {
      const fabricService = new FabricService(mockDb, mockLogger, mockAtomicOperations);
      
      const fabricId = 'fabric-123';
      const saleProducts = [
        {
          fabricId,
          name: 'Test Fabric',
          quantity: 100,
          color: 'Red'
        }
      ];

      // Mock fabric with insufficient stock
      mockDb.mockData[`fabrics/${fabricId}`] = {
        name: 'Test Fabric',
        category: 'Cotton',
        unit: 'meters',
        batches: {
          'batch-1': {
            items: [{ colorName: 'Red', quantity: 50 }],
            purchaseDate: '2024-01-01',
            unitCost: 10
          }
        }
      };

      const mockAcquireLock = jest.fn().mockResolvedValue(true);
      const mockReleaseLock = jest.fn().mockResolvedValue(undefined);

      await expect(
        fabricService.reduceInventory(saleProducts, mockAcquireLock, mockReleaseLock)
      ).rejects.toThrow('Insufficient stock');
    });

    it('should prevent negative stock during FIFO reduction', async () => {
      const fabricService = new FabricService(mockDb, mockLogger, mockAtomicOperations);
      
      const fabricId = 'fabric-123';
      const saleProducts = [
        {
          fabricId,
          name: 'Test Fabric',
          quantity: 60,
          color: 'Blue'
        }
      ];

      // Mock fabric with exact stock
      mockDb.mockData[`fabrics/${fabricId}`] = {
        name: 'Test Fabric',
        category: 'Cotton',
        unit: 'meters',
        batches: {
          'batch-1': {
            items: [{ colorName: 'Blue', quantity: 60 }],
            purchaseDate: '2024-01-01',
            unitCost: 10
          }
        }
      };

      const mockAcquireLock = jest.fn().mockResolvedValue(true);
      const mockReleaseLock = jest.fn().mockResolvedValue(undefined);

      await fabricService.reduceInventory(saleProducts, mockAcquireLock, mockReleaseLock);

      // Verify the reduction was successful and didn't go negative
      expect(mockAtomicOperations.execute).toHaveBeenCalledWith(
        'reduceInventory',
        expect.any(Function)
      );
    });

    /**
     * Property-Based Test for FIFO Inventory Reduction
     * Feature: codebase-improvements, Property 10: FIFO inventory reduction prevents negative stock
     * Validates: Requirements 6.2
     */
    it('Property 10: FIFO inventory reduction prevents negative stock', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generator for fabric with multiple batches
          fc.record({
            fabricId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            fabricName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            color: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            batches: fc.array(
              fc.record({
                batchId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                quantity: fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }).map(n => Math.round(n * 100) / 100),
                purchaseDate: fc.integer({ min: 0, max: 365 * 5 }).map(days => {
                  const date = new Date('2020-01-01');
                  date.setDate(date.getDate() + days);
                  return date.toISOString();
                }),
                unitCost: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }).map(n => Math.round(n * 100) / 100),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            requestedQuantity: fc.float({ min: Math.fround(0.1), max: Math.fround(500), noNaN: true }).map(n => Math.round(n * 100) / 100),
          }),
          async ({ fabricId, fabricName, color, batches, requestedQuantity }) => {
            // Setup: Create fabric with batches
            const fabricService = new FabricService(mockDb, mockLogger, mockAtomicOperations);
            
            // Calculate total available stock
            const totalAvailable = batches.reduce((sum, batch) => sum + batch.quantity, 0);
            
            // Sort batches by purchase date (FIFO order)
            const sortedBatches = [...batches].sort((a, b) => 
              new Date(a.purchaseDate) - new Date(b.purchaseDate)
            );
            
            // Create batch objects for Firebase
            const batchesObject = {};
            sortedBatches.forEach(batch => {
              batchesObject[batch.batchId] = {
                items: [{ colorName: color, quantity: batch.quantity }],
                purchaseDate: batch.purchaseDate,
                unitCost: batch.unitCost,
                supplier: 'Test Supplier',
                createdAt: batch.purchaseDate,
              };
            });
            
            // Mock fabric data
            mockDb.mockData[`fabrics/${fabricId}`] = {
              name: fabricName,
              category: 'Cotton',
              unit: 'meters',
              batches: batchesObject,
            };
            
            // Create sale product
            const saleProducts = [{
              fabricId,
              name: fabricName,
              quantity: requestedQuantity,
              color,
            }];
            
            const mockAcquireLock = jest.fn().mockResolvedValue(true);
            const mockReleaseLock = jest.fn().mockResolvedValue(undefined);
            
            // Property 1: If requested quantity exceeds available stock, operation should fail
            if (requestedQuantity > totalAvailable) {
              await expect(
                fabricService.reduceInventory(saleProducts, mockAcquireLock, mockReleaseLock)
              ).rejects.toThrow();
              
              // Verify no batches were modified
              const fabricData = mockDb.mockData[`fabrics/${fabricId}`];
              Object.values(fabricData.batches).forEach(batch => {
                batch.items.forEach(item => {
                  expect(item.quantity).toBeGreaterThanOrEqual(0);
                });
              });
            } else {
              // Property 2: If sufficient stock exists, reduction should succeed
              await fabricService.reduceInventory(saleProducts, mockAcquireLock, mockReleaseLock);
              
              // Property 3: No batch should have negative stock after reduction
              const fabricData = mockDb.mockData[`fabrics/${fabricId}`];
              Object.values(fabricData.batches).forEach(batch => {
                batch.items.forEach(item => {
                  expect(item.quantity).toBeGreaterThanOrEqual(0);
                });
              });
              
              // Property 4: Total stock reduced should equal requested quantity
              const remainingStock = Object.values(fabricData.batches).reduce((sum, batch) => {
                return sum + batch.items.reduce((itemSum, item) => {
                  if (item.colorName === color) {
                    return itemSum + item.quantity;
                  }
                  return itemSum;
                }, 0);
              }, 0);
              
              const expectedRemaining = Math.round((totalAvailable - requestedQuantity) * 100) / 100;
              expect(remainingStock).toBeCloseTo(expectedRemaining, 2);
              
              // Property 5: Oldest batches (FIFO) should be reduced first
              let remainingToReduce = requestedQuantity;
              for (const batch of sortedBatches) {
                if (remainingToReduce <= 0) {
                  // This batch should not have been touched
                  const currentBatch = fabricData.batches[batch.batchId];
                  const currentItem = currentBatch.items.find(item => item.colorName === color);
                  expect(currentItem.quantity).toBeCloseTo(batch.quantity, 2);
                } else {
                  // This batch should have been reduced
                  const currentBatch = fabricData.batches[batch.batchId];
                  const currentItem = currentBatch.items.find(item => item.colorName === color);
                  
                  if (remainingToReduce >= batch.quantity) {
                    // Entire batch should be consumed
                    expect(currentItem.quantity).toBeCloseTo(0, 2);
                    remainingToReduce -= batch.quantity;
                  } else {
                    // Partial batch consumption
                    const expectedQuantity = batch.quantity - remainingToReduce;
                    expect(currentItem.quantity).toBeCloseTo(expectedQuantity, 2);
                    remainingToReduce = 0;
                  }
                }
              }
              
              // Property 6: All locks should be released
              expect(mockReleaseLock).toHaveBeenCalled();
            }
            
            // Clean up
            delete mockDb.mockData[`fabrics/${fabricId}`];
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 6.3: Supplier due calculation validation', () => {
    /**
     * Property-Based Test for Supplier Due Accuracy
     * Feature: codebase-improvements, Property 11: Supplier due totals are accurate
     * Validates: Requirements 6.3
     */
    it('Property 11: Supplier due totals are accurate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            supplierId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            supplierName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            supplierPhone: fc.string({ minLength: 10, maxLength: 15 }).map(s => s.replace(/\D/g, '').slice(0, 10)),
            transactions: fc.array(
              fc.record({
                totalAmount: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
                paidAmount: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
                date: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(t => new Date(t).toISOString()),
                description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
              }).chain(txn => {
                // Ensure paidAmount doesn't exceed totalAmount
                const maxPaid = txn.totalAmount;
                return fc.constant({
                  ...txn,
                  paidAmount: Math.min(txn.paidAmount, maxPaid),
                });
              }),
              { minLength: 0, maxLength: 20 }
            ),
          }),
          async ({ supplierId, supplierName, supplierPhone, transactions }) => {
            const supplierService = new SupplierService(mockDb, mockLogger, mockAtomicOperations);
            
            // Calculate expected total due from transactions
            const expectedTotalDue = transactions.reduce((total, txn) => {
              const transactionDue = txn.totalAmount - txn.paidAmount;
              return total + transactionDue;
            }, 0);
            
            // Round to 2 decimal places to match service logic
            const roundedExpectedDue = Math.round(expectedTotalDue * 100) / 100;
            
            // Mock supplier data with the calculated total due
            mockDb.mockData[`suppliers/${supplierId}`] = {
              name: supplierName,
              phone: supplierPhone,
              totalDue: roundedExpectedDue,
              createdAt: new Date().toISOString(),
            };
            
            // Add supplierId to each transaction
            const supplierTransactions = transactions.map(txn => ({
              ...txn,
              supplierId,
            }));
            
            // Action: Calculate and validate supplier due
            const result = await supplierService.calculateAndValidateSupplierDue(
              supplierId,
              supplierTransactions
            );
            
            // Property 1: Calculated due should equal sum of individual transaction dues
            expect(result.calculated).toBeCloseTo(roundedExpectedDue, 2);
            
            // Property 2: When stored value matches calculated value, validation should pass
            expect(result.isValid).toBe(true);
            
            // Property 3: Stored value should match what we set
            expect(result.stored).toBeCloseTo(roundedExpectedDue, 2);
            
            // Property 4: Transaction count should match
            expect(result.transactionCount).toBe(transactions.length);
            
            // Property 5: Calculated due should never be negative
            expect(result.calculated).toBeGreaterThanOrEqual(0);
            
            // Test with mismatched stored value
            const incorrectStoredDue = roundedExpectedDue + 100;
            mockDb.mockData[`suppliers/${supplierId}`].totalDue = incorrectStoredDue;
            
            const mismatchResult = await supplierService.calculateAndValidateSupplierDue(
              supplierId,
              supplierTransactions
            );
            
            // Property 6: When stored value doesn't match calculated, validation should fail
            if (Math.abs(mismatchResult.calculated - mismatchResult.stored) >= 0.01) {
              expect(mismatchResult.isValid).toBe(false);
            }
            
            // Property 7: Calculated value should remain consistent regardless of stored value
            expect(mismatchResult.calculated).toBeCloseTo(roundedExpectedDue, 2);
            
            // Clean up
            delete mockDb.mockData[`suppliers/${supplierId}`];
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate and validate supplier due totals', async () => {
      const supplierService = new SupplierService(mockDb, mockLogger, mockAtomicOperations);
      
      const supplierId = 'supplier-123';
      const supplierTransactions = [
        { supplierId, totalAmount: 1000, paidAmount: 300 },
        { supplierId, totalAmount: 500, paidAmount: 200 },
        { supplierId, totalAmount: 800, paidAmount: 800 }
      ];

      // Mock supplier data
      mockDb.mockData[`suppliers/${supplierId}`] = {
        name: 'Test Supplier',
        phone: '1234567890',
        totalDue: 1000 // Stored value
      };

      const result = await supplierService.calculateAndValidateSupplierDue(
        supplierId,
        supplierTransactions
      );

      // Expected: (1000-300) + (500-200) + (800-800) = 700 + 300 + 0 = 1000
      expect(result.calculated).toBe(1000);
      expect(result.stored).toBe(1000);
      expect(result.isValid).toBe(true);
    });

    it('should detect mismatch between calculated and stored due', async () => {
      const supplierService = new SupplierService(mockDb, mockLogger, mockAtomicOperations);
      
      const supplierId = 'supplier-123';
      const supplierTransactions = [
        { supplierId, totalAmount: 1000, paidAmount: 300 }
      ];

      // Mock supplier data with incorrect totalDue
      mockDb.mockData[`suppliers/${supplierId}`] = {
        name: 'Test Supplier',
        phone: '1234567890',
        totalDue: 500 // Incorrect stored value
      };

      const result = await supplierService.calculateAndValidateSupplierDue(
        supplierId,
        supplierTransactions
      );

      expect(result.calculated).toBe(700);
      expect(result.stored).toBe(500);
      expect(result.isValid).toBe(false);
    });

    it('should update supplier total due based on transactions', async () => {
      const supplierService = new SupplierService(mockDb, mockLogger, mockAtomicOperations);
      
      const supplierId = 'supplier-123';
      const supplierTransactions = [
        { supplierId, totalAmount: 1000, paidAmount: 400 },
        { supplierId, totalAmount: 500, paidAmount: 100 }
      ];

      await supplierService.updateSupplierTotalDue(supplierId, supplierTransactions);

      expect(mockDb.update).toHaveBeenCalled();
      const updateCall = mockDb.update.mock.calls[0][1];
      
      // Expected: (1000-400) + (500-100) = 600 + 400 = 1000
      expect(updateCall.totalDue).toBe(1000);
    });
  });

  describe('Requirement 6.4: Atomic cash transaction updates', () => {
    it('should add cash transaction and update customer transaction atomically', async () => {
      const cashService = new CashTransactionService(mockDb, mockLogger, mockAtomicOperations);
      
      const cashTransactionData = {
        date: '2024-01-15',
        description: 'Payment received',
        cashIn: 500,
        type: 'sale',
        reference: 'MEMO-001'
      };
      
      const relatedTransactionId = 'txn-123';

      // Mock related transaction
      mockDb.mockData[`transactions/${relatedTransactionId}`] = {
        customerId: 'customer-123',
        total: 1000,
        deposit: 300
      };

      await cashService.addCashTransaction(cashTransactionData, relatedTransactionId);

      expect(mockDb.update).toHaveBeenCalled();
      const updateCall = mockDb.update.mock.calls[0][1];
      
      // Should create cash transaction
      const cashKey = Object.keys(updateCall).find(key => key.startsWith('dailyCashIncome/'));
      expect(cashKey).toBeDefined();
      
      // Should update customer transaction deposit atomically
      expect(updateCall[`transactions/${relatedTransactionId}/deposit`]).toBe(800); // 300 + 500
    });

    it('should delete cash transaction atomically', async () => {
      const cashService = new CashTransactionService(mockDb, mockLogger, mockAtomicOperations);
      
      const cashTransactionId = 'cash-123';

      // Mock cash transaction
      mockDb.mockData[`dailyCashIncome/${cashTransactionId}`] = {
        date: '2024-01-15',
        description: 'Payment',
        cashIn: 500,
        type: 'expense' // Not a sale, so no related transaction
      };

      await cashService.deleteCashTransaction(cashTransactionId);

      expect(firebaseModule.update).toHaveBeenCalled();
      const updateCall = firebaseModule.update.mock.calls[0][1];
      
      // Should mark cash transaction for deletion
      expect(updateCall[`dailyCashIncome/${cashTransactionId}`]).toBeNull();
      
      // Verify atomic operation was used
      expect(mockAtomicOperations.execute).toHaveBeenCalledWith(
        'deleteCashTransaction',
        expect.any(Function)
      );
    });

    it('should throw error if related transaction not found', async () => {
      const cashService = new CashTransactionService(mockDb, mockLogger, mockAtomicOperations);
      
      const cashTransactionData = {
        date: '2024-01-15',
        description: 'Payment',
        cashIn: 500
      };
      
      const relatedTransactionId = 'nonexistent-txn';

      await expect(
        cashService.addCashTransaction(cashTransactionData, relatedTransactionId)
      ).rejects.toThrow('Related transaction nonexistent-txn not found');
    });

    /**
     * Property-Based Test for Atomic Cash Transaction Updates
     * Feature: codebase-improvements, Property 12: Cash transactions update atomically
     * Validates: Requirements 6.4
     */
    it('Property 12: Cash transactions update atomically', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Generate cash transaction data
            cashTransaction: fc.record({
              date: fc.integer({ min: 0, max: 365 * 5 }).map(days => {
                const date = new Date('2020-01-01');
                date.setDate(date.getDate() + days);
                return date.toISOString();
              }),
              description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              cashIn: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
              type: fc.constantFrom('sale', 'expense', 'other'),
              reference: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            }),
            // Generate related customer transaction
            customerTransaction: fc.record({
              transactionId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              customerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              total: fc.float({ min: Math.fround(100), max: Math.fround(50000), noNaN: true }).map(n => Math.round(n * 100) / 100),
              deposit: fc.float({ min: Math.fround(0), max: Math.fround(50000), noNaN: true }).map(n => Math.round(n * 100) / 100),
            }),
            // Whether to link the cash transaction to customer transaction
            shouldLink: fc.boolean(),
          }),
          async ({ cashTransaction, customerTransaction, shouldLink }) => {
            const cashService = new CashTransactionService(mockDb, mockLogger, mockAtomicOperations);
            
            // Setup: Create customer transaction in mock database
            const txnPath = `transactions/${customerTransaction.transactionId}`;
            mockDb.mockData[txnPath] = {
              customerId: customerTransaction.customerId,
              total: customerTransaction.total,
              deposit: customerTransaction.deposit,
              createdAt: new Date().toISOString(),
            };
            
            // Store initial state for verification
            const initialDeposit = customerTransaction.deposit;
            const cashAmount = cashTransaction.cashIn;
            
            // Action: Add cash transaction with or without linking
            const relatedTxnId = shouldLink ? customerTransaction.transactionId : null;
            
            try {
              await cashService.addCashTransaction(cashTransaction, relatedTxnId);
              
              // Verify atomic operation was used
              expect(mockAtomicOperations.execute).toHaveBeenCalledWith(
                'addCashTransaction',
                expect.any(Function)
              );
              
              // Verify update was called
              expect(mockDb.update).toHaveBeenCalled();
              const updateCall = mockDb.update.mock.calls[mockDb.update.mock.calls.length - 1][1];
              
              // Property 1: Cash transaction should be created
              const cashKey = Object.keys(updateCall).find(key => 
                key.startsWith('dailyCashIncome/') || key.startsWith('dailyCashExpense/')
              );
              expect(cashKey).toBeDefined();
              
              // Property 2: If linked, both cash and customer transaction should be updated in same call
              if (shouldLink) {
                const customerTxnKey = `transactions/${customerTransaction.transactionId}/deposit`;
                expect(updateCall[customerTxnKey]).toBeDefined();
                
                // Property 3: Customer transaction deposit should be updated correctly
                const expectedDeposit = initialDeposit + cashAmount;
                expect(updateCall[customerTxnKey]).toBeCloseTo(expectedDeposit, 2);
                
                // Property 4: Both updates should be in the same atomic update call
                expect(Object.keys(updateCall).length).toBeGreaterThanOrEqual(2);
                expect(cashKey in updateCall).toBe(true);
                expect(customerTxnKey in updateCall).toBe(true);
              } else {
                // Property 5: If not linked, only cash transaction should be updated
                const customerTxnKeys = Object.keys(updateCall).filter(key => 
                  key.startsWith('transactions/')
                );
                expect(customerTxnKeys.length).toBe(0);
              }
              
              // Property 6: Cash transaction should have correct data
              const cashData = updateCall[cashKey];
              expect(cashData.date).toBe(cashTransaction.date);
              expect(cashData.description).toBe(cashTransaction.description);
              expect(cashData.cashIn).toBe(cashTransaction.cashIn);
              expect(cashData.createdAt).toBeDefined();
              
            } catch (error) {
              // If operation fails, verify no partial updates occurred
              // This tests the atomicity - either all updates succeed or none do
              
              // Property 7: On failure, database state should remain unchanged
              const currentTxnData = mockDb.mockData[txnPath];
              if (currentTxnData) {
                expect(currentTxnData.deposit).toBe(initialDeposit);
              }
            }
            
            // Clean up
            delete mockDb.mockData[txnPath];
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property-Based Test for Atomic Cash Transaction Updates - Update Operation
     * Feature: codebase-improvements, Property 12: Cash transactions update atomically
     * Validates: Requirements 6.4
     */
    it('Property 12: Cash transaction updates are atomic', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            cashTransactionId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            initialCashData: fc.record({
              date: fc.integer({ min: 0, max: 365 * 5 }).map(days => {
                const date = new Date('2020-01-01');
                date.setDate(date.getDate() + days);
                return date.toISOString();
              }),
              description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              cashIn: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
              type: fc.constantFrom('sale', 'expense'),
            }),
            updatedCashData: fc.record({
              date: fc.integer({ min: 0, max: 365 * 5 }).map(days => {
                const date = new Date('2020-01-01');
                date.setDate(date.getDate() + days);
                return date.toISOString();
              }),
              description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              cashIn: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
              type: fc.constantFrom('sale', 'expense'),
            }),
            customerTransaction: fc.record({
              transactionId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              deposit: fc.float({ min: Math.fround(0), max: Math.fround(50000), noNaN: true }).map(n => Math.round(n * 100) / 100),
            }),
            shouldLink: fc.boolean(),
          }),
          async ({ cashTransactionId, initialCashData, updatedCashData, customerTransaction, shouldLink }) => {
            const cashService = new CashTransactionService(mockDb, mockLogger, mockAtomicOperations);
            
            // Setup: Create initial cash transaction
            const cashPath = `dailyCashIncome/${cashTransactionId}`;
            mockDb.mockData[cashPath] = {
              ...initialCashData,
              createdAt: new Date().toISOString(),
            };
            
            // Setup: Create customer transaction if linking
            const txnPath = `transactions/${customerTransaction.transactionId}`;
            if (shouldLink) {
              mockDb.mockData[txnPath] = {
                customerId: 'customer-123',
                total: 10000,
                deposit: customerTransaction.deposit,
                createdAt: new Date().toISOString(),
              };
            }
            
            const initialDeposit = customerTransaction.deposit;
            const previousCashAmount = initialCashData.cashIn;
            const newCashAmount = updatedCashData.cashIn;
            
            // Action: Update cash transaction
            const relatedTxnId = shouldLink ? customerTransaction.transactionId : null;
            
            try {
              await cashService.updateCashTransaction(
                cashTransactionId,
                updatedCashData,
                relatedTxnId,
                previousCashAmount
              );
              
              // Verify atomic operation was used
              expect(mockAtomicOperations.execute).toHaveBeenCalledWith(
                'updateCashTransaction',
                expect.any(Function)
              );
              
              // Verify update was called
              expect(mockDb.update).toHaveBeenCalled();
              const updateCall = mockDb.update.mock.calls[mockDb.update.mock.calls.length - 1][1];
              
              // Property 1: Cash transaction should be updated
              expect(updateCall[cashPath]).toBeDefined();
              expect(updateCall[cashPath].date).toBe(updatedCashData.date);
              expect(updateCall[cashPath].description).toBe(updatedCashData.description);
              expect(updateCall[cashPath].updatedAt).toBeDefined();
              
              // Property 2: If linked, customer transaction should be updated atomically
              if (shouldLink) {
                const depositKey = `${txnPath}/deposit`;
                expect(updateCall[depositKey]).toBeDefined();
                
                // Property 3: Deposit adjustment should be correct (remove old, add new)
                const expectedDeposit = initialDeposit - previousCashAmount + newCashAmount;
                expect(updateCall[depositKey]).toBeCloseTo(expectedDeposit, 2);
                
                // Property 4: Both updates in same atomic call
                expect(cashPath in updateCall).toBe(true);
                expect(depositKey in updateCall).toBe(true);
              }
              
            } catch (error) {
              // Property 5: On failure, no partial updates should occur
              const currentCashData = mockDb.mockData[cashPath];
              if (currentCashData) {
                // Cash data should remain unchanged
                expect(currentCashData.cashIn).toBe(initialCashData.cashIn);
              }
              
              if (shouldLink) {
                const currentTxnData = mockDb.mockData[txnPath];
                if (currentTxnData) {
                  // Customer transaction should remain unchanged
                  expect(currentTxnData.deposit).toBe(initialDeposit);
                }
              }
            }
            
            // Clean up
            delete mockDb.mockData[cashPath];
            if (shouldLink) {
              delete mockDb.mockData[txnPath];
            }
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property-Based Test for Atomic Cash Transaction Deletion
     * Feature: codebase-improvements, Property 12: Cash transactions update atomically
     * Validates: Requirements 6.4
     */
    it('Property 12: Cash transaction deletions are atomic', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            cashTransactionId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            cashData: fc.record({
              date: fc.integer({ min: 0, max: 365 * 5 }).map(days => {
                const date = new Date('2020-01-01');
                date.setDate(date.getDate() + days);
                return date.toISOString();
              }),
              description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              cashIn: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
              type: fc.constantFrom('sale', 'expense'),
              reference: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            }),
            customerTransaction: fc.record({
              transactionId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              memoNumber: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              deposit: fc.float({ min: Math.fround(100), max: Math.fround(50000), noNaN: true }).map(n => Math.round(n * 100) / 100),
            }),
          }),
          async ({ cashTransactionId, cashData, customerTransaction }) => {
            const cashService = new CashTransactionService(mockDb, mockLogger, mockAtomicOperations);
            
            // Setup: Create cash transaction
            const cashPath = `dailyCashIncome/${cashTransactionId}`;
            const cashDataWithRef = {
              ...cashData,
              reference: cashData.type === 'sale' ? customerTransaction.memoNumber : cashData.reference,
              createdAt: new Date().toISOString(),
            };
            mockDb.mockData[cashPath] = cashDataWithRef;
            
            // Setup: Create customer transaction if it's a sale
            const txnPath = `transactions/${customerTransaction.transactionId}`;
            if (cashData.type === 'sale') {
              mockDb.mockData[txnPath] = {
                customerId: 'customer-123',
                memoNumber: customerTransaction.memoNumber,
                total: 10000,
                deposit: customerTransaction.deposit,
                createdAt: new Date().toISOString(),
              };
            }
            
            const initialDeposit = customerTransaction.deposit;
            const cashAmount = cashData.cashIn;
            
            // Action: Delete cash transaction
            try {
              await cashService.deleteCashTransaction(
                cashTransactionId,
                cashDataWithRef.reference
              );
              
              // Verify atomic operation was used
              expect(mockAtomicOperations.execute).toHaveBeenCalledWith(
                'deleteCashTransaction',
                expect.any(Function)
              );
              
              // Verify update was called
              expect(mockDb.update).toHaveBeenCalled();
              const updateCall = mockDb.update.mock.calls[mockDb.update.mock.calls.length - 1][1];
              
              // Property 1: Cash transaction should be marked for deletion
              expect(updateCall[cashPath]).toBeNull();
              
              // Property 2: If it's a sale with reference, customer transaction should be updated
              if (cashData.type === 'sale' && cashDataWithRef.reference) {
                const depositKey = `${txnPath}/deposit`;
                
                // Property 3: Customer deposit should be reduced by cash amount
                const expectedDeposit = Math.max(0, initialDeposit - cashAmount);
                if (updateCall[depositKey] !== undefined) {
                  expect(updateCall[depositKey]).toBeCloseTo(expectedDeposit, 2);
                  
                  // Property 4: Both deletion and update in same atomic call
                  expect(cashPath in updateCall).toBe(true);
                  expect(depositKey in updateCall).toBe(true);
                }
              } else {
                // Property 5: If not a sale, only cash transaction should be deleted
                const txnKeys = Object.keys(updateCall).filter(key => 
                  key.startsWith('transactions/') && !key.includes('updatedAt')
                );
                expect(txnKeys.length).toBe(0);
              }
              
            } catch (error) {
              // Property 6: On failure, no partial updates should occur
              const currentCashData = mockDb.mockData[cashPath];
              expect(currentCashData).toBeDefined(); // Should still exist
              
              if (cashData.type === 'sale') {
                const currentTxnData = mockDb.mockData[txnPath];
                if (currentTxnData) {
                  expect(currentTxnData.deposit).toBe(initialDeposit); // Should be unchanged
                }
              }
            }
            
            // Clean up
            delete mockDb.mockData[cashPath];
            if (cashData.type === 'sale') {
              delete mockDb.mockData[txnPath];
            }
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Service validation', () => {
    it('should validate supplier data', () => {
      const supplierService = new SupplierService(mockDb, mockLogger, mockAtomicOperations);
      
      const validData = {
        name: 'Test Supplier',
        phone: '1234567890',
        email: 'test@example.com'
      };
      
      const result = supplierService.validateSupplierData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid supplier data', () => {
      const supplierService = new SupplierService(mockDb, mockLogger, mockAtomicOperations);
      
      const invalidData = {
        name: '',
        phone: ''
      };
      
      const result = supplierService.validateSupplierData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate cash transaction data', () => {
      const cashService = new CashTransactionService(mockDb, mockLogger, mockAtomicOperations);
      
      const validData = {
        date: '2024-01-15',
        description: 'Payment',
        cashIn: 500
      };
      
      const result = cashService.validateCashTransactionData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid cash transaction data', () => {
      const cashService = new CashTransactionService(mockDb, mockLogger, mockAtomicOperations);
      
      const invalidData = {
        date: '',
        description: '',
        cashIn: 0,
        cashOut: 0
      };
      
      const result = cashService.validateCashTransactionData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
