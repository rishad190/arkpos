# Design Document

## Overview

This design outlines improvements to the existing POS system codebase, focusing on testing infrastructure, error handling, type safety, performance optimization, code organization, data consistency, offline support, logging, security, documentation, and enhanced customer transaction organization. The improvements will be implemented incrementally to minimize disruption while significantly enhancing code quality and maintainability.

A key enhancement is restructuring how customer transactions are stored and displayed - organizing them by customer with memo-wise grouping to clearly show outstanding dues and payment history.

## Architecture

The system follows a layered architecture:

1. **Presentation Layer**: React components and pages
2. **State Management Layer**: React Context (DataContext, AuthContext)
3. **Service Layer**: Business logic encapsulated in service classes (CustomerService, FabricService, TransactionService)
4. **Data Access Layer**: Firebase Realtime Database operations
5. **Utility Layer**: Helper functions, logging, calculations

### Current Architecture Strengths

- Service layer pattern separates business logic from UI
- Atomic operations service provides transaction-like behavior
- Context-based state management with reducer pattern
- Debounced Firebase listeners prevent excessive updates

### Areas for Improvement

- Missing test coverage across all layers
- Inconsistent error handling patterns
- Lack of type annotations
- Transaction organization needs customer-memo hierarchy
- Limited offline queue processing

## Components and Interfaces

### Testing Infrastructure

**Test Framework Stack:**
- Jest for unit testing
- React Testing Library for component testing
- Firebase emulator for integration testing
- Mock Service Worker (MSW) for API mocking

**Test Organization:**
```
src/
  services/
    __tests__/
      customerService.test.js
      fabricService.test.js
      transactionService.test.js
      atomicOperations.test.js
  lib/
    __tests__/
      calculations.test.js
      utils.test.js
  components/
    __tests__/
      CustomerTable.test.jsx
      AddCustomerDialog.test.jsx
```

### Enhanced Transaction Service

**TransactionService Interface:**
```javascript
class TransactionService {
  /**
   * Get all transactions for a customer, grouped by memo
   * @param {string} customerId
   * @returns {Promise<Array<MemoGroup>>}
   */
  getCustomerTransactionsByMemo(customerId)
  
  /**
   * Get memo details with all associated payments
   * @param {string} memoNumber
   * @returns {Promise<MemoDetails>}
   */
  getMemoDetails(memoNumber)
  
  /**
   * Add payment to a specific memo
   * @param {string} memoNumber
   * @param {PaymentData} paymentData
   * @returns {Promise<string>}
   */
  addPaymentToMemo(memoNumber, paymentData)
  
  /**
   * Calculate total due for a customer across all memos
   * @param {string} customerId
   * @returns {Promise<number>}
   */
  calculateCustomerTotalDue(customerId)
}
```

### Service Layer Enhancements

**Enhanced Service Interface:**
```javascript
class BaseService {
  constructor(db, logger, atomicOperations)
  validate(data): ValidationResult
  execute(operation, fn): Promise<Result>
  handleError(error): FormattedError
}
```

**Validation Result Type:**
```javascript
{
  isValid: boolean,
  errors: Array<{field: string, message: string}>,
  warnings: Array<{field: string, message: string}>
}
```

### Error Handling System

**Error Types:**
```javascript
class AppError extends Error {
  constructor(message, type, context)
  type: 'NETWORK' | 'VALIDATION' | 'PERMISSION' | 'NOT_FOUND' | 'CONFLICT'
  context: Object
  timestamp: string
}
```

**Error Handler:**
```javascript
class ErrorHandler {
  handle(error): FormattedError
  shouldRetry(error): boolean
  getRetryDelay(attemptNumber): number
  logError(error, context): void
}
```

### Type System

**JSDoc Type Definitions:**
```javascript
/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} name
 * @property {string} phone
 * @property {string} [address]
 * @property {number} totalDue - Aggregated due across all memos
 * @property {string} createdAt
 * @property {string} [updatedAt]
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} customerId
 * @property {string} memoNumber
 * @property {number} total
 * @property {number} deposit
 * @property {number} due
 * @property {string} date
 * @property {Array<Product>} products
 * @property {string} type - 'sale' | 'payment'
 */

/**
 * @typedef {Object} MemoGroup
 * @property {string} memoNumber
 * @property {string} customerId
 * @property {number} totalAmount
 * @property {number} paidAmount
 * @property {number} dueAmount
 * @property {string} saleDate
 * @property {Array<Transaction>} payments - All payment transactions for this memo
 */

/**
 * @typedef {Object} MemoDetails
 * @property {string} memoNumber
 * @property {Transaction} saleTransaction
 * @property {Array<Transaction>} paymentTransactions
 * @property {number} remainingDue
 */

/**
 * @typedef {Object} Fabric
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} unit
 * @property {Object<string, Batch>} batches
 */
```

### Performance Monitoring

**Performance Tracker:**
```javascript
class PerformanceTracker {
  startOperation(name): OperationHandle
  endOperation(handle): Metrics
  getMetrics(): PerformanceReport
  identifyBottlenecks(): Array<Bottleneck>
}
```

## Data Models

### Enhanced Customer Model
```javascript
{
  id: string,
  name: string,
  phone: string,
  address?: string,
  email?: string,
  totalDue: number, // Calculated from all memos
  transactionCount: number,
  memoCount: number, // Number of unique memos
  createdAt: string,
  updatedAt?: string,
  metadata: {
    lastTransactionDate?: string,
    lastMemoNumber?: string,
    averageOrderValue?: number
  }
}
```

### Enhanced Transaction Model with Memo Hierarchy

**Firebase Structure:**
```
transactions/
  {transactionId}/
    id: string
    customerId: string
    memoNumber: string
    type: 'sale' | 'payment'
    total: number
    deposit: number
    due: number
    date: string
    products: Array<Product>
    createdAt: string
```

**Derived MemoGroup Structure (computed in service layer):**
```javascript
{
  memoNumber: string,
  customerId: string,
  customerName: string,
  saleDate: string,
  totalAmount: number,
  paidAmount: number,
  dueAmount: number,
  saleTransaction: {
    id: string,
    products: Array<Product>,
    total: number,
    initialDeposit: number
  },
  paymentTransactions: [
    {
      id: string,
      date: string,
      amount: number,
      paymentMethod: string,
      note: string
    }
  ],
  status: 'paid' | 'partial' | 'unpaid'
}
```

### Enhanced Fabric Model
```javascript
{
  id: string,
  name: string,
  category: string,
  unit: string,
  batches: {
    [batchId]: {
      items: Array<{
        colorName: string,
        quantity: number,
        colorCode?: string
      }>,
      purchaseDate: string,
      unitCost: number,
      supplier: string,
      createdAt: string
    }
  },
  totalQuantity: number, // Calculated
  lowStockThreshold: number,
  createdAt: string,
  updatedAt?: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Validation errors identify invalid fields
*For any* invalid data object, the validation function should return errors that specifically identify which fields failed validation
**Validates: Requirements 2.1**

### Property 2: Error classification is accurate
*For any* error thrown by the system, the error handler should correctly classify it as NETWORK, VALIDATION, PERMISSION, NOT_FOUND, or CONFLICT based on the error characteristics
**Validates: Requirements 2.2**

### Property 3: Failed operations are logged with context
*For any* Firebase operation that fails, the logger should be invoked with the error object and operation context
**Validates: Requirements 2.3**

### Property 4: Atomic operations maintain consistency
*For any* atomic operation that fails partway through, the database state should remain unchanged from before the operation started
**Validates: Requirements 2.4**

### Property 5: Invalid input prevents submission
*For any* form submission with invalid data, the submission should be blocked and validation errors should be displayed
**Validates: Requirements 2.5**

### Property 6: Firebase responses are validated
*For any* Firebase response, the system should validate that the response shape matches the expected type definition before processing
**Validates: Requirements 3.4**

### Property 7: Debouncing prevents excessive updates
*For any* sequence of rapid Firebase listener updates within the debounce window, only the final update should trigger state changes
**Validates: Requirements 4.2**

### Property 8: Slow operations are flagged
*For any* operation that exceeds the performance threshold, the performance tracker should flag it and log metrics
**Validates: Requirements 4.5**

### Property 9: Customer deletion cascades to transactions
*For any* customer with associated transactions, deleting the customer should result in all their transactions being deleted from the database
**Validates: Requirements 6.1**

### Property 10: FIFO inventory reduction prevents negative stock
*For any* inventory reduction request, the system should use the oldest batches first (FIFO) and should reject the operation if it would result in negative stock levels
**Validates: Requirements 6.2**

### Property 11: Supplier due totals are accurate
*For any* supplier with transactions, the total due should equal the sum of individual transaction dues
**Validates: Requirements 6.3**

### Property 12: Cash transactions update atomically
*For any* cash transaction, both the cash record and the related customer transaction should be updated together, or neither should be updated if the operation fails
**Validates: Requirements 6.4**

### Property 13: Offline operations are queued
*For any* operation attempted while the connection state is DISCONNECTED, the operation should be added to the offline queue
**Validates: Requirements 7.1**

### Property 14: Queued operations process in order
*For any* offline queue with multiple operations, when connection is restored, operations should be processed in FIFO order
**Validates: Requirements 7.2**

### Property 15: Retry delays increase exponentially
*For any* failed operation retry sequence, each subsequent retry delay should be exponentially larger than the previous delay
**Validates: Requirements 7.3**

### Property 16: Optimistic updates rollback on failure
*For any* offline operation with optimistic UI update, if the operation fails when processed, the UI state should revert to the pre-operation state
**Validates: Requirements 7.5**

### Property 17: Error logs contain required fields
*For any* error logged by the system, the log entry should contain timestamp, context, and stack trace fields
**Validates: Requirements 8.1**

### Property 18: Slow operations are logged
*For any* operation that exceeds the slow operation threshold, performance metrics should be logged
**Validates: Requirements 8.2**

### Property 19: Firebase operations require authentication
*For any* Firebase operation, the system should validate that an authentication token exists before executing the operation
**Validates: Requirements 9.1**

### Property 20: Sessions timeout appropriately
*For any* user session, if the session duration exceeds the configured timeout period, the session should be invalidated
**Validates: Requirements 9.3**

### Property 21: User input is sanitized
*For any* user input string, dangerous characters should be escaped or the input should be rejected before being stored or processed
**Validates: Requirements 9.4**

### Property 22: Transactions are grouped by memo
*For any* customer with multiple transactions, the grouping function should organize transactions by their memo number
**Validates: Requirements 11.1**

### Property 23: Memos with dues are displayed
*For any* memo with a due amount greater than zero, it should be included in the customer's due list with the correct outstanding balance
**Validates: Requirements 11.2**

### Property 24: Memo details include all payments
*For any* memo number, retrieving memo details should return all payment transactions that reference that memo number
**Validates: Requirements 11.3**

### Property 25: Payments link to memos
*For any* payment transaction created, it should be associated with the specified memo number
**Validates: Requirements 11.4**

### Property 26: Customer total due aggregates memo dues
*For any* customer, the total due amount should equal the sum of due amounts across all their memos
**Validates: Requirements 11.5**

## Error Handling

### Error Classification Strategy

All errors will be classified into five categories:

1. **NETWORK**: Connection failures, timeouts, Firebase unavailable
2. **VALIDATION**: Invalid input data, business rule violations
3. **PERMISSION**: Authentication failures, authorization denials
4. **NOT_FOUND**: Requested resource doesn't exist
5. **CONFLICT**: Concurrent modification conflicts, race conditions

### Error Recovery Patterns

**Retry Strategy:**
- Network errors: Retry with exponential backoff (max 3 attempts)
- Validation errors: No retry, return to user immediately
- Permission errors: No retry, redirect to login
- Not found errors: No retry, show user-friendly message
- Conflict errors: Retry once after refreshing data

**User Feedback:**
- All errors display user-friendly messages
- Technical details logged but not shown to users
- Validation errors show field-specific guidance
- Network errors show retry options

### Atomic Operation Rollback

When an atomic operation fails:
1. Log the failure with full context
2. Execute rollback function if provided
3. Clear any optimistic UI updates
4. Return error to caller
5. Add to offline queue if network-related

## Testing Strategy

### Unit Testing Approach

**Service Layer Tests:**
- Mock Firebase database operations
- Test validation logic with valid and invalid inputs
- Verify error handling for all error types
- Test calculation functions with edge cases
- Verify atomic operations maintain consistency

**Utility Function Tests:**
- Test calculations with various input combinations
- Verify date formatting and parsing
- Test data transformation functions
- Verify logging output format

**Component Tests:**
- Test rendering with various props
- Verify user interactions trigger correct callbacks
- Test error state display
- Verify loading states

### Property-Based Testing Approach

**Testing Framework:** fast-check (JavaScript property-based testing library)

**Property Test Configuration:**
- Minimum 100 iterations per property test
- Use custom generators for domain-specific types (Customer, Transaction, Fabric)
- Tag each property test with the design document property number

**Property Test Examples:**

```javascript
// Property 9: Customer deletion cascades
test('Property 9: Customer deletion cascades to transactions', () => {
  fc.assert(
    fc.asyncProperty(
      fc.record({
        customer: customerGenerator(),
        transactions: fc.array(transactionGenerator(), { minLength: 1 })
      }),
      async ({ customer, transactions }) => {
        // Setup: Create customer and transactions
        const customerId = await customerService.addCustomer(customer);
        for (const txn of transactions) {
          await transactionService.addTransaction({ ...txn, customerId });
        }
        
        // Action: Delete customer
        await customerService.deleteCustomer(customerId, transactions);
        
        // Verify: All transactions are deleted
        const remainingTransactions = await transactionService.getByCustomerId(customerId);
        expect(remainingTransactions).toHaveLength(0);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 26: Customer total due aggregates memo dues
test('Property 26: Customer total due aggregates memo dues', () => {
  fc.assert(
    fc.asyncProperty(
      fc.record({
        customer: customerGenerator(),
        memos: fc.array(memoWithTransactionsGenerator(), { minLength: 1, maxLength: 10 })
      }),
      async ({ customer, memos }) => {
        // Setup: Create customer and memos with transactions
        const customerId = await customerService.addCustomer(customer);
        
        let expectedTotalDue = 0;
        for (const memo of memos) {
          await transactionService.addTransaction({
            ...memo.saleTransaction,
            customerId
          });
          expectedTotalDue += memo.dueAmount;
          
          for (const payment of memo.payments) {
            await transactionService.addPaymentToMemo(memo.memoNumber, payment);
            expectedTotalDue -= payment.amount;
          }
        }
        
        // Action: Calculate customer total due
        const actualTotalDue = await transactionService.calculateCustomerTotalDue(customerId);
        
        // Verify: Total due equals sum of memo dues
        expect(actualTotalDue).toBeCloseTo(expectedTotalDue, 2);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Firebase Emulator Tests:**
- Test real Firebase operations against emulator
- Verify data persistence and retrieval
- Test concurrent operations
- Verify transaction rollback behavior

**End-to-End Scenarios:**
- Complete customer lifecycle (create, transact, pay, delete)
- Inventory management flow (purchase, sell, track)
- Offline operation queueing and processing
- Error recovery scenarios

## Performance Considerations

### Optimization Strategies

**Data Loading:**
- Lazy load transaction details only when viewing customer
- Implement pagination for large customer lists
- Cache frequently accessed data in memory
- Use Firebase query indexes for common filters

**State Management:**
- Memoize expensive calculations (customer dues, inventory totals)
- Debounce Firebase listener updates (300ms)
- Batch multiple state updates together
- Use React.memo for expensive components

**Network Optimization:**
- Minimize Firebase reads with efficient queries
- Batch write operations when possible
- Implement optimistic updates for better UX
- Use Firebase offline persistence

### Performance Monitoring

**Metrics to Track:**
- Operation duration (flag if > 2 seconds)
- Firebase read/write counts
- Component render times
- Memory usage patterns
- Network request sizes

**Performance Budgets:**
- Initial page load: < 3 seconds
- Transaction creation: < 1 second
- Customer list render: < 500ms
- Search results: < 300ms

## Security Considerations

### Authentication and Authorization

**Firebase Security Rules:**
```javascript
{
  "rules": {
    "customers": {
      "$customerId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "transactions": {
      "$transactionId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "fabrics": {
      "$fabricId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### Input Validation and Sanitization

**Validation Rules:**
- Customer name: Required, 1-100 characters, alphanumeric with spaces
- Phone: Required, valid phone format
- Email: Optional, valid email format
- Amounts: Required, positive numbers, max 2 decimal places
- Dates: Required, valid ISO date format

**Sanitization:**
- Strip HTML tags from text inputs
- Escape special characters in search queries
- Validate numeric inputs are within acceptable ranges
- Reject inputs with SQL injection patterns

### Data Protection

**Sensitive Data Handling:**
- Never log customer phone numbers or emails in plain text
- Use environment variables for Firebase credentials
- Implement session timeout (30 minutes default)
- Clear sensitive data from memory after use

## Migration Strategy

### Phased Implementation

**Phase 1: Testing Infrastructure (Week 1-2)**
- Set up Jest and React Testing Library
- Configure Firebase emulator
- Create test utilities and generators
- Write initial unit tests for services

**Phase 2: Error Handling (Week 3)**
- Implement AppError class
- Add error classification logic
- Enhance logging with context
- Add error boundaries to UI

**Phase 3: Transaction Organization (Week 4-5)**
- Implement memo grouping logic
- Add payment linking functionality
- Create customer transaction views
- Update due calculation logic

**Phase 4: Type Safety (Week 6)**
- Add JSDoc annotations to all services
- Document data model types
- Add runtime validation for Firebase responses
- Create type definition files

**Phase 5: Performance & Offline (Week 7-8)**
- Implement performance tracking
- Enhance offline queue processing
- Add optimistic updates
- Optimize Firebase queries

**Phase 6: Security & Documentation (Week 9-10)**
- Update Firebase security rules
- Add input sanitization
- Write comprehensive documentation
- Create developer onboarding guide

### Backward Compatibility

**Data Migration:**
- Existing transactions remain unchanged
- New memo grouping logic works with existing data
- No breaking changes to Firebase structure
- Gradual rollout of new features

**API Compatibility:**
- Maintain existing service method signatures
- Add new methods without removing old ones
- Deprecate old methods with warnings
- Provide migration guides for breaking changes

## Deployment and Rollback

### Deployment Strategy

**Continuous Integration:**
- Run all tests on every commit
- Require passing tests before merge
- Automated deployment to staging
- Manual approval for production

**Feature Flags:**
- Enable new features gradually
- A/B test performance improvements
- Quick rollback if issues detected
- Monitor error rates and performance

### Rollback Plan

**Rollback Triggers:**
- Error rate increases > 5%
- Performance degrades > 20%
- Critical bug discovered
- User complaints spike

**Rollback Process:**
1. Disable feature flag
2. Revert to previous deployment
3. Investigate root cause
4. Fix and redeploy

## Success Metrics

### Code Quality Metrics

- Test coverage: > 80%
- Property test coverage: All critical properties tested
- Documentation coverage: 100% of public APIs
- Linting errors: 0
- Type annotation coverage: > 90%

### Performance Metrics

- Average operation time: < 500ms
- Slow operations: < 5% of total
- Page load time: < 3 seconds
- Time to interactive: < 2 seconds

### Reliability Metrics

- Error rate: < 1%
- Offline queue success rate: > 95%
- Data consistency: 100%
- Uptime: > 99.9%

### User Experience Metrics

- Task completion rate: > 95%
- User error rate: < 5%
- Customer satisfaction: > 4.5/5
- Feature adoption: > 70% within 3 months
