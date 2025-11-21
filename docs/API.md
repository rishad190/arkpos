# API Documentation

This document provides comprehensive API documentation for all service classes in the BhaiyaPos system.

## Table of Contents

- [AtomicOperationService](#atomicoperationservice)
- [CustomerService](#customerservice)
- [TransactionService](#transactionservice)
- [FabricService](#fabricservice)
- [SupplierService](#supplierservice)
- [CashTransactionService](#cashtransactionservice)
- [BackupService](#backupservice)

---

## AtomicOperationService

**Location**: `src/services/atomicOperations.js`

Provides transaction-like behavior for multi-step Firebase operations with automatic rollback, offline queue management, and performance tracking.

### Constructor

```javascript
new AtomicOperationService(database, logger, performanceTracker)
```

**Parameters**:
- `database` (Database): Firebase database instance
- `logger` (Logger): Logger instance for operation tracking
- `performanceTracker` (PerformanceTracker): Performance monitoring instance

### Methods

#### execute(operationName, operationFn, rollbackFn)

Execute an atomic operation with automatic rollback on failure.

```javascript
await atomicOperations.execute(
  'createCustomerWithTransaction',
  async () => {
    // Operation logic
    return result;
  },
  async () => {
    // Rollback logic (optional)
  }
);
```

**Parameters**:
- `operationName` (string): Name of the operation for logging
- `operationFn` (Function): Async function containing the operation logic
- `rollbackFn` (Function, optional): Async function to rollback on failure

**Returns**: `Promise<any>` - Result from operationFn

**Throws**: `AppError` - If operation fails

**Example**:
```javascript
const customerId = await atomicOperations.execute(
  'createCustomerWithInitialTransaction',
  async () => {
    const customerId = await customerService.addCustomer({
      name: 'John Doe',
      phone: '1234567890'
    });
    
    await transactionService.addTransaction({
      customerId,
      total: 1000,
      deposit: 500,
      due: 500
    });
    
    return customerId;
  },
  async () => {
    // Rollback: delete customer if transaction fails
    await customerService.deleteCustomer(customerId);
  }
);
```

#### processOfflineQueue()

Process all queued operations when connection is restored.

```javascript
await atomicOperations.processOfflineQueue();
```

**Returns**: `Promise<void>`

**Behavior**:
- Processes operations in FIFO order
- Retries failed operations with exponential backoff
- Removes successfully processed operations from queue
- Logs all processing results

---

## CustomerService

**Location**: `src/services/customerService.js`

Manages customer CRUD operations, validation, and due calculations.

### Methods

#### addCustomer(data)

Create a new customer.

```javascript
const customerId = await customerService.addCustomer({
  name: 'John Doe',
  phone: '1234567890',
  address: '123 Main St',
  email: 'john@example.com'
});
```

**Parameters**:
- `data` (Object): Customer data
  - `name` (string, required): Customer name (1-100 characters)
  - `phone` (string, required): Phone number
  - `address` (string, optional): Customer address
  - `email` (string, optional): Email address (valid format)

**Returns**: `Promise<string>` - Customer ID

**Throws**: `AppError` with type `VALIDATION` if data is invalid

**Validation Rules**:
- Name: Required, 1-100 characters, alphanumeric with spaces
- Phone: Required, valid phone format
- Email: Optional, valid email format if provided

#### updateCustomer(id, data)

Update an existing customer.

```javascript
await customerService.updateCustomer('customer123', {
  name: 'Jane Doe',
  phone: '0987654321'
});
```

**Parameters**:
- `id` (string, required): Customer ID
- `data` (Object, required): Updated customer data (same structure as addCustomer)

**Returns**: `Promise<void>`

**Throws**: 
- `AppError` with type `NOT_FOUND` if customer doesn't exist
- `AppError` with type `VALIDATION` if data is invalid

#### deleteCustomer(id, transactions)

Delete a customer and cascade delete all associated transactions.

```javascript
await customerService.deleteCustomer('customer123', customerTransactions);
```

**Parameters**:
- `id` (string, required): Customer ID
- `transactions` (Array<Transaction>, required): Customer's transactions to delete

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `NOT_FOUND` if customer doesn't exist

**Behavior**:
- Deletes customer record
- Deletes all associated transactions
- Operation is atomic (all or nothing)

#### getCustomer(id)

Retrieve a customer by ID.

```javascript
const customer = await customerService.getCustomer('customer123');
```

**Parameters**:
- `id` (string, required): Customer ID

**Returns**: `Promise<Customer | null>` - Customer object or null if not found

**Customer Object**:
```javascript
{
  id: 'customer123',
  name: 'John Doe',
  phone: '1234567890',
  address: '123 Main St',
  email: 'john@example.com',
  totalDue: 5000,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z'
}
```

#### getAllCustomers()

Retrieve all customers.

```javascript
const customers = await customerService.getAllCustomers();
```

**Returns**: `Promise<Array<Customer>>` - Array of customer objects

#### searchCustomers(query)

Search customers by name or phone.

```javascript
const results = await customerService.searchCustomers('john');
```

**Parameters**:
- `query` (string, required): Search query

**Returns**: `Promise<Array<Customer>>` - Matching customers

**Behavior**:
- Case-insensitive search
- Searches in name and phone fields
- Returns partial matches

#### calculateCustomerDue(customerId)

Calculate total outstanding dues for a customer.

```javascript
const totalDue = await customerService.calculateCustomerDue('customer123');
```

**Parameters**:
- `customerId` (string, required): Customer ID

**Returns**: `Promise<number>` - Total due amount

**Calculation**:
- Sums all transaction dues
- Subtracts all payments
- Returns net due amount

---

## TransactionService

**Location**: `src/services/transactionService.js`

Manages sales transactions and payments with memo-based organization.

### Methods

#### addTransaction(data)

Create a new transaction (sale or payment).

```javascript
const transactionId = await transactionService.addTransaction({
  customerId: 'customer123',
  memoNumber: 'MEMO-001',
  type: 'sale',
  total: 1000,
  deposit: 500,
  due: 500,
  date: '2024-01-01',
  products: [
    {
      fabricId: 'fabric123',
      quantity: 10,
      rate: 100
    }
  ]
});
```

**Parameters**:
- `data` (Object): Transaction data
  - `customerId` (string, required): Customer ID
  - `memoNumber` (string, required): Memo number
  - `type` (string, required): 'sale' or 'payment'
  - `total` (number, required): Total amount
  - `deposit` (number, required): Deposit/payment amount
  - `due` (number, required): Due amount
  - `date` (string, required): Transaction date (ISO format)
  - `products` (Array<Product>, required for sales): Product details

**Returns**: `Promise<string>` - Transaction ID

**Throws**: `AppError` with type `VALIDATION` if data is invalid

#### updateTransaction(id, data)

Update an existing transaction.

```javascript
await transactionService.updateTransaction('txn123', {
  deposit: 700,
  due: 300
});
```

**Parameters**:
- `id` (string, required): Transaction ID
- `data` (Object, required): Updated transaction data

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `NOT_FOUND` if transaction doesn't exist

#### deleteTransaction(id)

Delete a transaction.

```javascript
await transactionService.deleteTransaction('txn123');
```

**Parameters**:
- `id` (string, required): Transaction ID

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `NOT_FOUND` if transaction doesn't exist

#### getCustomerTransactionsByMemo(customerId)

Get all transactions for a customer, grouped by memo.

```javascript
const memoGroups = await transactionService.getCustomerTransactionsByMemo('customer123');
```

**Parameters**:
- `customerId` (string, required): Customer ID

**Returns**: `Promise<Array<MemoGroup>>` - Array of memo groups

**MemoGroup Object**:
```javascript
{
  memoNumber: 'MEMO-001',
  customerId: 'customer123',
  customerName: 'John Doe',
  saleDate: '2024-01-01',
  totalAmount: 1000,
  paidAmount: 500,
  dueAmount: 500,
  saleTransaction: {
    id: 'txn123',
    products: [...],
    total: 1000,
    initialDeposit: 500
  },
  paymentTransactions: [
    {
      id: 'txn124',
      date: '2024-01-15',
      amount: 200,
      paymentMethod: 'cash'
    }
  ],
  status: 'partial' // 'paid' | 'partial' | 'unpaid'
}
```

#### getMemoDetails(memoNumber)

Get detailed information about a specific memo.

```javascript
const memoDetails = await transactionService.getMemoDetails('MEMO-001');
```

**Parameters**:
- `memoNumber` (string, required): Memo number

**Returns**: `Promise<MemoDetails>` - Memo details

**MemoDetails Object**:
```javascript
{
  memoNumber: 'MEMO-001',
  saleTransaction: {...},
  paymentTransactions: [...],
  remainingDue: 300
}
```

#### addPaymentToMemo(memoNumber, paymentData)

Add a payment to a specific memo.

```javascript
const paymentId = await transactionService.addPaymentToMemo('MEMO-001', {
  customerId: 'customer123',
  amount: 200,
  paymentMethod: 'cash',
  date: '2024-01-15',
  note: 'Partial payment'
});
```

**Parameters**:
- `memoNumber` (string, required): Memo number
- `paymentData` (Object, required): Payment details
  - `customerId` (string, required): Customer ID
  - `amount` (number, required): Payment amount
  - `paymentMethod` (string, required): Payment method
  - `date` (string, required): Payment date
  - `note` (string, optional): Payment note

**Returns**: `Promise<string>` - Payment transaction ID

**Throws**: `AppError` with type `NOT_FOUND` if memo doesn't exist

#### calculateCustomerTotalDue(customerId)

Calculate total due for a customer across all memos.

```javascript
const totalDue = await transactionService.calculateCustomerTotalDue('customer123');
```

**Parameters**:
- `customerId` (string, required): Customer ID

**Returns**: `Promise<number>` - Total due amount

---

## FabricService

**Location**: `src/services/fabricService.js`

Manages inventory (fabric) operations with FIFO batch tracking.

### Methods

#### addFabric(data)

Create a new fabric item.

```javascript
const fabricId = await fabricService.addFabric({
  name: 'Cotton Fabric',
  category: 'Cotton',
  unit: 'meters'
});
```

**Parameters**:
- `data` (Object): Fabric data
  - `name` (string, required): Fabric name
  - `category` (string, required): Fabric category
  - `unit` (string, required): Unit of measurement

**Returns**: `Promise<string>` - Fabric ID

**Throws**: `AppError` with type `VALIDATION` if data is invalid

#### updateFabric(id, data)

Update fabric details.

```javascript
await fabricService.updateFabric('fabric123', {
  name: 'Premium Cotton Fabric',
  category: 'Premium Cotton'
});
```

**Parameters**:
- `id` (string, required): Fabric ID
- `data` (Object, required): Updated fabric data

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `NOT_FOUND` if fabric doesn't exist

#### deleteFabric(id)

Delete a fabric item.

```javascript
await fabricService.deleteFabric('fabric123');
```

**Parameters**:
- `id` (string, required): Fabric ID

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `NOT_FOUND` if fabric doesn't exist

#### addBatch(fabricId, batchData)

Add a new inventory batch for a fabric.

```javascript
const batchId = await fabricService.addBatch('fabric123', {
  items: [
    { colorName: 'Red', quantity: 100, colorCode: '#FF0000' },
    { colorName: 'Blue', quantity: 50, colorCode: '#0000FF' }
  ],
  purchaseDate: '2024-01-01',
  unitCost: 50,
  supplier: 'Supplier ABC'
});
```

**Parameters**:
- `fabricId` (string, required): Fabric ID
- `batchData` (Object, required): Batch details
  - `items` (Array<Item>, required): Batch items
  - `purchaseDate` (string, required): Purchase date
  - `unitCost` (number, required): Cost per unit
  - `supplier` (string, required): Supplier name

**Returns**: `Promise<string>` - Batch ID

**Throws**: `AppError` with type `NOT_FOUND` if fabric doesn't exist

#### reduceInventory(fabricId, quantity)

Reduce inventory using FIFO strategy.

```javascript
const usedBatches = await fabricService.reduceInventory('fabric123', 75);
```

**Parameters**:
- `fabricId` (string, required): Fabric ID
- `quantity` (number, required): Quantity to reduce

**Returns**: `Promise<Array<BatchUsage>>` - Array of batches used

**BatchUsage Object**:
```javascript
{
  batchId: 'batch123',
  quantityUsed: 50,
  remainingInBatch: 0
}
```

**Throws**: 
- `AppError` with type `NOT_FOUND` if fabric doesn't exist
- `AppError` with type `VALIDATION` if insufficient stock

**Behavior**:
- Uses oldest batches first (FIFO)
- Prevents negative stock levels
- Returns details of batches used

#### getBatchHistory(fabricId)

Get batch purchase history for a fabric.

```javascript
const history = await fabricService.getBatchHistory('fabric123');
```

**Parameters**:
- `fabricId` (string, required): Fabric ID

**Returns**: `Promise<Array<Batch>>` - Array of batches sorted by date

---

## SupplierService

**Location**: `src/services/supplierService.js`

Manages supplier operations and purchase tracking.

### Methods

#### addSupplier(data)

Create a new supplier.

```javascript
const supplierId = await supplierService.addSupplier({
  name: 'Supplier ABC',
  phone: '1234567890',
  address: '456 Supplier St'
});
```

**Parameters**:
- `data` (Object): Supplier data
  - `name` (string, required): Supplier name
  - `phone` (string, required): Phone number
  - `address` (string, optional): Supplier address

**Returns**: `Promise<string>` - Supplier ID

**Throws**: `AppError` with type `VALIDATION` if data is invalid

#### updateSupplier(id, data)

Update supplier details.

```javascript
await supplierService.updateSupplier('supplier123', {
  name: 'Supplier XYZ',
  phone: '0987654321'
});
```

**Parameters**:
- `id` (string, required): Supplier ID
- `data` (Object, required): Updated supplier data

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `NOT_FOUND` if supplier doesn't exist

#### deleteSupplier(id)

Delete a supplier.

```javascript
await supplierService.deleteSupplier('supplier123');
```

**Parameters**:
- `id` (string, required): Supplier ID

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `NOT_FOUND` if supplier doesn't exist

#### addPurchaseTransaction(data)

Record a purchase transaction.

```javascript
const transactionId = await supplierService.addPurchaseTransaction({
  supplierId: 'supplier123',
  fabricId: 'fabric123',
  quantity: 100,
  unitCost: 50,
  totalCost: 5000,
  date: '2024-01-01'
});
```

**Parameters**:
- `data` (Object): Purchase transaction data
  - `supplierId` (string, required): Supplier ID
  - `fabricId` (string, required): Fabric ID
  - `quantity` (number, required): Quantity purchased
  - `unitCost` (number, required): Cost per unit
  - `totalCost` (number, required): Total cost
  - `date` (string, required): Purchase date

**Returns**: `Promise<string>` - Transaction ID

**Throws**: `AppError` with type `VALIDATION` if data is invalid

#### addPayment(supplierId, paymentData)

Record a payment to supplier.

```javascript
const paymentId = await supplierService.addPayment('supplier123', {
  amount: 2000,
  date: '2024-01-15',
  paymentMethod: 'bank transfer',
  note: 'Partial payment'
});
```

**Parameters**:
- `supplierId` (string, required): Supplier ID
- `paymentData` (Object, required): Payment details
  - `amount` (number, required): Payment amount
  - `date` (string, required): Payment date
  - `paymentMethod` (string, required): Payment method
  - `note` (string, optional): Payment note

**Returns**: `Promise<string>` - Payment ID

**Throws**: `AppError` with type `NOT_FOUND` if supplier doesn't exist

#### calculateSupplierDue(supplierId)

Calculate outstanding dues for a supplier.

```javascript
const totalDue = await supplierService.calculateSupplierDue('supplier123');
```

**Parameters**:
- `supplierId` (string, required): Supplier ID

**Returns**: `Promise<number>` - Total due amount

---

## CashTransactionService

**Location**: `src/services/cashTransactionService.js`

Manages cash book operations.

### Methods

#### addCashTransaction(data)

Record a cash transaction.

```javascript
const transactionId = await cashTransactionService.addCashTransaction({
  type: 'income',
  amount: 5000,
  category: 'sales',
  description: 'Cash sale',
  date: '2024-01-01'
});
```

**Parameters**:
- `data` (Object): Cash transaction data
  - `type` (string, required): 'income' or 'expense'
  - `amount` (number, required): Transaction amount
  - `category` (string, required): Transaction category
  - `description` (string, required): Description
  - `date` (string, required): Transaction date

**Returns**: `Promise<string>` - Transaction ID

**Throws**: `AppError` with type `VALIDATION` if data is invalid

#### updateCashTransaction(id, data)

Update a cash transaction.

```javascript
await cashTransactionService.updateCashTransaction('txn123', {
  amount: 5500,
  description: 'Updated cash sale'
});
```

**Parameters**:
- `id` (string, required): Transaction ID
- `data` (Object, required): Updated transaction data

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `NOT_FOUND` if transaction doesn't exist

#### deleteCashTransaction(id)

Delete a cash transaction.

```javascript
await cashTransactionService.deleteCashTransaction('txn123');
```

**Parameters**:
- `id` (string, required): Transaction ID

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `NOT_FOUND` if transaction doesn't exist

#### getCashBalance()

Calculate current cash balance.

```javascript
const balance = await cashTransactionService.getCashBalance();
```

**Returns**: `Promise<number>` - Current cash balance

**Calculation**:
- Sums all income transactions
- Subtracts all expense transactions
- Returns net balance

#### getCashTransactionsByDateRange(startDate, endDate)

Get cash transactions within a date range.

```javascript
const transactions = await cashTransactionService.getCashTransactionsByDateRange(
  '2024-01-01',
  '2024-01-31'
);
```

**Parameters**:
- `startDate` (string, required): Start date (ISO format)
- `endDate` (string, required): End date (ISO format)

**Returns**: `Promise<Array<CashTransaction>>` - Transactions in range

---

## BackupService

**Location**: `src/services/backupService.js`

Manages data backup and export operations.

### Methods

#### exportAllData()

Export all application data.

```javascript
const backup = await backupService.exportAllData();
```

**Returns**: `Promise<Object>` - Complete data backup

**Backup Object**:
```javascript
{
  customers: [...],
  transactions: [...],
  fabrics: [...],
  suppliers: [...],
  cashTransactions: [...],
  expenses: [...],
  exportDate: '2024-01-01T00:00:00.000Z',
  version: '1.0'
}
```

#### importData(backupData)

Import data from backup.

```javascript
await backupService.importData(backupData);
```

**Parameters**:
- `backupData` (Object, required): Backup data object

**Returns**: `Promise<void>`

**Throws**: `AppError` with type `VALIDATION` if backup data is invalid

**Behavior**:
- Validates backup structure
- Merges with existing data
- Prevents duplicate entries
- Logs import results

---

## Error Handling

All service methods throw `AppError` instances with the following structure:

```javascript
{
  message: 'Error description',
  type: 'NETWORK' | 'VALIDATION' | 'PERMISSION' | 'NOT_FOUND' | 'CONFLICT',
  context: {
    // Additional error context
  },
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

### Error Types

- **NETWORK**: Connection failures, timeouts, Firebase unavailable
- **VALIDATION**: Invalid input data, business rule violations
- **PERMISSION**: Authentication failures, authorization denials
- **NOT_FOUND**: Requested resource doesn't exist
- **CONFLICT**: Concurrent modification conflicts, race conditions

### Error Handling Example

```javascript
try {
  await customerService.addCustomer(customerData);
} catch (error) {
  if (error.type === 'VALIDATION') {
    // Display validation errors to user
    console.error('Validation failed:', error.context.errors);
  } else if (error.type === 'NETWORK') {
    // Retry or queue for offline processing
    console.error('Network error, will retry');
  } else {
    // Handle other errors
    console.error('Unexpected error:', error.message);
  }
}
```

---

## Type Definitions

For complete type definitions, see `src/types/models.js`.

### Common Types

```javascript
/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} name
 * @property {string} phone
 * @property {string} [address]
 * @property {string} [email]
 * @property {number} totalDue
 * @property {string} createdAt
 * @property {string} [updatedAt]
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} customerId
 * @property {string} memoNumber
 * @property {string} type - 'sale' | 'payment'
 * @property {number} total
 * @property {number} deposit
 * @property {number} due
 * @property {string} date
 * @property {Array<Product>} products
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Fabric
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} unit
 * @property {Object<string, Batch>} batches
 * @property {string} createdAt
 */
```
