/**
 * Tests for service validation methods
 */

import * as fc from 'fast-check';
import { CustomerService } from '../customerService';
import { FabricService } from '../fabricService';
import { TransactionService } from '../transactionService';

// Mock dependencies
const mockDb = {};
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
const mockAtomicOperations = {
  execute: jest.fn((name, fn) => fn()),
};

describe('Service Validation', () => {
  describe('CustomerService validation', () => {
    let customerService;

    beforeEach(() => {
      customerService = new CustomerService(mockDb, mockLogger, mockAtomicOperations);
    });

    it('should return valid result for valid customer data', () => {
      const validData = {
        name: 'John Doe',
        phone: '1234567890',
      };

      const result = customerService.validateCustomerData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return field-level error for missing name', () => {
      const invalidData = {
        phone: '1234567890',
      };

      const result = customerService.validateCustomerData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].message).toContain('required');
    });

    it('should return field-level error for missing phone', () => {
      const invalidData = {
        name: 'John Doe',
      };

      const result = customerService.validateCustomerData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('phone');
      expect(result.errors[0].message).toContain('required');
    });

    it('should return multiple field-level errors', () => {
      const invalidData = {};

      const result = customerService.validateCustomerData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      
      const fields = result.errors.map(e => e.field);
      expect(fields).toContain('name');
      expect(fields).toContain('phone');
    });

    it('should validate phone number format', () => {
      const invalidData = {
        name: 'John Doe',
        phone: '123', // Too short
      };

      const result = customerService.validateCustomerData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'phone')).toBe(true);
    });

    it('should validate email format if provided', () => {
      const invalidData = {
        name: 'John Doe',
        phone: '1234567890',
        email: 'notanemail',
      };

      const result = customerService.validateCustomerData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email')).toBe(true);
    });

    it('should validate name length', () => {
      const invalidData = {
        name: 'a'.repeat(101), // Too long
        phone: '1234567890',
      };

      const result = customerService.validateCustomerData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });
  });

  describe('FabricService validation', () => {
    let fabricService;

    beforeEach(() => {
      fabricService = new FabricService(mockDb, mockLogger, mockAtomicOperations);
    });

    it('should return valid result for valid fabric data', () => {
      const validData = {
        name: 'Cotton',
        category: 'Natural',
        unit: 'meters',
      };

      const result = fabricService.validateFabricData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return field-level errors for missing required fields', () => {
      const invalidData = {};

      const result = fabricService.validateFabricData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      
      const fields = result.errors.map(e => e.field);
      expect(fields).toContain('name');
      expect(fields).toContain('category');
      expect(fields).toContain('unit');
    });

    it('should validate batch data with items', () => {
      const validBatchData = {
        fabricId: 'fabric123',
        items: [
          { colorName: 'Red', quantity: 10 },
          { colorName: 'Blue', quantity: 5 },
        ],
      };

      const result = fabricService.validateBatchData(validBatchData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing fabricId in batch', () => {
      const invalidBatchData = {
        items: [{ colorName: 'Red', quantity: 10 }],
      };

      const result = fabricService.validateBatchData(invalidBatchData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'fabricId')).toBe(true);
    });

    it('should return error for empty items array', () => {
      const invalidBatchData = {
        fabricId: 'fabric123',
        items: [],
      };

      const result = fabricService.validateBatchData(invalidBatchData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'items')).toBe(true);
    });

    it('should validate individual items in batch', () => {
      const invalidBatchData = {
        fabricId: 'fabric123',
        items: [
          { colorName: '', quantity: 10 }, // Missing color name
          { colorName: 'Blue', quantity: -5 }, // Negative quantity
        ],
      };

      const result = fabricService.validateBatchData(invalidBatchData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check for item-specific errors
      const itemErrors = result.errors.filter(e => e.field.startsWith('items['));
      expect(itemErrors.length).toBeGreaterThan(0);
    });
  });

  describe('TransactionService validation', () => {
    let transactionService;

    beforeEach(() => {
      transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
    });

    it('should return valid result for valid transaction data', () => {
      const validData = {
        customerId: 'customer123',
        total: 100,
        deposit: 50,
      };

      const result = transactionService.validateTransactionData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing customerId', () => {
      const invalidData = {
        total: 100,
        deposit: 50,
      };

      const result = transactionService.validateTransactionData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'customerId')).toBe(true);
    });

    it('should return error when both total and deposit are zero or negative', () => {
      const invalidData = {
        customerId: 'customer123',
        total: 0,
        deposit: 0,
      };

      const result = transactionService.validateTransactionData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'total')).toBe(true);
    });

    it('should validate that deposit does not exceed total', () => {
      const invalidData = {
        customerId: 'customer123',
        total: 100,
        deposit: 150, // Exceeds total
      };

      const result = transactionService.validateTransactionData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'deposit' && e.message.includes('exceed'))).toBe(true);
    });

    it('should allow transaction with only total', () => {
      const validData = {
        customerId: 'customer123',
        total: 100,
        deposit: 0,
      };

      const result = transactionService.validateTransactionData(validData);
      expect(result.isValid).toBe(true);
    });

    it('should allow transaction with only deposit (payment)', () => {
      const validData = {
        customerId: 'customer123',
        total: 0,
        deposit: 50,
      };

      const result = transactionService.validateTransactionData(validData);
      expect(result.isValid).toBe(true);
    });

    it('should validate negative amounts', () => {
      const invalidData = {
        customerId: 'customer123',
        total: -100,
        deposit: 50,
      };

      const result = transactionService.validateTransactionData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'total')).toBe(true);
    });
  });
});

/**
 * Property-Based Tests
 * Feature: codebase-improvements, Property 1: Validation errors identify invalid fields
 * Validates: Requirements 2.1
 */
describe('Property-Based Tests', () => {
  describe('Property 1: Validation errors identify invalid fields', () => {
    let customerService;
    let fabricService;
    let transactionService;

    beforeEach(() => {
      customerService = new CustomerService(mockDb, mockLogger, mockAtomicOperations);
      fabricService = new FabricService(mockDb, mockLogger, mockAtomicOperations);
      transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
    });

    /**
     * Generator for invalid customer data
     * Creates customer objects with at least one invalid field
     */
    const invalidCustomerGenerator = () => {
      return fc.oneof(
        // Missing name
        fc.record({
          name: fc.constant(undefined),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
        }),
        // Empty name
        fc.record({
          name: fc.constant(''),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
        }),
        // Whitespace-only name
        fc.record({
          name: fc.constant('   '),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
        }),
        // Name too long
        fc.record({
          name: fc.string({ minLength: 101, maxLength: 200 }),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
        }),
        // Missing phone
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone: fc.constant(undefined),
        }),
        // Empty phone
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone: fc.constant(''),
        }),
        // Phone too short
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone: fc.string({ minLength: 1, maxLength: 9 }),
        }),
        // Invalid email
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          email: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@')),
        }),
        // Multiple invalid fields
        fc.record({
          name: fc.constant(''),
          phone: fc.constant(''),
        })
      );
    };

    /**
     * Generator for invalid fabric data
     * Creates fabric objects with at least one invalid field
     */
    const invalidFabricGenerator = () => {
      return fc.oneof(
        // Missing name
        fc.record({
          name: fc.constant(undefined),
          category: fc.string({ minLength: 1, maxLength: 50 }),
          unit: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        // Empty name
        fc.record({
          name: fc.constant(''),
          category: fc.string({ minLength: 1, maxLength: 50 }),
          unit: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        // Missing category
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          category: fc.constant(undefined),
          unit: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        // Missing unit
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          category: fc.string({ minLength: 1, maxLength: 50 }),
          unit: fc.constant(undefined),
        }),
        // Name too long
        fc.record({
          name: fc.string({ minLength: 101, maxLength: 200 }),
          category: fc.string({ minLength: 1, maxLength: 50 }),
          unit: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        // Multiple invalid fields
        fc.record({
          name: fc.constant(''),
          category: fc.constant(''),
          unit: fc.constant(''),
        })
      );
    };

    /**
     * Generator for invalid transaction data
     * Creates transaction objects with at least one invalid field
     */
    const invalidTransactionGenerator = () => {
      return fc.oneof(
        // Missing customerId
        fc.record({
          customerId: fc.constant(undefined),
          total: fc.float({ min: 1, max: 10000, noNaN: true }),
          deposit: fc.float({ min: 0, max: 10000, noNaN: true }),
        }),
        // Empty customerId
        fc.record({
          customerId: fc.constant(''),
          total: fc.float({ min: 1, max: 10000, noNaN: true }),
          deposit: fc.float({ min: 0, max: 10000, noNaN: true }),
        }),
        // Both total and deposit are zero
        fc.record({
          customerId: fc.string({ minLength: 1 }),
          total: fc.constant(0),
          deposit: fc.constant(0),
        }),
        // Negative total
        fc.record({
          customerId: fc.string({ minLength: 1 }),
          total: fc.float({ min: -10000, max: -1, noNaN: true }),
          deposit: fc.float({ min: 0, max: 100, noNaN: true }),
        }),
        // Negative deposit
        fc.record({
          customerId: fc.string({ minLength: 1 }),
          total: fc.float({ min: 1, max: 10000, noNaN: true }),
          deposit: fc.float({ min: -1000, max: -1, noNaN: true }),
        }),
        // Deposit exceeds total
        fc.record({
          customerId: fc.string({ minLength: 1 }),
          total: fc.float({ min: 1, max: 100, noNaN: true }),
          deposit: fc.float({ min: 101, max: 1000, noNaN: true }),
        })
      );
    };

    /**
     * Generator for invalid batch data
     * Creates batch objects with at least one invalid field
     */
    const invalidBatchGenerator = () => {
      return fc.oneof(
        // Missing fabricId
        fc.record({
          fabricId: fc.constant(undefined),
          items: fc.array(
            fc.record({
              colorName: fc.string({ minLength: 1 }),
              quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        // Empty items array
        fc.record({
          fabricId: fc.string({ minLength: 1 }),
          items: fc.constant([]),
        }),
        // Items with missing colorName
        fc.record({
          fabricId: fc.string({ minLength: 1 }),
          items: fc.array(
            fc.record({
              colorName: fc.constant(''),
              quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
        }),
        // Items with negative quantity
        fc.record({
          fabricId: fc.string({ minLength: 1 }),
          items: fc.array(
            fc.record({
              colorName: fc.string({ minLength: 1 }),
              quantity: fc.float({ min: Math.fround(-100), max: Math.fround(-0.1), noNaN: true }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
        })
      );
    };

    it('should identify invalid fields in customer data', () => {
      fc.assert(
        fc.property(invalidCustomerGenerator(), (invalidData) => {
          const result = customerService.validateCustomerData(invalidData);

          // Property: validation should fail for invalid data
          expect(result.isValid).toBe(false);

          // Property: errors array should not be empty
          expect(result.errors.length).toBeGreaterThan(0);

          // Property: each error should have a field and message
          result.errors.forEach((error) => {
            expect(error).toHaveProperty('field');
            expect(error).toHaveProperty('message');
            expect(typeof error.field).toBe('string');
            expect(typeof error.message).toBe('string');
            expect(error.field.length).toBeGreaterThan(0);
            expect(error.message.length).toBeGreaterThan(0);
          });

          // Property: error fields should correspond to actual invalid fields
          const errorFields = result.errors.map(e => e.field);
          
          // Check if the identified fields are actually invalid
          if (!invalidData.name || invalidData.name.trim() === '' || invalidData.name.length > 100) {
            expect(errorFields).toContain('name');
          }
          
          if (!invalidData.phone || invalidData.phone.replace(/\D/g, '').length < 10) {
            expect(errorFields).toContain('phone');
          }
          
          if (invalidData.email && !invalidData.email.includes('@')) {
            expect(errorFields).toContain('email');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should identify invalid fields in fabric data', () => {
      fc.assert(
        fc.property(invalidFabricGenerator(), (invalidData) => {
          const result = fabricService.validateFabricData(invalidData);

          // Property: validation should fail for invalid data
          expect(result.isValid).toBe(false);

          // Property: errors array should not be empty
          expect(result.errors.length).toBeGreaterThan(0);

          // Property: each error should have a field and message
          result.errors.forEach((error) => {
            expect(error).toHaveProperty('field');
            expect(error).toHaveProperty('message');
            expect(typeof error.field).toBe('string');
            expect(typeof error.message).toBe('string');
            expect(error.field.length).toBeGreaterThan(0);
            expect(error.message.length).toBeGreaterThan(0);
          });

          // Property: error fields should correspond to actual invalid fields
          const errorFields = result.errors.map(e => e.field);
          
          if (!invalidData.name || invalidData.name.trim() === '' || invalidData.name.length > 100) {
            expect(errorFields).toContain('name');
          }
          
          if (!invalidData.category || invalidData.category.trim() === '' || invalidData.category.length > 50) {
            expect(errorFields).toContain('category');
          }
          
          if (!invalidData.unit || invalidData.unit.trim() === '' || invalidData.unit.length > 20) {
            expect(errorFields).toContain('unit');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should identify invalid fields in transaction data', () => {
      fc.assert(
        fc.property(invalidTransactionGenerator(), (invalidData) => {
          const result = transactionService.validateTransactionData(invalidData);

          // Property: validation should fail for invalid data
          expect(result.isValid).toBe(false);

          // Property: errors array should not be empty
          expect(result.errors.length).toBeGreaterThan(0);

          // Property: each error should have a field and message
          result.errors.forEach((error) => {
            expect(error).toHaveProperty('field');
            expect(error).toHaveProperty('message');
            expect(typeof error.field).toBe('string');
            expect(typeof error.message).toBe('string');
            expect(error.field.length).toBeGreaterThan(0);
            expect(error.message.length).toBeGreaterThan(0);
          });

          // Property: error fields should correspond to actual invalid fields
          const errorFields = result.errors.map(e => e.field);
          
          if (!invalidData.customerId || invalidData.customerId.trim() === '') {
            expect(errorFields).toContain('customerId');
          }
          
          const total = invalidData.total || 0;
          const deposit = invalidData.deposit || 0;
          
          if (total < 0) {
            expect(errorFields).toContain('total');
          }
          
          if (deposit < 0) {
            expect(errorFields).toContain('deposit');
          }
          
          if (total <= 0 && deposit <= 0) {
            expect(errorFields.some(f => f === 'total' || f === 'deposit')).toBe(true);
          }
          
          if (total > 0 && deposit > total) {
            expect(errorFields).toContain('deposit');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should identify invalid fields in batch data', () => {
      fc.assert(
        fc.property(invalidBatchGenerator(), (invalidData) => {
          const result = fabricService.validateBatchData(invalidData);

          // Property: validation should fail for invalid data
          expect(result.isValid).toBe(false);

          // Property: errors array should not be empty
          expect(result.errors.length).toBeGreaterThan(0);

          // Property: each error should have a field and message
          result.errors.forEach((error) => {
            expect(error).toHaveProperty('field');
            expect(error).toHaveProperty('message');
            expect(typeof error.field).toBe('string');
            expect(typeof error.message).toBe('string');
            expect(error.field.length).toBeGreaterThan(0);
            expect(error.message.length).toBeGreaterThan(0);
          });

          // Property: error fields should correspond to actual invalid fields
          const errorFields = result.errors.map(e => e.field);
          
          if (!invalidData.fabricId || invalidData.fabricId.trim() === '') {
            expect(errorFields).toContain('fabricId');
          }
          
          if (!Array.isArray(invalidData.items) || invalidData.items.length === 0) {
            expect(errorFields).toContain('items');
          } else {
            // Check for item-specific errors
            invalidData.items.forEach((item, index) => {
              if (!item.colorName || item.colorName.trim() === '') {
                expect(errorFields.some(f => f.startsWith(`items[${index}]`))).toBe(true);
              }
              if (item.quantity < 0) {
                expect(errorFields.some(f => f.startsWith(`items[${index}]`))).toBe(true);
              }
            });
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Invalid input prevents submission
   * Feature: codebase-improvements, Property 5: Invalid input prevents submission
   * Validates: Requirements 2.5
   */
  describe('Property 5: Invalid input prevents submission', () => {
    let customerService;
    let fabricService;
    let transactionService;

    beforeEach(() => {
      customerService = new CustomerService(mockDb, mockLogger, mockAtomicOperations);
      fabricService = new FabricService(mockDb, mockLogger, mockAtomicOperations);
      transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
    });

    /**
     * Generator for invalid customer data
     * Creates customer objects with at least one invalid field
     */
    const invalidCustomerGenerator = () => {
      return fc.oneof(
        // Missing name
        fc.record({
          name: fc.constant(undefined),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
        }),
        // Empty name
        fc.record({
          name: fc.constant(''),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
        }),
        // Whitespace-only name
        fc.record({
          name: fc.constant('   '),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
        }),
        // Name too long
        fc.record({
          name: fc.string({ minLength: 101, maxLength: 200 }),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
        }),
        // Missing phone
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone: fc.constant(undefined),
        }),
        // Empty phone
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone: fc.constant(''),
        }),
        // Phone too short
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone: fc.string({ minLength: 1, maxLength: 9 }),
        }),
        // Invalid email
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          email: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@')),
        })
      );
    };

    /**
     * Generator for invalid fabric data
     * Creates fabric objects with at least one invalid field
     */
    const invalidFabricGenerator = () => {
      return fc.oneof(
        // Missing name
        fc.record({
          name: fc.constant(undefined),
          category: fc.string({ minLength: 1, maxLength: 50 }),
          unit: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        // Empty name
        fc.record({
          name: fc.constant(''),
          category: fc.string({ minLength: 1, maxLength: 50 }),
          unit: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        // Missing category
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          category: fc.constant(undefined),
          unit: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        // Missing unit
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          category: fc.string({ minLength: 1, maxLength: 50 }),
          unit: fc.constant(undefined),
        })
      );
    };

    /**
     * Generator for invalid transaction data
     * Creates transaction objects with at least one invalid field
     */
    const invalidTransactionGenerator = () => {
      return fc.oneof(
        // Missing customerId
        fc.record({
          customerId: fc.constant(undefined),
          total: fc.float({ min: 1, max: 10000, noNaN: true }),
          deposit: fc.float({ min: 0, max: 10000, noNaN: true }),
        }),
        // Empty customerId
        fc.record({
          customerId: fc.constant(''),
          total: fc.float({ min: 1, max: 10000, noNaN: true }),
          deposit: fc.float({ min: 0, max: 10000, noNaN: true }),
        }),
        // Both total and deposit are zero
        fc.record({
          customerId: fc.string({ minLength: 1 }),
          total: fc.constant(0),
          deposit: fc.constant(0),
        }),
        // Negative total
        fc.record({
          customerId: fc.string({ minLength: 1 }),
          total: fc.float({ min: -10000, max: -1, noNaN: true }),
          deposit: fc.float({ min: 0, max: 100, noNaN: true }),
        }),
        // Deposit exceeds total
        fc.record({
          customerId: fc.string({ minLength: 1 }),
          total: fc.float({ min: 1, max: 100, noNaN: true }),
          deposit: fc.float({ min: 101, max: 1000, noNaN: true }),
        })
      );
    };

    it('should prevent customer submission when validation fails', () => {
      fc.assert(
        fc.property(invalidCustomerGenerator(), (invalidData) => {
          // Validate the data
          const validationResult = customerService.validateCustomerData(invalidData);

          // Property: validation should fail for invalid data
          expect(validationResult.isValid).toBe(false);

          // Property: errors should be present
          expect(validationResult.errors.length).toBeGreaterThan(0);

          // Property: each error should identify a specific field
          validationResult.errors.forEach((error) => {
            expect(error).toHaveProperty('field');
            expect(error).toHaveProperty('message');
            expect(typeof error.field).toBe('string');
            expect(typeof error.message).toBe('string');
            expect(error.field.length).toBeGreaterThan(0);
            expect(error.message.length).toBeGreaterThan(0);
          });

          // Property: validation result can be used to prevent submission
          // In a real form, if isValid is false, the submit handler would return early
          const shouldAllowSubmission = validationResult.isValid;
          expect(shouldAllowSubmission).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should prevent fabric submission when validation fails', () => {
      fc.assert(
        fc.property(invalidFabricGenerator(), (invalidData) => {
          // Validate the data
          const validationResult = fabricService.validateFabricData(invalidData);

          // Property: validation should fail for invalid data
          expect(validationResult.isValid).toBe(false);

          // Property: errors should be present
          expect(validationResult.errors.length).toBeGreaterThan(0);

          // Property: each error should identify a specific field
          validationResult.errors.forEach((error) => {
            expect(error).toHaveProperty('field');
            expect(error).toHaveProperty('message');
            expect(typeof error.field).toBe('string');
            expect(typeof error.message).toBe('string');
            expect(error.field.length).toBeGreaterThan(0);
            expect(error.message.length).toBeGreaterThan(0);
          });

          // Property: validation result can be used to prevent submission
          // In a real form, if isValid is false, the submit handler would return early
          const shouldAllowSubmission = validationResult.isValid;
          expect(shouldAllowSubmission).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should prevent transaction submission when validation fails', () => {
      fc.assert(
        fc.property(invalidTransactionGenerator(), (invalidData) => {
          // Validate the data
          const validationResult = transactionService.validateTransactionData(invalidData);

          // Property: validation should fail for invalid data
          expect(validationResult.isValid).toBe(false);

          // Property: errors should be present
          expect(validationResult.errors.length).toBeGreaterThan(0);

          // Property: each error should identify a specific field
          validationResult.errors.forEach((error) => {
            expect(error).toHaveProperty('field');
            expect(error).toHaveProperty('message');
            expect(typeof error.field).toBe('string');
            expect(typeof error.message).toBe('string');
            expect(error.field.length).toBeGreaterThan(0);
            expect(error.message.length).toBeGreaterThan(0);
          });

          // Property: validation result can be used to prevent submission
          // In a real form, if isValid is false, the submit handler would return early
          const shouldAllowSubmission = validationResult.isValid;
          expect(shouldAllowSubmission).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });
});
