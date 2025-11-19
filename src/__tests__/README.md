# Testing Infrastructure

This directory contains the testing infrastructure for the POS system.

## Overview

The testing setup includes:
- **Jest** for unit testing
- **React Testing Library** for component testing
- **fast-check** for property-based testing
- **Firebase Emulator** support for integration testing

## Directory Structure

```
src/__tests__/
├── utils/
│   ├── testUtils.js          # Test utilities and helpers
│   ├── generators.js         # Property-based testing generators
│   └── firebaseTestUtils.js  # Firebase emulator utilities
└── setup.test.js             # Infrastructure verification tests
```

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:ci

# Run tests with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration

# Start Firebase emulator
npm run emulator
```

## Test Utilities

### testUtils.js

Provides helper functions for testing:

- `renderWithProviders(ui, options)` - Render components with context providers
- `createMockDbRef()` - Create mock Firebase database reference
- `createMockLogger()` - Create mock logger instance
- `createMockAtomicOperations()` - Create mock atomic operations service
- `wait(ms)` - Wait for async operations
- `createMockSnapshot(data)` - Create mock Firebase snapshot
- `flushPromises()` - Flush all pending promises

### generators.js

Property-based testing generators using fast-check:

- `customerGenerator()` - Generate valid customer objects
- `transactionGenerator()` - Generate valid transaction objects
- `productGenerator()` - Generate valid product objects
- `fabricGenerator()` - Generate valid fabric objects
- `batchGenerator()` - Generate valid batch objects
- `supplierGenerator()` - Generate valid supplier objects
- `memoWithTransactionsGenerator()` - Generate memo with transactions
- `errorGenerator()` - Generate error objects
- `validationResultGenerator()` - Generate validation results
- `positiveNumberGenerator()` - Generate positive numbers
- `dateStringGenerator()` - Generate valid date strings
- `nonEmptyStringGenerator()` - Generate non-empty strings
- `whitespaceStringGenerator()` - Generate whitespace-only strings

## Writing Tests

### Unit Tests

```javascript
import { createMockDbRef, createMockLogger } from '../utils/testUtils'
import { CustomerService } from '../../services/customerService'

describe('CustomerService', () => {
  let service
  let mockDb
  let mockLogger

  beforeEach(() => {
    mockDb = createMockDbRef()
    mockLogger = createMockLogger()
    service = new CustomerService(mockDb, mockLogger)
  })

  test('should add customer', async () => {
    const customer = { name: 'John Doe', phone: '1234567890' }
    const result = await service.addCustomer(customer)
    expect(result).toBeDefined()
    expect(mockDb.push).toHaveBeenCalled()
  })
})
```

### Property-Based Tests

```javascript
import * as fc from 'fast-check'
import { customerGenerator } from '../utils/generators'

describe('Customer Validation', () => {
  test('Property: All valid customers should pass validation', () => {
    fc.assert(
      fc.property(customerGenerator(), (customer) => {
        const result = validateCustomer(customer)
        expect(result.isValid).toBe(true)
        return true
      }),
      { numRuns: 100 }
    )
  })
})
```

### Component Tests

```javascript
import { render, screen } from '@testing-library/react'
import { CustomerTable } from '../../components/CustomerTable'

describe('CustomerTable', () => {
  test('renders customer list', () => {
    const customers = [
      { id: '1', name: 'John Doe', phone: '1234567890' }
    ]
    render(<CustomerTable customers={customers} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})
```

## Firebase Emulator

To use Firebase emulator for integration tests:

1. Start the emulator:
   ```bash
   npm run emulator
   ```

2. The emulator will run on:
   - Database: http://127.0.0.1:9000
   - Auth: http://127.0.0.1:9099
   - UI: http://127.0.0.1:4000

3. Write integration tests that connect to the emulator

## Property-Based Testing Guidelines

When writing property-based tests:

1. **Run at least 100 iterations** per property test
2. **Tag each test** with the property number from the design document
3. **Use custom generators** for domain-specific types
4. **Test universal properties** that should hold for all inputs
5. **Avoid mocking** when possible to test real behavior

Example property test format:

```javascript
/**
 * Feature: codebase-improvements, Property 9: Customer deletion cascades
 * Validates: Requirements 6.1
 */
test('Property 9: Customer deletion cascades to transactions', () => {
  fc.assert(
    fc.asyncProperty(
      fc.record({
        customer: customerGenerator(),
        transactions: fc.array(transactionGenerator(), { minLength: 1 })
      }),
      async ({ customer, transactions }) => {
        // Test implementation
      }
    ),
    { numRuns: 100 }
  )
})
```

## Coverage Goals

- Overall coverage: > 80%
- Service layer: > 90%
- Utility functions: > 85%
- Components: > 75%

## Troubleshooting

### Tests failing with Firebase errors

Make sure Firebase is properly mocked in `jest.setup.js`. The mocks are automatically applied to all tests.

### Property tests failing

1. Check if the generator is producing valid data
2. Verify the property is correctly specified
3. Reduce `numRuns` temporarily to debug faster
4. Use `fc.sample()` to inspect generated values

### Component tests failing

1. Ensure components are wrapped with necessary providers
2. Use `renderWithProviders()` helper
3. Check if async operations need `waitFor()` or `findBy` queries

## Best Practices

1. **Keep tests focused** - One assertion per test when possible
2. **Use descriptive names** - Test names should explain what is being tested
3. **Avoid test interdependence** - Each test should be independent
4. **Mock external dependencies** - Don't make real API calls in unit tests
5. **Test behavior, not implementation** - Focus on what the code does, not how
6. **Use property tests for universal rules** - Use unit tests for specific examples
7. **Clean up after tests** - Reset mocks and clear state between tests

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [fast-check Documentation](https://fast-check.dev/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
