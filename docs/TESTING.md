# Testing Guide

This document provides comprehensive guidance on testing strategies, patterns, and best practices for the BhaiyaPos system.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Testing Philosophy

BhaiyaPos follows a comprehensive testing strategy that combines multiple testing approaches:

1. **Unit Tests**: Verify individual functions and components work correctly in isolation
2. **Property-Based Tests**: Verify universal properties hold across many random inputs
3. **Integration Tests**: Verify complete workflows work correctly with real Firebase
4. **Performance Tests**: Ensure critical operations meet performance requirements

### Test Pyramid

```
        ┌─────────────┐
        │   Manual    │  (User acceptance testing)
        │   Testing   │
        └─────────────┘
       ┌───────────────┐
       │ Integration   │  (Complete workflows)
       │     Tests     │  ~20 tests
       └───────────────┘
      ┌─────────────────┐
      │  Property-Based │  (Universal properties)
      │      Tests      │  ~25 tests
      └─────────────────┘
     ┌───────────────────┐
     │    Unit Tests     │  (Individual functions)
     │                   │  ~100+ tests
     └───────────────────┘
```

## Test Types

### 1. Unit Tests

Unit tests verify individual functions, methods, and components in isolation.

**Location**: Co-located with source files in `__tests__` directories

**Framework**: Jest + React Testing Library

**Example**:
```javascript
// src/lib/__tests__/validation.test.js
describe('validateCustomer', () => {
  it('should accept valid customer data', () => {
    const result = validateCustomer({
      name: 'John Doe',
      phone: '1234567890'
    });
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject customer with empty name', () => {
    const result = validateCustomer({
      name: '',
      phone: '1234567890'
    });
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'name',
      message: 'Name is required'
    });
  });
});
```

**What to Test**:
- Input validation logic
- Business calculations
- Data transformations
- Error handling
- Edge cases (empty inputs, boundary values)

**What NOT to Test**:
- Firebase implementation details
- Third-party library internals
- Simple getters/setters
- Trivial functions

### 2. Property-Based Tests

Property-based tests verify that universal properties hold true across many randomly generated inputs.

**Location**: Co-located with source files in `__tests__` directories

**Framework**: fast-check

**Example**:
```javascript
// src/services/__tests__/transactionGrouping.test.js
const fc = require('fast-check');

describe('Property 22: Transactions are grouped by memo', () => {
  it('should group all transactions by their memo number', () => {
    fc.assert(
      fc.property(
        fc.array(transactionGenerator(), { minLength: 1, maxLength: 50 }),
        (transactions) => {
          const grouped = groupTransactionsByMemo(transactions);
          
          // Property: Every transaction appears in exactly one group
          const allTransactionIds = transactions.map(t => t.id);
          const groupedTransactionIds = Object.values(grouped)
            .flatMap(group => group.map(t => t.id));
          
          expect(groupedTransactionIds.sort()).toEqual(allTransactionIds.sort());
          
          // Property: All transactions in a group have the same memo number
          Object.entries(grouped).forEach(([memoNumber, txns]) => {
            txns.forEach(txn => {
              expect(txn.memoNumber).toBe(memoNumber);
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Configuration**:
- Minimum 100 iterations per property test
- Use custom generators for domain-specific types
- Tag each test with the property number from design document

**Property Patterns**:

1. **Invariants**: Properties that remain constant
   ```javascript
   // Example: Array length after map
   fc.property(fc.array(fc.integer()), arr => {
     const mapped = arr.map(x => x * 2);
     return mapped.length === arr.length;
   });
   ```

2. **Round Trip**: Combining operation with its inverse
   ```javascript
   // Example: Serialize/deserialize
   fc.property(customerGenerator(), customer => {
     const serialized = JSON.stringify(customer);
     const deserialized = JSON.parse(serialized);
     return deepEqual(customer, deserialized);
   });
   ```

3. **Idempotence**: Doing operation twice = doing it once
   ```javascript
   // Example: Sorting
   fc.property(fc.array(fc.integer()), arr => {
     const sorted1 = sort(arr);
     const sorted2 = sort(sorted1);
     return deepEqual(sorted1, sorted2);
   });
   ```

4. **Metamorphic**: Relationship between inputs and outputs
   ```javascript
   // Example: Filter reduces or maintains length
   fc.property(fc.array(fc.integer()), arr => {
     const filtered = arr.filter(x => x > 0);
     return filtered.length <= arr.length;
   });
   ```

### 3. Integration Tests

Integration tests verify complete workflows with real Firebase operations.

**Location**: `src/__tests__/integration/`

**Framework**: Jest + Firebase Emulator

**Example**:
```javascript
// src/__tests__/integration/customerLifecycle.integration.test.js
describe('Customer Lifecycle Integration', () => {
  beforeAll(async () => {
    await startFirebaseEmulator();
  });
  
  afterAll(async () => {
    await stopFirebaseEmulator();
  });
  
  it('should handle complete customer lifecycle', async () => {
    // Create customer
    const customerId = await customerService.addCustomer({
      name: 'Test Customer',
      phone: '1234567890'
    });
    
    // Add transaction
    await transactionService.addTransaction({
      customerId,
      memoNumber: 'MEMO-001',
      type: 'sale',
      total: 1000,
      deposit: 500,
      due: 500
    });
    
    // Add payment
    await transactionService.addPaymentToMemo('MEMO-001', {
      customerId,
      amount: 200,
      date: new Date().toISOString()
    });
    
    // Verify due calculation
    const totalDue = await transactionService.calculateCustomerTotalDue(customerId);
    expect(totalDue).toBe(300);
    
    // Delete customer
    const transactions = await transactionService.getByCustomerId(customerId);
    await customerService.deleteCustomer(customerId, transactions);
    
    // Verify deletion
    const customer = await customerService.getCustomer(customerId);
    expect(customer).toBeNull();
  });
});
```

**What to Test**:
- Complete user workflows
- Data consistency across operations
- Error recovery scenarios
- Concurrent operations
- Offline operation processing

### 4. Performance Tests

Performance tests benchmark critical operations and ensure they meet performance requirements.

**Location**: `src/__tests__/performance/`

**Framework**: Jest

**Example**:
```javascript
// src/__tests__/performance/performance.benchmark.test.js
describe('Performance Benchmarks', () => {
  it('should create customer in under 1 second', async () => {
    const startTime = Date.now();
    
    await customerService.addCustomer({
      name: 'Performance Test',
      phone: '1234567890'
    });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000);
  });
  
  it('should handle 100 transactions in under 5 seconds', async () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      await transactionService.addTransaction({
        customerId: 'test-customer',
        memoNumber: `MEMO-${i}`,
        type: 'sale',
        total: 1000,
        deposit: 500,
        due: 500
      });
    }
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });
});
```

**Performance Budgets**:
- Customer creation: < 1 second
- Transaction creation: < 1 second
- Customer list render: < 500ms
- Search results: < 300ms
- Page load: < 3 seconds

## Running Tests

### All Tests

```bash
# Run all tests in watch mode
npm test

# Run all tests once
npm run test:ci

# Run with coverage report
npm run test:coverage
```

### Specific Test Types

```bash
# Run integration tests only
npm run test:integration

# Run performance tests only
npm run test:performance

# Run specific test file
npm test -- customerService.test.js

# Run tests matching pattern
npm test -- --testNamePattern="validation"
```

### With Firebase Emulator

```bash
# Terminal 1: Start emulator
npm run emulator

# Terminal 2: Run integration tests
npm run test:integration
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Writing Tests

### Unit Test Template

```javascript
// src/services/__tests__/myService.test.js
const MyService = require('../myService');
const { mockDatabase, mockLogger } = require('../../__tests__/utils/testUtils');

describe('MyService', () => {
  let service;
  let db;
  let logger;
  
  beforeEach(() => {
    db = mockDatabase();
    logger = mockLogger();
    service = new MyService(db, logger);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('myMethod', () => {
    it('should handle valid input', async () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = await service.myMethod(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(logger.info).toHaveBeenCalled();
    });
    
    it('should throw error for invalid input', async () => {
      // Arrange
      const invalidInput = { /* invalid data */ };
      
      // Act & Assert
      await expect(service.myMethod(invalidInput))
        .rejects
        .toThrow('Validation failed');
    });
  });
});
```

### Property-Based Test Template

```javascript
// src/lib/__tests__/myFunction.property.test.js
const fc = require('fast-check');
const { myFunction } = require('../myFunction');
const { customGenerator } = require('../../__tests__/utils/generators');

describe('Property Tests: myFunction', () => {
  /**
   * Feature: codebase-improvements, Property X: Description
   * Validates: Requirements Y.Z
   */
  it('should maintain property X for all inputs', () => {
    fc.assert(
      fc.property(
        customGenerator(),
        (input) => {
          // Act
          const result = myFunction(input);
          
          // Assert property
          expect(result).toSatisfyProperty();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Test Template

```javascript
// src/__tests__/integration/myWorkflow.integration.test.js
const { setupFirebaseEmulator, cleanupFirebaseEmulator } = require('../utils/firebaseTestUtils');

describe('My Workflow Integration', () => {
  beforeAll(async () => {
    await setupFirebaseEmulator();
  });
  
  afterAll(async () => {
    await cleanupFirebaseEmulator();
  });
  
  beforeEach(async () => {
    // Clear data before each test
    await clearFirebaseData();
  });
  
  it('should complete workflow successfully', async () => {
    // Arrange
    const initialData = { /* setup data */ };
    
    // Act
    const result = await performWorkflow(initialData);
    
    // Assert
    expect(result).toBeDefined();
    
    // Verify database state
    const dbState = await getFirebaseData();
    expect(dbState).toMatchExpectedState();
  });
});
```

## Test Utilities

### Generators (`src/__tests__/utils/generators.js`)

Custom generators for property-based testing:

```javascript
const fc = require('fast-check');

// Customer generator
const customerGenerator = () => fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  phone: fc.string({ minLength: 10, maxLength: 15 }),
  address: fc.option(fc.string()),
  email: fc.option(fc.emailAddress())
});

// Transaction generator
const transactionGenerator = () => fc.record({
  customerId: fc.uuid(),
  memoNumber: fc.string({ minLength: 5, maxLength: 20 }),
  type: fc.constantFrom('sale', 'payment'),
  total: fc.float({ min: 0, max: 100000 }),
  deposit: fc.float({ min: 0, max: 100000 }),
  due: fc.float({ min: 0, max: 100000 }),
  date: fc.date().map(d => d.toISOString())
});

// Fabric generator
const fabricGenerator = () => fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  category: fc.string({ minLength: 1, maxLength: 50 }),
  unit: fc.constantFrom('meters', 'yards', 'pieces')
});
```

### Test Utilities (`src/__tests__/utils/testUtils.js`)

Common test utilities:

```javascript
// Mock Firebase database
const mockDatabase = () => ({
  ref: jest.fn().mockReturnThis(),
  push: jest.fn().mockResolvedValue({ key: 'mock-id' }),
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  once: jest.fn().mockResolvedValue({ val: () => null })
});

// Mock logger
const mockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
});

// Wait for async operations
const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Deep equality check
const deepEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};
```

### Firebase Test Utils (`src/__tests__/utils/firebaseTestUtils.js`)

Firebase emulator utilities:

```javascript
// Setup Firebase emulator
const setupFirebaseEmulator = async () => {
  // Initialize Firebase with emulator settings
  // Wait for emulator to be ready
};

// Cleanup Firebase emulator
const cleanupFirebaseEmulator = async () => {
  // Clear all data
  // Disconnect from emulator
};

// Clear Firebase data
const clearFirebaseData = async () => {
  // Remove all data from emulator
};

// Get Firebase data
const getFirebaseData = async (path) => {
  // Retrieve data from emulator
};
```

## Best Practices

### General Testing Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Avoid testing internal implementation details
   - Test public APIs and interfaces

2. **Keep Tests Independent**
   - Each test should run independently
   - Use `beforeEach` to set up fresh state
   - Clean up after tests in `afterEach`

3. **Use Descriptive Test Names**
   - Test names should describe what is being tested
   - Use "should" statements: "should return error for invalid input"
   - Include context: "when user is not authenticated"

4. **Follow AAA Pattern**
   - **Arrange**: Set up test data and conditions
   - **Act**: Execute the code being tested
   - **Assert**: Verify the results

5. **Test Edge Cases**
   - Empty inputs
   - Boundary values
   - Null/undefined values
   - Large datasets
   - Concurrent operations

### Property-Based Testing Best Practices

1. **Write Smart Generators**
   - Constrain generators to valid input domain
   - Use `fc.filter()` to exclude invalid values
   - Combine generators with `fc.record()` and `fc.tuple()`

2. **Test Universal Properties**
   - Focus on properties that should always hold
   - Avoid testing specific examples
   - Think about invariants, round trips, idempotence

3. **Use Sufficient Iterations**
   - Minimum 100 runs per property test
   - Increase for critical properties
   - Balance thoroughness with test speed

4. **Handle Shrinking**
   - fast-check automatically shrinks failing cases
   - Review shrunk examples to understand failures
   - Use shrunk examples to create regression tests

### Integration Testing Best Practices

1. **Use Firebase Emulator**
   - Never test against production database
   - Use emulator for consistent test environment
   - Clear data between tests

2. **Test Complete Workflows**
   - Test realistic user scenarios
   - Include multiple operations
   - Verify end-to-end behavior

3. **Test Error Scenarios**
   - Network failures
   - Invalid data
   - Concurrent modifications
   - Offline operations

4. **Keep Tests Fast**
   - Minimize Firebase operations
   - Use parallel execution where possible
   - Clean up efficiently

### Performance Testing Best Practices

1. **Set Realistic Budgets**
   - Based on user expectations
   - Consider network latency
   - Account for device capabilities

2. **Test with Realistic Data**
   - Use production-like dataset sizes
   - Include complex scenarios
   - Test with slow networks

3. **Run in Isolation**
   - Use `--runInBand` flag
   - Avoid concurrent tests
   - Minimize background processes

4. **Monitor Trends**
   - Track performance over time
   - Identify regressions early
   - Set up automated alerts

## Troubleshooting

### Common Issues

#### Tests Failing Intermittently

**Symptoms**: Tests pass sometimes, fail other times

**Causes**:
- Race conditions
- Timing issues
- Shared state between tests

**Solutions**:
- Use `await` for all async operations
- Add proper cleanup in `afterEach`
- Ensure tests are independent
- Use `jest.setTimeout()` for slow operations

#### Firebase Emulator Connection Issues

**Symptoms**: Tests fail with connection errors

**Causes**:
- Emulator not running
- Wrong emulator configuration
- Port conflicts

**Solutions**:
- Start emulator before running tests: `npm run emulator`
- Check emulator configuration in `firebase.json`
- Verify ports are not in use
- Use `setupFirebaseEmulator()` utility

#### Property Tests Failing with Shrunk Examples

**Symptoms**: Property test fails with minimal example

**Causes**:
- Bug in implementation
- Generator producing invalid inputs
- Property is too strict

**Solutions**:
- Review shrunk example carefully
- Check if generator constraints are correct
- Verify property is accurate
- Add unit test for shrunk example

#### Coverage Not Updating

**Symptoms**: Coverage report doesn't reflect new tests

**Causes**:
- Cache issues
- Configuration problems
- Files not included in coverage

**Solutions**:
- Clear Jest cache: `npm test -- --clearCache`
- Check `jest.config.js` coverage settings
- Ensure files are in coverage paths
- Run `npm run test:coverage` explicitly

### Debugging Tests

#### Enable Verbose Output

```bash
npm test -- --verbose
```

#### Run Single Test

```bash
npm test -- --testNamePattern="specific test name"
```

#### Debug in VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

#### Use `console.log` Strategically

```javascript
it('should do something', () => {
  const result = myFunction(input);
  console.log('Result:', JSON.stringify(result, null, 2));
  expect(result).toBeDefined();
});
```

## Test Coverage Goals

### Current Coverage

- Overall: > 80%
- Service layer: > 90%
- Critical business logic: 100%
- UI components: > 70%

### Coverage Reports

View coverage reports at `coverage/lcov-report/index.html` after running:
```bash
npm run test:coverage
```

### Improving Coverage

1. Identify uncovered code in coverage report
2. Write tests for uncovered branches
3. Focus on critical paths first
4. Add property tests for complex logic
5. Write integration tests for workflows

## Continuous Integration

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run test:integration
      - uses: codecov/codecov-action@v2
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run test:ci"
    }
  }
}
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [fast-check Documentation](https://fast-check.dev/)
- [Firebase Emulator](https://firebase.google.com/docs/emulator-suite)
- [Property-Based Testing Guide](https://hypothesis.works/articles/what-is-property-based-testing/)
