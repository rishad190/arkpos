/**
 * Property-Based Tests for Authentication Validation
 * Feature: codebase-improvements, Property 19: Firebase operations require authentication
 * Validates: Requirements 9.1
 * 
 * Property: For any Firebase operation, the system should validate that an
 * authentication token exists before executing the operation.
 */

import * as fc from 'fast-check';
import { CustomerService } from '../customerService';
import { TransactionService } from '../transactionService';
import { auth } from '@/lib/firebase';
import { AppError } from '@/lib/errors';
import { customerGenerator, transactionGenerator } from '@/__tests__/utils/generators';

// Mock Firebase modules
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  push: jest.fn(() => ({ key: 'test-key' })),
  set: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  get: jest.fn(() => Promise.resolve({ exists: () => true, val: () => ({}) })),
}));

describe('Property 19: Firebase operations require authentication', () => {
  let customerService;
  let transactionService;
  let mockDb;
  let mockLogger;
  let mockAtomicOperations;

  beforeEach(() => {
    // Reset auth state
    auth.currentUser = null;

    // Create mock dependencies
    mockDb = {};
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    mockAtomicOperations = {
      execute: jest.fn((name, fn) => fn()),
    };

    // Create service instances
    customerService = new CustomerService(mockDb, mockLogger, mockAtomicOperations);
    transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Feature: codebase-improvements, Property 19: Firebase operations require authentication
   * Validates: Requirements 9.1
   * 
   * For any Firebase operation, the system should validate that an authentication
   * token exists before executing the operation.
   */
  test('Property 19: Customer operations require authentication', () => {
    fc.assert(
      fc.asyncProperty(
        customerGenerator(),
        async (customerData) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          // Property: addCustomer should throw PERMISSION error when not authenticated
          await expect(customerService.addCustomer(customerData)).rejects.toThrow(AppError);
          await expect(customerService.addCustomer(customerData)).rejects.toThrow(
            /User must be authenticated/i
          );

          // Verify the error is of type PERMISSION
          try {
            await customerService.addCustomer(customerData);
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: Customer update operations require authentication', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        customerGenerator(),
        async (customerId, customerData) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          // Property: updateCustomer should throw PERMISSION error when not authenticated
          await expect(
            customerService.updateCustomer(customerId, customerData)
          ).rejects.toThrow(AppError);
          await expect(
            customerService.updateCustomer(customerId, customerData)
          ).rejects.toThrow(/User must be authenticated/i);

          // Verify the error is of type PERMISSION
          try {
            await customerService.updateCustomer(customerId, customerData);
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: Customer delete operations require authentication', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.array(transactionGenerator(), { maxLength: 5 }),
        async (customerId, transactions) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          // Property: deleteCustomer should throw PERMISSION error when not authenticated
          await expect(
            customerService.deleteCustomer(customerId, transactions)
          ).rejects.toThrow(AppError);
          await expect(
            customerService.deleteCustomer(customerId, transactions)
          ).rejects.toThrow(/User must be authenticated/i);

          // Verify the error is of type PERMISSION
          try {
            await customerService.deleteCustomer(customerId, transactions);
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: Customer get operations require authentication', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (customerId) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          // Property: getCustomer should throw PERMISSION error when not authenticated
          await expect(customerService.getCustomer(customerId)).rejects.toThrow(AppError);
          await expect(customerService.getCustomer(customerId)).rejects.toThrow(
            /User must be authenticated/i
          );

          // Verify the error is of type PERMISSION
          try {
            await customerService.getCustomer(customerId);
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: Transaction operations require authentication', () => {
    fc.assert(
      fc.asyncProperty(
        transactionGenerator(),
        async (transactionData) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          // Property: addTransaction should throw PERMISSION error when not authenticated
          await expect(transactionService.addTransaction(transactionData)).rejects.toThrow(
            AppError
          );
          await expect(transactionService.addTransaction(transactionData)).rejects.toThrow(
            /User must be authenticated/i
          );

          // Verify the error is of type PERMISSION
          try {
            await transactionService.addTransaction(transactionData);
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: Transaction update operations require authentication', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        transactionGenerator(),
        async (transactionId, transactionData) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          // Property: updateTransaction should throw PERMISSION error when not authenticated
          await expect(
            transactionService.updateTransaction(transactionId, transactionData)
          ).rejects.toThrow(AppError);
          await expect(
            transactionService.updateTransaction(transactionId, transactionData)
          ).rejects.toThrow(/User must be authenticated/i);

          // Verify the error is of type PERMISSION
          try {
            await transactionService.updateTransaction(transactionId, transactionData);
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: Transaction delete operations require authentication', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (transactionId) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          // Property: deleteTransaction should throw PERMISSION error when not authenticated
          await expect(transactionService.deleteTransaction(transactionId)).rejects.toThrow(
            AppError
          );
          await expect(transactionService.deleteTransaction(transactionId)).rejects.toThrow(
            /User must be authenticated/i
          );

          // Verify the error is of type PERMISSION
          try {
            await transactionService.deleteTransaction(transactionId);
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: Payment operations require authentication', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.record({
          amount: fc.float({ min: 1, max: 10000 }).map(n => Math.round(n * 100) / 100),
          date: fc.date().map(d => d.toISOString().split('T')[0]),
          paymentMethod: fc.constantFrom('cash', 'card', 'upi', 'cheque'),
          note: fc.option(fc.string({ maxLength: 100 }), { nil: '' }),
        }),
        fc.string({ minLength: 1 }),
        async (memoNumber, paymentData, customerId) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          // Property: addPaymentToMemo should throw PERMISSION error when not authenticated
          await expect(
            transactionService.addPaymentToMemo(memoNumber, paymentData, customerId)
          ).rejects.toThrow(AppError);
          await expect(
            transactionService.addPaymentToMemo(memoNumber, paymentData, customerId)
          ).rejects.toThrow(/User must be authenticated/i);

          // Verify the error is of type PERMISSION
          try {
            await transactionService.addPaymentToMemo(memoNumber, paymentData, customerId);
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: Operations succeed when authenticated', () => {
    fc.assert(
      fc.asyncProperty(
        customerGenerator(),
        async (customerData) => {
          // Set user as authenticated
          auth.currentUser = {
            uid: 'test-user-123',
            email: 'test@example.com',
          };

          // Property: Operations should NOT throw authentication errors when user is authenticated
          // Note: They may still throw validation errors, but not PERMISSION errors
          try {
            await customerService.addCustomer(customerData);
            // If it succeeds, that's good
          } catch (error) {
            // If it fails, it should NOT be a PERMISSION error
            if (error instanceof AppError) {
              expect(error.type).not.toBe('PERMISSION');
              expect(error.message).not.toMatch(/User must be authenticated/i);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 19: All authenticated operations have consistent error handling', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'addCustomer',
          'updateCustomer',
          'deleteCustomer',
          'getCustomer',
          'addTransaction',
          'updateTransaction',
          'deleteTransaction'
        ),
        async (operationType) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          let operationPromise;

          // Create appropriate operation based on type
          switch (operationType) {
            case 'addCustomer':
              operationPromise = customerService.addCustomer({ name: 'Test', phone: '1234567890' });
              break;
            case 'updateCustomer':
              operationPromise = customerService.updateCustomer('test-id', { name: 'Test', phone: '1234567890' });
              break;
            case 'deleteCustomer':
              operationPromise = customerService.deleteCustomer('test-id', []);
              break;
            case 'getCustomer':
              operationPromise = customerService.getCustomer('test-id');
              break;
            case 'addTransaction':
              operationPromise = transactionService.addTransaction({
                customerId: 'test-customer',
                total: 100,
                deposit: 50,
              });
              break;
            case 'updateTransaction':
              operationPromise = transactionService.updateTransaction('test-id', {
                customerId: 'test-customer',
                total: 100,
                deposit: 50,
              });
              break;
            case 'deleteTransaction':
              operationPromise = transactionService.deleteTransaction('test-id');
              break;
          }

          // Property: All operations should throw PERMISSION error with consistent message
          await expect(operationPromise).rejects.toThrow(AppError);
          await expect(operationPromise).rejects.toThrow(/User must be authenticated/i);

          try {
            await operationPromise;
            fail('Should have thrown an error');
          } catch (error) {
            // Property: Error should be AppError with PERMISSION type
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
            
            // Property: Error message should be consistent
            expect(error.message).toMatch(/User must be authenticated/i);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: Authentication check happens before validation', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.constant(''), // Invalid: empty name
          phone: fc.constant(''), // Invalid: empty phone
        }),
        async (invalidCustomerData) => {
          // Ensure user is NOT authenticated
          auth.currentUser = null;

          // Property: Authentication error should be thrown BEFORE validation error
          // Even though the data is invalid, we should get PERMISSION error first
          try {
            await customerService.addCustomer(invalidCustomerData);
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            // Should be PERMISSION error, not VALIDATION error
            expect(error.type).toBe('PERMISSION');
            expect(error.message).toMatch(/User must be authenticated/i);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
