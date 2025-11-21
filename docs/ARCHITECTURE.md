# Architecture Documentation

## Overview

BhaiyaPos is a Point of Sale system built with Next.js and Firebase Realtime Database. The architecture follows a layered pattern with clear separation of concerns, enabling maintainability, testability, and scalability.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│  (React Components, Pages, UI)                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              State Management Layer                      │
│  (React Context: AuthContext, DataContext)              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Service Layer                            │
│  (Business Logic, Validation, Operations)               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Data Access Layer                           │
│  (Firebase Realtime Database, Authentication)           │
└─────────────────────────────────────────────────────────┘
```

## Layer Details

### 1. Presentation Layer

**Location**: `src/app/`, `src/components/`

**Responsibilities**:
- Render UI components
- Handle user interactions
- Display data from state management layer
- Manage local component state
- Route navigation

**Key Components**:
- **Pages**: Route-based components in `src/app/`
- **UI Components**: Reusable components in `src/components/ui/`
- **Feature Components**: Business-specific components (dialogs, tables, forms)
- **Common Components**: Shared utilities (DataTable, PageHeader, EmptyState)

**Design Principles**:
- Components should be focused and single-purpose
- Separate presentational and container components
- Use composition over inheritance
- Keep business logic out of components

### 2. State Management Layer

**Location**: `src/contexts/`

**Components**:

#### AuthContext (`auth-context.js`)
Manages authentication state and user session.

**State**:
```javascript
{
  user: User | null,
  loading: boolean,
  error: Error | null
}
```

**Methods**:
- `login(email, password)`: Authenticate user
- `logout()`: Sign out user
- `resetPassword(email)`: Send password reset email

#### DataContext (`data-context.js`)
Manages application data and Firebase listeners.

**State**:
```javascript
{
  customers: Array<Customer>,
  transactions: Array<Transaction>,
  fabrics: Array<Fabric>,
  suppliers: Array<Supplier>,
  cashTransactions: Array<CashTransaction>,
  expenses: Array<Expense>,
  loading: boolean,
  error: Error | null,
  connectionState: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'
}
```

**Methods**:
- CRUD operations for all entities
- Real-time listener management
- Offline queue processing
- Data refresh and synchronization

**Design Patterns**:
- Reducer pattern for state updates
- Debounced Firebase listeners (300ms)
- Optimistic UI updates with rollback
- Offline operation queueing

### 3. Service Layer

**Location**: `src/services/`

The service layer encapsulates all business logic and Firebase operations, providing a clean API for the state management layer.

#### AtomicOperationService (`atomicOperations.js`)

Provides transaction-like behavior for multi-step operations.

**Key Features**:
- Execute multiple Firebase operations atomically
- Automatic rollback on failure
- Offline queue management
- Performance tracking
- Retry logic with exponential backoff

**Usage Example**:
```javascript
await atomicOperations.execute(
  'createCustomerWithTransaction',
  async () => {
    const customerId = await customerService.addCustomer(customerData);
    await transactionService.addTransaction({ ...txnData, customerId });
    return customerId;
  },
  async () => {
    // Rollback logic if needed
  }
);
```

#### CustomerService (`customerService.js`)

Manages customer operations.

**Methods**:
- `addCustomer(data)`: Create new customer
- `updateCustomer(id, data)`: Update customer details
- `deleteCustomer(id, transactions)`: Delete customer and cascade to transactions
- `getCustomer(id)`: Retrieve customer by ID
- `getAllCustomers()`: Get all customers
- `searchCustomers(query)`: Search customers by name/phone
- `calculateCustomerDue(customerId)`: Calculate total outstanding dues

**Validation**:
- Name: Required, 1-100 characters
- Phone: Required, valid format
- Email: Optional, valid format

#### TransactionService (`transactionService.js`)

Manages sales transactions and payments with memo-based organization.

**Methods**:
- `addTransaction(data)`: Create new transaction
- `updateTransaction(id, data)`: Update transaction
- `deleteTransaction(id)`: Delete transaction
- `getCustomerTransactionsByMemo(customerId)`: Get transactions grouped by memo
- `getMemoDetails(memoNumber)`: Get memo with all payments
- `addPaymentToMemo(memoNumber, paymentData)`: Add payment to specific memo
- `calculateCustomerTotalDue(customerId)`: Calculate total due across all memos

**Memo Organization**:
Transactions are organized by memo number, with each memo containing:
- Original sale transaction
- All payment transactions
- Calculated due amount

#### FabricService (`fabricService.js`)

Manages inventory (fabric) operations with FIFO batch tracking.

**Methods**:
- `addFabric(data)`: Create new fabric
- `updateFabric(id, data)`: Update fabric details
- `deleteFabric(id)`: Delete fabric
- `addBatch(fabricId, batchData)`: Add new inventory batch
- `reduceInventory(fabricId, quantity)`: Reduce inventory using FIFO
- `getBatchHistory(fabricId)`: Get batch purchase history

**FIFO Logic**:
When reducing inventory, the system:
1. Sorts batches by purchase date (oldest first)
2. Deducts from oldest batches first
3. Prevents negative stock levels
4. Tracks which batches were used

#### SupplierService (`supplierService.js`)

Manages supplier operations and purchase tracking.

**Methods**:
- `addSupplier(data)`: Create new supplier
- `updateSupplier(id, data)`: Update supplier details
- `deleteSupplier(id)`: Delete supplier
- `addPurchaseTransaction(data)`: Record purchase
- `addPayment(supplierId, paymentData)`: Record payment to supplier
- `calculateSupplierDue(supplierId)`: Calculate outstanding dues

#### CashTransactionService (`cashTransactionService.js`)

Manages cash book operations.

**Methods**:
- `addCashTransaction(data)`: Record cash transaction
- `updateCashTransaction(id, data)`: Update transaction
- `deleteCashTransaction(id)`: Delete transaction
- `getCashBalance()`: Calculate current cash balance
- `getCashTransactionsByDateRange(startDate, endDate)`: Get transactions in range

### 4. Data Access Layer

**Technology**: Firebase Realtime Database

**Database Structure**:
```
firebase-root/
├── customers/
│   └── {customerId}/
│       ├── id
│       ├── name
│       ├── phone
│       ├── address
│       ├── email
│       ├── totalDue
│       └── createdAt
├── transactions/
│   └── {transactionId}/
│       ├── id
│       ├── customerId
│       ├── memoNumber
│       ├── type (sale | payment)
│       ├── total
│       ├── deposit
│       ├── due
│       ├── date
│       ├── products[]
│       └── createdAt
├── fabrics/
│   └── {fabricId}/
│       ├── id
│       ├── name
│       ├── category
│       ├── unit
│       ├── batches/
│       │   └── {batchId}/
│       │       ├── items[]
│       │       ├── purchaseDate
│       │       ├── unitCost
│       │       └── supplier
│       └── createdAt
├── suppliers/
│   └── {supplierId}/
│       ├── id
│       ├── name
│       ├── phone
│       ├── address
│       └── createdAt
├── cashTransactions/
│   └── {transactionId}/
│       ├── id
│       ├── type (income | expense)
│       ├── amount
│       ├── category
│       ├── description
│       ├── date
│       └── createdAt
└── expenses/
    └── {expenseId}/
        ├── id
        ├── category
        ├── amount
        ├── description
        ├── date
        └── createdAt
```

**Security Rules**: See `database.rules.json`

**Indexes**: See `firebase-indexes.json`

### 5. Utility Layer

**Location**: `src/lib/`, `src/utils/`

**Key Utilities**:

- **Error Handling** (`errors.js`): AppError class, error classification
- **Validation** (`validation.js`): Input validation functions
- **Sanitization** (`sanitization.js`): Input sanitization
- **Calculations** (`calculations.js`): Business calculations
- **Performance Tracking** (`performanceTracker.js`): Operation monitoring
- **Memoization** (`memoization.js`): Caching expensive computations
- **Pagination** (`pagination.js`): List pagination utilities
- **Session Management** (`sessionManager.js`): Session timeout handling
- **Logger** (`logger.js`): Structured logging

## Design Patterns

### 1. Service Pattern

All business logic is encapsulated in service classes, providing:
- Clear API boundaries
- Testability through mocking
- Reusability across components
- Centralized validation and error handling

### 2. Atomic Operations Pattern

Multi-step operations are wrapped in atomic transactions:
- All operations succeed or all fail
- Automatic rollback on error
- Offline queue support
- Performance tracking

### 3. Context Pattern

Global state management using React Context:
- Centralized state
- Prop drilling elimination
- Real-time data synchronization
- Optimistic updates

### 4. Repository Pattern

Services act as repositories, abstracting data access:
- Hide Firebase implementation details
- Provide domain-specific methods
- Enable easy testing with mocks
- Support offline-first architecture

### 5. Error Boundary Pattern

Graceful error handling in UI:
- Catch component errors
- Display user-friendly messages
- Log errors for debugging
- Prevent app crashes

## Data Flow

### Read Flow (Customer List Example)

```
1. Component mounts
   └─> useContext(DataContext)
       └─> DataContext checks cache
           └─> If empty, fetch from Firebase
               └─> Firebase listener established
                   └─> Data flows to context state
                       └─> Component re-renders with data
```

### Write Flow (Create Transaction Example)

```
1. User submits form
   └─> Component calls context method
       └─> Context calls TransactionService
           └─> Service validates input
               └─> Service calls AtomicOperationService
                   └─> Atomic operation executes Firebase write
                       └─> Firebase listener triggers
                           └─> Context updates state
                               └─> Component re-renders
```

### Offline Flow

```
1. User performs action while offline
   └─> Context detects offline state
       └─> Operation added to offline queue
           └─> Optimistic UI update applied
               └─> Connection restored
                   └─> Queue processor executes operations
                       └─> Success: Keep optimistic update
                       └─> Failure: Rollback optimistic update
```

## Performance Optimizations

### 1. Debounced Firebase Listeners

Firebase listeners are debounced (300ms) to prevent excessive re-renders during rapid updates.

### 2. Memoization

Expensive calculations are memoized:
- Customer due calculations
- Inventory totals
- Report aggregations

### 3. Pagination

Large lists are paginated:
- Customer list: 50 items per page
- Transaction list: 100 items per page
- Inventory list: 50 items per page

### 4. Lazy Loading

Data is loaded on-demand:
- Transaction details loaded when viewing customer
- Batch history loaded when viewing fabric
- Reports generated on request

### 5. Query Optimization

Firebase queries use indexes for performance:
- Customer search by name/phone
- Transaction filtering by date range
- Inventory filtering by category

## Security Architecture

### Authentication

- Firebase Authentication for user management
- Session timeout after 30 minutes of inactivity
- Automatic token refresh
- Secure credential storage

### Authorization

Firebase security rules enforce:
- All operations require authentication
- Users can only access their own data
- Read/write permissions per collection

### Input Validation

Multi-layer validation:
1. Client-side validation in forms
2. Service layer validation
3. Firebase security rules validation

### Data Sanitization

All user input is sanitized:
- HTML tags stripped
- Special characters escaped
- SQL injection patterns rejected

## Error Handling Architecture

### Error Classification

Errors are classified into five types:
- **NETWORK**: Connection failures, timeouts
- **VALIDATION**: Invalid input, business rule violations
- **PERMISSION**: Authentication/authorization failures
- **NOT_FOUND**: Resource doesn't exist
- **CONFLICT**: Concurrent modification conflicts

### Error Recovery

- Network errors: Retry with exponential backoff
- Validation errors: Display to user immediately
- Permission errors: Redirect to login
- Not found errors: Show user-friendly message
- Conflict errors: Retry after refreshing data

### Error Logging

All errors are logged with:
- Timestamp
- Error type and message
- Stack trace
- Operation context
- User information (if available)

## Testing Architecture

### Test Pyramid

```
        ┌─────────────┐
        │   E2E Tests │  (Manual testing)
        └─────────────┘
       ┌───────────────┐
       │ Integration   │  (Firebase emulator)
       │     Tests     │
       └───────────────┘
      ┌─────────────────┐
      │  Property-Based │  (fast-check)
      │      Tests      │
      └─────────────────┘
     ┌───────────────────┐
     │    Unit Tests     │  (Jest)
     └───────────────────┘
```

### Test Strategy

1. **Unit Tests**: Test individual functions in isolation
2. **Property-Based Tests**: Verify universal properties across many inputs
3. **Integration Tests**: Test complete workflows with Firebase emulator
4. **Performance Tests**: Benchmark critical operations

See [TESTING.md](TESTING.md) for detailed testing documentation.

## Deployment Architecture

### Development Environment

- Local development server: `npm run dev`
- Firebase emulator for testing
- Hot module replacement enabled

### Production Environment

- Next.js production build
- Firebase Realtime Database (production)
- Firebase Authentication (production)
- Deployed on Vercel/Firebase Hosting

### CI/CD Pipeline

1. Run linter
2. Run all tests with coverage
3. Build production bundle
4. Deploy to staging
5. Manual approval
6. Deploy to production

## Scalability Considerations

### Current Limitations

- Single Firebase Realtime Database instance
- Client-side data processing
- No server-side rendering for dynamic data

### Future Improvements

- Implement server-side rendering for better performance
- Add caching layer (Redis)
- Implement data sharding for large datasets
- Add background job processing
- Implement real-time analytics

## Monitoring and Observability

### Performance Monitoring

- Operation duration tracking
- Slow operation flagging (> 2 seconds)
- Firebase read/write counts
- Component render times

### Error Monitoring

- Error rate tracking
- Error classification metrics
- Stack trace collection
- User impact analysis

### Logging

- Structured JSON logs
- Log levels: DEBUG, INFO, WARN, ERROR
- Context-rich error logs
- Performance metrics logging

## Conclusion

The BhaiyaPos architecture provides a solid foundation for a maintainable, testable, and scalable POS system. The layered approach with clear separation of concerns enables easy extension and modification while maintaining code quality and reliability.
