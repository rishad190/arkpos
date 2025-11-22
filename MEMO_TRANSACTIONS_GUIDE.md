# Memo-wise Transactions Guide

## Overview
The memo-wise transactions feature allows tracking customer sales and payments organized by memo numbers. Each memo represents a sale transaction, and multiple payment transactions can be linked to it for tracking partial payments and outstanding dues.

## Fixed Issues

### 1. Initialization Error (RESOLVED ✓)
**Problem:** `Cannot access 'atomicOperations' before initialization`
**Solution:** Moved the `atomicOperations` initialization before the `useEffect` that depends on it in `src/contexts/data-context.js`

### 2. Infinite Loop Error (RESOLVED ✓)
**Problem:** Maximum update depth exceeded due to `atomicOperations` being recreated on every state change
**Solution:** Removed `state` from the `atomicOperations` useMemo dependencies, keeping only `dispatch`. The service receives a function `() => state` that always accesses the latest state without needing it in dependencies.

## How It Works

### Data Structure

Each memo group contains:
```javascript
{
  memoNumber: "MEMO-001",
  customerId: "customer123",
  saleTransaction: {...},        // Original sale
  paymentTransactions: [...],    // All payments
  totalAmount: 1000,             // Total sale amount
  paidAmount: 700,               // Sum of all payments
  dueAmount: 300,                // Remaining due
  saleDate: "2024-01-15",        // Date of sale
  status: "partial"              // paid/partial/unpaid
}
```

### Transaction Types

1. **Sale Transaction** (`type: 'sale'` or no type)
   - Contains product details and total amount
   - Has initial deposit field
   - Linked by memo number

2. **Payment Transaction** (`type: 'payment'`)
   - Records subsequent payments
   - Linked to memo by memo number
   - Contains payment method and notes

### Key Functions

#### 1. `getCustomerTransactionsByMemo(customerId)`
Located in: `src/contexts/data-context.js` and `src/services/transactionService.js`

Groups all customer transactions by memo number and calculates:
- Total amount per memo
- Total paid (initial deposit + all payments)
- Remaining due
- Payment status

#### 2. `getMemoDetails(memoNumber)`
Located in: `src/services/transactionService.js`

Returns detailed information about a specific memo including:
- Sale transaction details
- All payment transactions (sorted by date)
- Financial summary

#### 3. `addPaymentToMemo(memoNumber, paymentData, customerId)`
Located in: `src/services/transactionService.js`

Adds a new payment transaction linked to a memo:
- Validates payment data
- Creates payment transaction with type='payment'
- Links to memo via memoNumber field

## UI Components

### 1. CustomerMemoList (`src/components/CustomerMemoList.jsx`)
- Displays all memos in a table format
- Shows memo number, date, amounts, status
- Supports search and sorting
- Provides "View Details" and "Add Payment" buttons

### 2. MemoDetailsDialog (`src/components/MemoDetailsDialog.jsx`)
- Shows complete memo information
- Displays original sale details
- Lists all payment history
- Shows financial summary with progress bar

### 3. AddPaymentDialog (`src/components/AddPaymentDialog.jsx`)
- Form to add new payment
- Validates payment amount (cannot exceed remaining due)
- Supports multiple payment methods
- Optional notes field

## Usage in Customer Detail Page

The customer detail page (`src/app/customers/[id]/page.js`) has two view modes:

### Memo View
```javascript
viewMode === "memos"
```
- Shows CustomerMemoList component
- Groups transactions by memo
- Displays payment status for each memo
- Allows adding payments to specific memos

### Transaction List View
```javascript
viewMode === "transactions"
```
- Shows all transactions in chronological order
- Displays cumulative balance
- Allows editing/deleting individual transactions

## Data Flow

1. **Loading Data**
   - Firebase listeners in DataContext load all transactions
   - Transactions are stored in state

2. **Grouping by Memo**
   - `getCustomerTransactionsByMemo` is called with customerId
   - Uses memoized calculation for performance
   - Returns array of memo groups

3. **Displaying Memos**
   - CustomerMemoList receives memo groups
   - Renders table with search and sort
   - Each row shows memo summary

4. **Viewing Details**
   - User clicks "View Details" or memo row
   - `getMemoDetails` fetches complete memo info
   - MemoDetailsDialog displays all information

5. **Adding Payment**
   - User clicks "Add Payment"
   - AddPaymentDialog opens with form
   - On submit, `addPaymentToMemo` creates payment transaction
   - UI updates automatically via Firebase listeners

## Performance Optimizations

1. **Memoization** (`src/lib/memoization.js`)
   - `groupTransactionsByMemo` is memoized with 5-second TTL
   - Cache key based on customer ID and transaction count
   - Prevents recalculation on every render

2. **useMemo Hooks**
   - Customer memo groups calculated only when transactions change
   - Filtered/sorted memos recalculated only when filters change

3. **Performance Tracking**
   - All operations tracked with performanceTracker
   - Helps identify bottlenecks

## Testing

To test the memo-wise transactions:

1. **Create a sale transaction**
   - Add transaction with memo number
   - Set total amount and initial deposit

2. **View in memo list**
   - Switch to "Memo View"
   - Verify memo appears with correct amounts

3. **Add payment**
   - Click "Add Payment" on memo with due
   - Enter payment amount
   - Verify due amount decreases

4. **View details**
   - Click "View Details"
   - Verify all payments are listed
   - Check financial summary is correct

## Common Issues & Solutions

### Issue: Memos not showing
**Solution:** Ensure transactions have `memoNumber` field set

### Issue: Payment not reducing due
**Solution:** Verify payment transaction has `type: 'payment'` and correct `memoNumber`

### Issue: Duplicate memos
**Solution:** Check that memo numbers are unique per sale

### Issue: Incorrect totals
**Solution:** Verify all payment amounts are in `deposit` or `amount` field

## Files Modified

1. `src/contexts/data-context.js` - Fixed initialization order and infinite loop
2. `src/services/transactionService.js` - Memo-wise transaction logic
3. `src/lib/memoization.js` - Memoized calculations
4. `src/app/customers/[id]/page.js` - Customer detail page with memo view
5. `src/components/CustomerMemoList.jsx` - Memo list component
6. `src/components/MemoDetailsDialog.jsx` - Memo details dialog
7. `src/components/AddPaymentDialog.jsx` - Add payment dialog

## Recent Fixes

### 3. Memo Details Not Showing (RESOLVED ✓)
**Problem:** Clicking "View Details" on a memo didn't show the details dialog
**Root Cause:** The `handleMemoClick` was calling `getMemoDetails()` which searches through all transactions, but the memo data was already available in the `customerMemoGroups` object
**Solution:** Modified `handleMemoClick` to use the data already present in the memo object instead of calling `getMemoDetails()`. The memo groups from `groupTransactionsByMemo` already contain all necessary data (saleTransaction, paymentTransactions, amounts, etc.)

### 4. Cash Memo Transactions Not Showing in Memo View (RESOLVED ✓)
**Problem:** Transactions created from the cash memo page appeared in the customer details but clicking "View Details" in Memo-wise Transactions didn't work
**Root Cause:** The cash memo page creates transactions with `type: "SALE"` (uppercase), but the grouping logic in `groupTransactionsByMemo` and `getMemoDetails` was checking for `type === 'sale'` (lowercase). This case-sensitive comparison caused cash memo transactions to not be recognized as sale transactions.
**Solution:** Made the transaction type comparison case-insensitive by normalizing to lowercase before comparison:
- Updated `src/lib/memoization.js` - `groupTransactionsByMemo` function
- Updated `src/services/transactionService.js` - `getCustomerTransactionsByMemo` and `getMemoDetails` methods
- Now handles both "SALE" and "sale" transaction types correctly

### 5. Transaction List Balance Not Updating After Payment (RESOLVED ✓)
**Problem:** After adding a payment through Memo-wise Transactions, the Transaction List table's balance column didn't update correctly
**Root Cause:** The balance calculation only considered `transaction.due` which works for sale transactions but not for payment transactions. Payment transactions have `type: 'payment'` and their amount should reduce the balance, not add to it.
**Solution:** 
- Modified the balance calculation to check transaction type
- Sale transactions add their `due` amount to the balance
- Payment transactions subtract their `amount` or `deposit` from the balance
- Enhanced the table display to clearly show payment transactions with:
  - Light green background
  - "(Payment)" label next to memo number
  - Payment amount highlighted in green
  - Dashes for non-applicable columns (Total Bill, Due Amount)

## Status

✅ All functions working properly
✅ No diagnostic errors
✅ Initialization issues resolved
✅ Infinite loop fixed
✅ Memo details dialog working
✅ Balance calculation fixed for payments
✅ Memo-wise transactions fully functional
