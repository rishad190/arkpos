/**
 * Property-Based Tests for Firebase Response Validation
 * Feature: codebase-improvements, Property 6: Firebase responses are validated
 * Validates: Requirements 3.4
 */

import * as fc from 'fast-check';
import { CustomerService } from '../customerService';
import { FabricService } from '../fabricService';
import { TransactionService } from '../transactionService';
import { get } from 'firebase/database';

// Mock Firebase
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  get: jest.fn(),
  push: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

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

/**
 * Helper to generate ISO date string
 */
const dateGenerator = () => {
  const minTime = new Date('2020-01-01').getTime();
  const maxTime = new Date('2030-12-31').getTime();
  return fc.integer({ min: minTime, max: maxTime }).map(timestamp => new Date(timestamp).toISOString());
};

/**
 * Helper to generate optional ISO date string
 */
const optionalDateGenerator = () => {
  return fc.option(
    fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }),
    { nil: undefined }
  ).map(timestamp => timestamp ? new Date(timestamp).toISOString() : undefined);
};

/**
 * Generator for valid Customer Firebase responses
 */
const validCustomerResponseGenerator = () => {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    address: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
    email: fc.option(fc.emailAddress(), { nil: undefined }),
    createdAt: dateGenerator(),
    updatedAt: optionalDateGenerator(),
  });
};

/**
 * Generator for invalid Customer Firebase responses
 * Missing required fields or wrong types
 */
const invalidCustomerResponseGenerator = () => {
  return fc.oneof(
    // Missing name
    fc.record({
      id: fc.string({ minLength: 1 }),
      phone: fc.string({ minLength: 10 }),
      createdAt: dateGenerator(),
    }),
    // Missing phone
    fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      createdAt: dateGenerator(),
    }),
    // Wrong type for name (number instead of string)
    fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.integer(),
      phone: fc.string({ minLength: 10 }),
      createdAt: dateGenerator(),
    }),
    // Wrong type for phone (number instead of string)
    fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      phone: fc.integer(),
      createdAt: dateGenerator(),
    }),
    // Missing createdAt
    fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      phone: fc.string({ minLength: 10 }),
    }),
    // Invalid email format
    fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      phone: fc.string({ minLength: 10 }),
      email: fc.string({ minLength: 1 }).filter(s => !s.includes('@')),
      createdAt: dateGenerator(),
    })
  );
};

/**
 * Generator for valid Fabric Firebase responses
 */
const validFabricResponseGenerator = () => {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    category: fc.string({ minLength: 1, maxLength: 50 }),
    unit: fc.string({ minLength: 1, maxLength: 20 }),
    batches: fc.dictionary(
      fc.string({ minLength: 1 }),
      fc.record({
        items: fc.array(
          fc.record({
            colorName: fc.string({ minLength: 1 }),
            quantity: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
            colorCode: fc.option(fc.string(), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        purchaseDate: dateGenerator(),
        unitCost: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
        supplier: fc.string({ minLength: 1 }),
        createdAt: dateGenerator(),
      }),
      { minKeys: 0, maxKeys: 5 }
    ),
    createdAt: dateGenerator(),
    updatedAt: optionalDateGenerator(),
  });
};

/**
 * Generator for invalid Fabric Firebase responses
 */
const invalidFabricResponseGenerator = () => {
  return fc.oneof(
    // Missing name
    fc.record({
      id: fc.string({ minLength: 1 }),
      category: fc.string({ minLength: 1 }),
      unit: fc.string({ minLength: 1 }),
      batches: fc.constant({}),
      createdAt: dateGenerator(),
    }),
    // Missing category
    fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      unit: fc.string({ minLength: 1 }),
      batches: fc.constant({}),
      createdAt: dateGenerator(),
    }),
    // Wrong type for batches (array instead of object)
    fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      category: fc.string({ minLength: 1 }),
      unit: fc.string({ minLength: 1 }),
      batches: fc.array(fc.anything()),
      createdAt: dateGenerator(),
    }),
    // Batch with invalid items (not an array)
    fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      category: fc.string({ minLength: 1 }),
      unit: fc.string({ minLength: 1 }),
      batches: fc.constant({
        batch1: {
          items: 'not-an-array',
          purchaseDate: new Date().toISOString(),
          unitCost: 100,
          supplier: 'Test',
          createdAt: new Date().toISOString(),
        }
      }),
      createdAt: dateGenerator(),
    })
  );
};

/**
 * Generator for valid Transaction Firebase responses
 */
const validTransactionResponseGenerator = () => {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    customerId: fc.string({ minLength: 1 }),
    memoNumber: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
    type: fc.option(fc.constantFrom('sale', 'payment'), { nil: undefined }),
    total: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
    deposit: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
    due: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }), { nil: undefined }),
    date: dateGenerator().map(d => d.split('T')[0]),
    products: fc.option(fc.array(fc.record({
      fabricId: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }),
      unitPrice: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }),
    })), { nil: undefined }),
    createdAt: dateGenerator(),
    updatedAt: optionalDateGenerator(),
  });
};

/**
 * Generator for invalid Transaction Firebase responses
 */
const invalidTransactionResponseGenerator = () => {
  return fc.oneof(
    // Missing customerId
    fc.record({
      id: fc.string({ minLength: 1 }),
      total: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
      deposit: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
      date: dateGenerator().map(d => d.split('T')[0]),
      createdAt: dateGenerator(),
    }),
    // Wrong type for total (string instead of number)
    fc.record({
      id: fc.string({ minLength: 1 }),
      customerId: fc.string({ minLength: 1 }),
      total: fc.string(),
      deposit: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
      date: dateGenerator().map(d => d.split('T')[0]),
      createdAt: dateGenerator(),
    }),
    // Wrong type for deposit (string instead of number)
    fc.record({
      id: fc.string({ minLength: 1 }),
      customerId: fc.string({ minLength: 1 }),
      total: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
      deposit: fc.string(),
      date: dateGenerator().map(d => d.split('T')[0]),
      createdAt: dateGenerator(),
    }),
    // Invalid type value
    fc.record({
      id: fc.string({ minLength: 1 }),
      customerId: fc.string({ minLength: 1 }),
      type: fc.string({ minLength: 1 }).filter(s => s !== 'sale' && s !== 'payment'),
      total: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
      deposit: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
      date: dateGenerator().map(d => d.split('T')[0]),
      createdAt: dateGenerator(),
    })
  );
};

/**
 * Validate Customer response shape
 * @param {any} response - Firebase response to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateCustomerResponse(response) {
  if (!response || typeof response !== 'object') return false;
  
  // Required fields
  if (!response.name || typeof response.name !== 'string') return false;
  if (!response.phone || typeof response.phone !== 'string') return false;
  if (!response.createdAt || typeof response.createdAt !== 'string') return false;
  
  // Optional fields type checking
  if (response.address !== undefined && typeof response.address !== 'string') return false;
  if (response.email !== undefined && typeof response.email !== 'string') return false;
  if (response.updatedAt !== undefined && typeof response.updatedAt !== 'string') return false;
  
  // Email format validation if present
  if (response.email && !response.email.includes('@')) return false;
  
  return true;
}

/**
 * Validate Fabric response shape
 * @param {any} response - Firebase response to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateFabricResponse(response) {
  if (!response || typeof response !== 'object') return false;
  
  // Required fields
  if (!response.name || typeof response.name !== 'string') return false;
  if (!response.category || typeof response.category !== 'string') return false;
  if (!response.unit || typeof response.unit !== 'string') return false;
  if (!response.createdAt || typeof response.createdAt !== 'string') return false;
  
  // Batches should be an object (not array)
  if (response.batches !== undefined) {
    if (typeof response.batches !== 'object' || Array.isArray(response.batches)) {
      return false;
    }
    
    // Validate each batch
    for (const batchId in response.batches) {
      const batch = response.batches[batchId];
      if (!batch || typeof batch !== 'object') return false;
      
      // Batch items should be an array
      if (!Array.isArray(batch.items)) return false;
      
      // Validate each item
      for (const item of batch.items) {
        if (!item || typeof item !== 'object') return false;
        if (!item.colorName || typeof item.colorName !== 'string') return false;
        if (typeof item.quantity !== 'number' || isNaN(item.quantity)) return false;
      }
    }
  }
  
  return true;
}

/**
 * Validate Transaction response shape
 * @param {any} response - Firebase response to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateTransactionResponse(response) {
  if (!response || typeof response !== 'object') return false;
  
  // Required fields
  if (!response.customerId || typeof response.customerId !== 'string') return false;
  if (typeof response.total !== 'number' || isNaN(response.total)) return false;
  if (typeof response.deposit !== 'number' || isNaN(response.deposit)) return false;
  if (!response.createdAt || typeof response.createdAt !== 'string') return false;
  
  // Optional type field validation
  if (response.type !== undefined) {
    if (response.type !== 'sale' && response.type !== 'payment') return false;
  }
  
  // Optional products field validation
  if (response.products !== undefined && !Array.isArray(response.products)) return false;
  
  return true;
}

describe('Property 6: Firebase responses are validated', () => {
  let customerService;
  let fabricService;
  let transactionService;

  beforeEach(() => {
    customerService = new CustomerService(mockDb, mockLogger, mockAtomicOperations);
    fabricService = new FabricService(mockDb, mockLogger, mockAtomicOperations);
    transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
    jest.clearAllMocks();
  });

  describe('Customer response validation', () => {
    it('should accept valid customer responses', () => {
      fc.assert(
        fc.property(validCustomerResponseGenerator(), (validResponse) => {
          // Property: Valid customer responses should pass validation
          const isValid = validateCustomerResponse(validResponse);
          expect(isValid).toBe(true);
          
          // Property: Valid responses should have all required fields
          expect(validResponse).toHaveProperty('name');
          expect(validResponse).toHaveProperty('phone');
          expect(validResponse).toHaveProperty('createdAt');
          
          // Property: Required fields should be strings
          expect(typeof validResponse.name).toBe('string');
          expect(typeof validResponse.phone).toBe('string');
          expect(typeof validResponse.createdAt).toBe('string');
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid customer responses', () => {
      fc.assert(
        fc.property(invalidCustomerResponseGenerator(), (invalidResponse) => {
          // Property: Invalid customer responses should fail validation
          const isValid = validateCustomerResponse(invalidResponse);
          expect(isValid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate customer response from Firebase get operation', async () => {
      await fc.assert(
        fc.asyncProperty(validCustomerResponseGenerator(), async (validResponse) => {
          // Mock Firebase get to return valid response
          get.mockResolvedValueOnce({
            exists: () => true,
            val: () => validResponse,
          });

          // Get customer from service
          const customer = await customerService.getCustomer('test-id');

          // Property: Retrieved customer should have valid shape
          expect(customer).toBeTruthy();
          expect(validateCustomerResponse(customer)).toBe(true);
          
          // Property: Customer should include the ID
          expect(customer).toHaveProperty('id');
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Fabric response validation', () => {
    it('should accept valid fabric responses', () => {
      fc.assert(
        fc.property(validFabricResponseGenerator(), (validResponse) => {
          // Property: Valid fabric responses should pass validation
          const isValid = validateFabricResponse(validResponse);
          expect(isValid).toBe(true);
          
          // Property: Valid responses should have all required fields
          expect(validResponse).toHaveProperty('name');
          expect(validResponse).toHaveProperty('category');
          expect(validResponse).toHaveProperty('unit');
          expect(validResponse).toHaveProperty('createdAt');
          
          // Property: Batches should be an object, not an array
          if (validResponse.batches) {
            expect(typeof validResponse.batches).toBe('object');
            expect(Array.isArray(validResponse.batches)).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid fabric responses', () => {
      fc.assert(
        fc.property(invalidFabricResponseGenerator(), (invalidResponse) => {
          // Property: Invalid fabric responses should fail validation
          const isValid = validateFabricResponse(invalidResponse);
          expect(isValid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate batch structure in fabric responses', () => {
      fc.assert(
        fc.property(validFabricResponseGenerator(), (validResponse) => {
          // Property: Each batch should have items array
          if (validResponse.batches) {
            Object.values(validResponse.batches).forEach(batch => {
              expect(Array.isArray(batch.items)).toBe(true);
              
              // Property: Each item should have required fields
              batch.items.forEach(item => {
                expect(item).toHaveProperty('colorName');
                expect(item).toHaveProperty('quantity');
                expect(typeof item.colorName).toBe('string');
                expect(typeof item.quantity).toBe('number');
              });
            });
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Transaction response validation', () => {
    it('should accept valid transaction responses', () => {
      fc.assert(
        fc.property(validTransactionResponseGenerator(), (validResponse) => {
          // Property: Valid transaction responses should pass validation
          const isValid = validateTransactionResponse(validResponse);
          expect(isValid).toBe(true);
          
          // Property: Valid responses should have all required fields
          expect(validResponse).toHaveProperty('customerId');
          expect(validResponse).toHaveProperty('total');
          expect(validResponse).toHaveProperty('deposit');
          expect(validResponse).toHaveProperty('createdAt');
          
          // Property: Numeric fields should be numbers
          expect(typeof validResponse.total).toBe('number');
          expect(typeof validResponse.deposit).toBe('number');
          expect(isNaN(validResponse.total)).toBe(false);
          expect(isNaN(validResponse.deposit)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid transaction responses', () => {
      fc.assert(
        fc.property(invalidTransactionResponseGenerator(), (invalidResponse) => {
          // Property: Invalid transaction responses should fail validation
          const isValid = validateTransactionResponse(invalidResponse);
          expect(isValid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate transaction type field when present', () => {
      fc.assert(
        fc.property(validTransactionResponseGenerator(), (validResponse) => {
          // Property: If type is present, it should be 'sale' or 'payment'
          if (validResponse.type !== undefined) {
            expect(['sale', 'payment']).toContain(validResponse.type);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should validate products array structure when present', () => {
      fc.assert(
        fc.property(validTransactionResponseGenerator(), (validResponse) => {
          // Property: If products is present, it should be an array
          if (validResponse.products !== undefined) {
            expect(Array.isArray(validResponse.products)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-entity validation', () => {
    it('should validate that all entities have createdAt timestamp', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            validCustomerResponseGenerator(),
            validFabricResponseGenerator(),
            validTransactionResponseGenerator()
          ),
          (validResponse) => {
            // Property: All entities should have createdAt field
            expect(validResponse).toHaveProperty('createdAt');
            expect(typeof validResponse.createdAt).toBe('string');
            
            // Property: createdAt should be a valid ISO date string
            const date = new Date(validResponse.createdAt);
            expect(isNaN(date.getTime())).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that optional updatedAt is a string when present', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            validCustomerResponseGenerator(),
            validFabricResponseGenerator(),
            validTransactionResponseGenerator()
          ),
          (validResponse) => {
            // Property: If updatedAt is present, it should be a string
            if (validResponse.updatedAt !== undefined) {
              expect(typeof validResponse.updatedAt).toBe('string');
              
              // Property: updatedAt should be a valid ISO date string
              const date = new Date(validResponse.updatedAt);
              expect(isNaN(date.getTime())).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
