# Transaction List Balance Calculation Fix

## Problem
After adding a payment through the Memo-wise Transactions view, the Transaction List table's balance column didn't update correctly. The balance would remain the same or show incorrect values after payments were made.

## Root Cause
The balance calculation logic only considered `transaction.due` for all transactions:

```javascript
cumulativeBalance: previousBalance + (transaction.due || 0)
```

This works for sale transactions where:
- `due = total - deposit` (positive value that increases balance)

But fails for payment transactions where:
- `due = 0` (payment transactions don't have a due amount)
- The payment amount is in `amount` or `deposit` field
- Payments should **reduce** the balance, not add to it

## Solution

### 1. Fixed Balance Calculation Logic

**Before:**
```javascript
const customerTransactionsWithBalance = useMemo(() => {
  return transactions
    .filter(...)
    .sort(...)
    .reduce((acc, transaction) => {
      const previousBalance = acc.length > 0 ? acc[acc.length - 1].cumulativeBalance : 0;
      return [
        ...acc,
        {
          ...transaction,
          cumulativeBalance: previousBalance + (transaction.due || 0),
        },
      ];
    }, []);
}, [transactions, params.id, storeFilter]);
```

**After:**
```javascript
const customerTransactionsWithBalance = useMemo(() => {
  return transactions
    .filter(...)
    .sort(...)
    .reduce((acc, transaction) => {
      const previousBalance = acc.length > 0 ? acc[acc.length - 1].cumulativeBalance : 0;
      
      // Calculate balance change based on transaction type
      let balanceChange = 0;
      const transactionType = transaction.type?.toLowerCase();
      
      if (transactionType === 'payment') {
        // Payment transactions reduce the balance
        balanceChange = -(transaction.amount || transaction.deposit || 0);
      } else {
        // Sale transactions (or transactions without type) add to balance
        balanceChange = transaction.due || 0;
      }
      
      return [
        ...acc,
        {
          ...transaction,
          cumulativeBalance: previousBalance + balanceChange,
        },
      ];
    }, []);
}, [transactions, params.id, storeFilter]);
```

### 2. Enhanced Table Display for Payment Transactions

Payment transactions are now clearly distinguished in the table:

**Visual Enhancements:**
- Light green background (`bg-green-50/50`)
- "(Payment)" label next to memo number
- Payment amount highlighted in green
- Dashes (`-`) for non-applicable columns

**Before:**
```
Date       | Memo      | Details | Total | Deposit | Due | Balance
2024-01-15 | MEMO-001  | Payment | ৳0    | ৳500    | ৳0  | ৳1000
```

**After:**
```
Date       | Memo              | Details          | Total | Deposit      | Due | Balance
2024-01-15 | MEMO-001 (Payment)| Payment received | -     | ৳500 (green) | -   | ৳500
```

## Code Changes

### File: `src/app/customers/[id]/page.js`

#### 1. Balance Calculation (Lines ~110-135)
- Added transaction type checking
- Differentiate between sale and payment transactions
- Payment transactions subtract from balance
- Sale transactions add to balance

#### 2. Table Row Rendering (Lines ~800-920)
- Detect payment transactions
- Apply green background styling
- Show "(Payment)" label
- Display payment amount in green
- Show dashes for non-applicable fields

## How It Works

### Balance Calculation Flow

1. **Start with zero balance**
2. **For each transaction (sorted by date):**
   - Get previous balance
   - Check transaction type:
     - **Sale/undefined:** Add `due` amount to balance
     - **Payment:** Subtract `amount` or `deposit` from balance
   - Store new cumulative balance

### Example Scenario

```
Initial Balance: ৳0

Transaction 1 (Sale):
- Date: 2024-01-01
- Type: SALE
- Total: ৳1000
- Deposit: ৳300
- Due: ৳700
- Balance: ৳0 + ৳700 = ৳700

Transaction 2 (Payment):
- Date: 2024-01-05
- Type: payment
- Amount: ৳200
- Balance: ৳700 - ৳200 = ৳500

Transaction 3 (Sale):
- Date: 2024-01-10
- Type: SALE
- Total: ৳500
- Deposit: ৳100
- Due: ৳400
- Balance: ৳500 + ৳400 = ৳900

Transaction 4 (Payment):
- Date: 2024-01-15
- Type: payment
- Amount: ৳300
- Balance: ৳900 - ৳300 = ৳600
```

## Benefits

1. **Accurate Balance Tracking**
   - Balance correctly reflects all transactions
   - Payments properly reduce outstanding balance
   - Sales properly increase outstanding balance

2. **Clear Visual Distinction**
   - Easy to identify payment transactions
   - Payment amounts highlighted
   - Reduced confusion in transaction list

3. **Consistent with Memo View**
   - Balance in transaction list matches memo view calculations
   - Total due across both views is consistent

4. **Better User Experience**
   - Users can see payment impact immediately
   - Clear indication of transaction types
   - Easier to track payment history

## Testing

To verify the fix:

1. **View existing customer with transactions:**
   - Check that initial balance is correct
   - Verify sale transactions increase balance

2. **Add a payment via Memo View:**
   - Go to customer details
   - Switch to Memo View
   - Click "Add Payment" on a memo with due
   - Enter payment amount and save

3. **Check Transaction List:**
   - Switch to Transaction List view
   - Verify payment transaction appears with:
     - Green background
     - "(Payment)" label
     - Payment amount in green
     - Dashes for Total and Due columns
   - Verify balance decreased by payment amount

4. **Verify Balance Accuracy:**
   - Calculate expected balance manually
   - Compare with displayed balance
   - Check that final balance matches total due

## Edge Cases Handled

1. **Multiple payments on same memo:** Each payment correctly reduces balance
2. **Payments larger than due:** Balance can go negative (overpayment)
3. **Mixed transaction order:** Sorted by date, balance calculated correctly
4. **Legacy transactions without type:** Treated as sales (backward compatible)
5. **Case-insensitive type checking:** Handles "PAYMENT", "payment", "Payment"

## Status
✅ Fixed and tested
✅ No diagnostic errors
✅ Backward compatible
✅ Enhanced UI for better clarity
