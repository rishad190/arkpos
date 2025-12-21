"use client";
import { ref, push, set, update, remove, onValue, query, orderByChild, limitToLast, startAt, endAt, equalTo } from "firebase/database";
import { AppError, ERROR_TYPES } from "@/lib/errors";
import {
  createValidResult,
  addError,
  validateRequired,
  validatePositiveNumber,
  formatValidationErrors,
} from "@/lib/validation";
import { requireAuth } from "@/lib/authValidation";
import { sanitizeObject } from "@/lib/sanitization";

const COLLECTION_PATH = "transactions";

/**
 * @callback Unsubscribe
 * @returns {void}
 */

/**
 * @callback TransactionCallback
 * @param {Array<Transaction>} transactions
 * @returns {void}
 */

/**
 * Transaction Service - Handles all transaction-related Firebase operations
 * @typedef {import('../types/models').Transaction} Transaction
 * @typedef {import('../types/models').MemoGroup} MemoGroup
 * @typedef {import('../types/models').MemoDetails} MemoDetails
 * @typedef {import('../types/models').PaymentData} PaymentData
 * @typedef {import('../types/models').ValidationResult} ValidationResult
 * @typedef {import('../types/models').TransactionStats} TransactionStats
 */
export class TransactionService {
  /**
   * Create a new TransactionService instance
   * @param {import('firebase/database').Database} db - Firebase database instance
   * @param {Object} logger - Logger instance for logging operations
   * @param {import('./atomicOperations').AtomicOperationService} atomicOperations - Atomic operations service
   */
  constructor(db, logger, atomicOperations) {
    this.db = db;
    this.logger = logger;
    this.atomicOperations = atomicOperations;
  }

  /**
   * Subscribe to real-time transaction updates
   * @param {TransactionCallback} callback - Function called with updated transactions
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Max number of transactions to fetch (from newest)
   * @param {Date} [options.startDate] - Start date for filtering
   * @param {Date} [options.endDate] - End date for filtering
   * @returns {Unsubscribe} Function to unsubscribe
   */
  subscribeToTransactions(callback, options = {}) {
    const transactionsRef = ref(this.db, COLLECTION_PATH);
    let q = query(transactionsRef, orderByChild("createdAt"));

    if (options.startDate && options.endDate) {
      q = query(q, startAt(options.startDate.toISOString()), endAt(options.endDate.toISOString()));
    } else if (options.limit) {
      q = query(q, limitToLast(options.limit));
    }
    
    // Using onValue for real-time updates
    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const transactionList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        // Sort by createdAt descending (newest first)
        transactionList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(transactionList);
      } else {
        callback([]);
      }
    }, (error) => {
      this.logger.error("Error subscribing to transactions:", error);
      callback([]);
    });

    return unsubscribe;
  }

  /**
   * Subscribe to transactions for a specific customer
   * @param {string} customerId - The customer ID
   * @param {Function} callback - Callback function
   * @returns {Unsubscribe} Function to unsubscribe
   */
  subscribeToCustomerTransactions(customerId, callback) {
    const transactionsRef = ref(this.db, COLLECTION_PATH);
    const q = query(transactionsRef, orderByChild("customerId"), equalTo(customerId));

    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const transactionList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        // Sort by createdAt descending
        transactionList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(transactionList);
      } else {
        callback([]);
      }
    }, (error) => {
      this.logger.error(`Error subscribing to transactions for customer ${customerId}:`, error);
      callback([]);
    });

    return unsubscribe;
  }

  /**
   * Add a new transaction to the database
   * @param {Partial<Transaction>} transactionData - Transaction data to add
   * @returns {Promise<string>} The new transaction ID
   * @throws {AppError} If validation fails or database operation fails
   */
  async addTransaction(transactionData) {
    // Validate authentication
    requireAuth();

    // Sanitize input data
    const sanitizedData = sanitizeObject(transactionData);

    const validationResult = this.validateTransactionData(sanitizedData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { transactionData: sanitizedData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("addTransaction", async () => {
      const transactionsRef = ref(this.db, COLLECTION_PATH);
      const newTransactionRef = push(transactionsRef);
      const transactionId = newTransactionRef.key;

      const newTransaction = {
        ...transactionData,
        createdAt: new Date().toISOString(),
      };

      // Atomic Update: Transaction + Customer Financial Summary
      const updates = {};
      updates[`/${COLLECTION_PATH}/${transactionId}`] = newTransaction;

      // Update Customer Financial Summary
      const customerRef = ref(this.db, `customers/${transactionData.customerId}`);
      const customerSnapshot = await get(customerRef);

      if (customerSnapshot.exists()) {
        const customer = customerSnapshot.val();
        const currentSummary = customer.financialSummary || {
          totalRevenue: 0,
          totalDeposits: 0,
          totalDue: 0,
        };

        const newSummary = {
          totalRevenue: (currentSummary.totalRevenue || 0) + (newTransaction.total || 0),
          totalDeposits: (currentSummary.totalDeposits || 0) + (newTransaction.deposit || 0),
          totalDue: (currentSummary.totalDue || 0) + (newTransaction.total || 0) - (newTransaction.deposit || 0),
          lastTransactionDate: newTransaction.createdAt,
        };

        updates[`/customers/${transactionData.customerId}/financialSummary`] = newSummary;
        updates[`/customers/${transactionData.customerId}/updatedAt`] = new Date().toISOString();
      }

      await update(ref(this.db), updates);
      return transactionId;
    });
  }

  /**
   * Update an existing transaction
   * @param {string} transactionId - The transaction ID to update
   * @param {Partial<Transaction>} updatedData - Updated transaction data
   * @returns {Promise<void>}
   * @throws {AppError} If validation fails or database operation fails
   */
  async updateTransaction(transactionId, updatedData) {
    // Validate authentication
    requireAuth();

    // Sanitize input data
    const sanitizedData = sanitizeObject(updatedData);

    const validationResult = this.validateTransactionData(sanitizedData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { transactionId, updatedData: sanitizedData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("updateTransaction", async () => {
      const transactionRef = ref(this.db, `${COLLECTION_PATH}/${transactionId}`);
      const oldTransactionSnapshot = await get(transactionRef);
      
      if (!oldTransactionSnapshot.exists()) {
        throw new AppError(
          `Transaction with ID ${transactionId} not found`,
          ERROR_TYPES.NOT_FOUND,
          { transactionId }
        );
      }
      
      const oldTransaction = oldTransactionSnapshot.val();

      const updates = {};
      const newTransaction = {
        ...oldTransaction,
        ...sanitizedData,
        updatedAt: new Date().toISOString(),
      };
      
      updates[`/${COLLECTION_PATH}/${transactionId}`] = newTransaction;

      // Update Customer Financial Summary (if amounts changed)
      const oldTotal = oldTransaction.total || 0;
      const oldDeposit = oldTransaction.deposit || 0;
      const newTotal = newTransaction.total || 0;
      const newDeposit = newTransaction.deposit || 0;

      if (oldTotal !== newTotal || oldDeposit !== newDeposit) {
        const customerRef = ref(this.db, `customers/${newTransaction.customerId}`);
        const customerSnapshot = await get(customerRef);

        if (customerSnapshot.exists()) {
          const customer = customerSnapshot.val();
          const currentSummary = customer.financialSummary || {
            totalRevenue: 0,
            totalDeposits: 0,
            totalDue: 0,
          };

          const newSummary = {
            totalRevenue: (currentSummary.totalRevenue || 0) - oldTotal + newTotal,
            totalDeposits: (currentSummary.totalDeposits || 0) - oldDeposit + newDeposit,
            totalDue: (currentSummary.totalDue || 0) - (oldTotal - oldDeposit) + (newTotal - newDeposit),
            lastTransactionDate: newTransaction.createdAt, // Original creation date usually persists?
          };

          updates[`/customers/${newTransaction.customerId}/financialSummary`] = newSummary;
          updates[`/customers/${newTransaction.customerId}/updatedAt`] = new Date().toISOString();
        }
      }

      await update(ref(this.db), updates);
    });
  }

  /**
   * Delete a transaction from the database
   * @param {string} transactionId - The transaction ID to delete
   * @returns {Promise<void>}
   */
  async deleteTransaction(transactionId) {
    // Validate authentication
    requireAuth();

    return this.atomicOperations.execute("deleteTransaction", async () => {
      const transactionRef = ref(this.db, `${COLLECTION_PATH}/${transactionId}`);
      const transactionSnapshot = await get(transactionRef);
      
      if (!transactionSnapshot.exists()) {
        // Already deleted or doesn't exist, just return
        return;
      }

      const transaction = transactionSnapshot.val();
      const updates = {};
      
      updates[`/${COLLECTION_PATH}/${transactionId}`] = null;

      // Decrement Customer Financial Summary
      if (transaction.customerId) {
        const customerRef = ref(this.db, `customers/${transaction.customerId}`);
        const customerSnapshot = await get(customerRef);

        if (customerSnapshot.exists()) {
          const customer = customerSnapshot.val();
          const currentSummary = customer.financialSummary || {
            totalRevenue: 0,
            totalDeposits: 0,
            totalDue: 0,
          };

          const newSummary = {
            totalRevenue: (currentSummary.totalRevenue || 0) - (transaction.total || 0),
            totalDeposits: (currentSummary.totalDeposits || 0) - (transaction.deposit || 0),
            totalDue: (currentSummary.totalDue || 0) - ((transaction.total || 0) - (transaction.deposit || 0)),
            lastTransactionDate: currentSummary.lastTransactionDate, // Keep existing date for now
          };

          updates[`/customers/${transaction.customerId}/financialSummary`] = newSummary;
          updates[`/customers/${transaction.customerId}/updatedAt`] = new Date().toISOString();
        }
      }

      await update(ref(this.db), updates);
    });
  }

  /**
   * Validate transaction data
   * @param {Object} transactionData - The transaction data to validate
   * @returns {ValidationResult} - Validation result with field-level errors
   */
  validateTransactionData(transactionData) {
    const result = createValidResult();

    // Validate customerId
    const customerIdError = validateRequired(transactionData.customerId, 'customerId');
    if (customerIdError) {
      addError(result, customerIdError.field, customerIdError.message);
    }

    // Validate that either total or deposit is positive
    const total = transactionData.total || 0;
    const deposit = transactionData.deposit || 0;

    if (total <= 0 && deposit <= 0) {
      addError(result, 'total', 'Either total or deposit must be a positive amount');
    }

    // Validate total if provided
    if (transactionData.total != null) {
      const totalError = validatePositiveNumber(transactionData.total, 'total', true);
      if (totalError) {
        addError(result, totalError.field, totalError.message);
      }
    }

    // Validate deposit if provided
    if (transactionData.deposit != null) {
      const depositError = validatePositiveNumber(transactionData.deposit, 'deposit', true);
      if (depositError) {
        addError(result, depositError.field, depositError.message);
      }
    }

    // Validate that deposit doesn't exceed total (if both are provided and total > 0)
    if (transactionData.total != null && transactionData.deposit != null && transactionData.total > 0) {
      if (transactionData.deposit > transactionData.total) {
        addError(result, 'deposit', 'Deposit cannot exceed total amount');
      }
    }

    // Validate memoNumber if provided
    if (transactionData.memoNumber !== undefined && !transactionData.memoNumber) {
      addError(result, 'memoNumber', 'Memo number cannot be empty if provided');
    }

    return result;
  }

  /**
   * Calculate transaction statistics
   * @param {Array<Transaction>} [transactions=[]] - Array of transactions to calculate stats for
   * @returns {TransactionStats} Transaction statistics including revenue, deposits, and due amounts
   */
  calculateTransactionStats(transactions = []) {
    const totalRevenue = transactions.reduce(
      (sum, t) => sum + (t.total || 0),
      0
    );
    const totalDeposits = transactions.reduce(
      (sum, t) => sum + (t.deposit || 0),
      0
    );
    const totalDue = totalRevenue - totalDeposits;

    return {
      totalRevenue,
      totalDeposits,
      totalDue,
      transactionCount: transactions.length,
    };
  }

  /**
   * Filter transactions by date range
   * @param {Array<Transaction>} transactions - Array of transactions to filter
   * @param {Date} startDate - Start date of the range
   * @param {Date} endDate - End date of the range
   * @returns {Array<Transaction>} Filtered transactions within the date range
   */
  filterTransactionsByDate(transactions, startDate, endDate) {
    return transactions.filter((transaction) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.date
      );
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }

  /**
   * Get transactions by customer
   * @param {Array<Transaction>} [transactions=[]] - Array of all transactions
   * @param {string} customerId - The customer ID to filter by
   * @returns {Array<Transaction>} Transactions for the specified customer
   */
  getTransactionsByCustomer(transactions = [], customerId) {
    return transactions.filter((t) => t.customerId === customerId);
  }

  /**
   * Get all transactions for a customer, grouped by memo
   * 
   * This method implements the memo-based transaction organization pattern.
   * Each memo represents a sale, and can have multiple payment transactions
   * linked to it. This allows tracking of partial payments and outstanding dues
   * on a per-sale basis.
   * 
   * @param {string} customerId - The customer ID
   * @param {Array<Object>} allTransactions - All transactions from context
   * @returns {Array<MemoGroup>} Array of memo groups with payment details
   * 
   * @example
   * const memoGroups = getCustomerTransactionsByMemo('customer123', transactions);
   * // Returns: [
   * //   {
   * //     memoNumber: 'MEMO-001',
   * //     totalAmount: 1000,
   * //     paidAmount: 700,
   * //     dueAmount: 300,
   * //     status: 'partial',
   * //     saleTransaction: {...},
   * //     paymentTransactions: [{...}, {...}]
   * //   }
   * // ]
   */
  getCustomerTransactionsByMemo(customerId, allTransactions = []) {
    // Step 1: Filter to get only this customer's transactions
    // This reduces the dataset we need to process
    const customerTransactions = allTransactions.filter(
      (t) => t.customerId === customerId
    );

    // Step 2: Create a Map to group transactions by memo number
    // Using Map instead of Object for better performance with dynamic keys
    const memoMap = new Map();

    // Step 3: Iterate through transactions and organize them by memo
    customerTransactions.forEach((transaction) => {
      const memoNumber = transaction.memoNumber;
      
      // Skip transactions without memo numbers (shouldn't happen in normal flow)
      if (!memoNumber) return;

      // Initialize memo group if this is the first transaction for this memo
      if (!memoMap.has(memoNumber)) {
        memoMap.set(memoNumber, {
          memoNumber,
          customerId,
          saleTransaction: null,      // Will hold the original sale
          paymentTransactions: [],    // Will hold all payments
          totalAmount: 0,              // Total sale amount
          paidAmount: 0,               // Sum of all payments
          dueAmount: 0,                // Calculated: total - paid
          saleDate: null,              // Date of original sale
          status: 'unpaid'             // Will be calculated: paid/partial/unpaid
        });
      }

      const memoGroup = memoMap.get(memoNumber);

      // Step 4: Categorize transaction by type and update memo group
      // Normalize type to lowercase for comparison
      const transactionType = transaction.type?.toLowerCase();
      
      if (transactionType === 'sale' || !transaction.type) {
        // This is the original sale transaction
        // Store it separately as it contains product details and total amount
        memoGroup.saleTransaction = transaction;
        memoGroup.totalAmount = transaction.total || 0;
        memoGroup.saleDate = transaction.date || transaction.createdAt;
        // Initial deposit from the sale counts as first payment
        memoGroup.paidAmount = transaction.deposit || 0;
      } else if (transactionType === 'payment') {
        // This is a subsequent payment transaction
        // Add it to the payments array and accumulate the paid amount
        memoGroup.paymentTransactions.push(transaction);
        // Payment amount can be in 'deposit' or 'amount' field depending on context
        memoGroup.paidAmount += transaction.deposit || transaction.amount || 0;
      }
    });

    // Step 5: Calculate final due amounts and determine payment status
    const memoGroups = Array.from(memoMap.values()).map((memo) => {
      // Calculate remaining due amount
      memo.dueAmount = memo.totalAmount - memo.paidAmount;
      
      // Determine payment status based on due amount
      if (memo.dueAmount <= 0) {
        // Fully paid (or overpaid)
        memo.status = 'paid';
      } else if (memo.paidAmount > 0) {
        // Partially paid (some payment made, but still has due)
        memo.status = 'partial';
      } else {
        // Unpaid (no payments made yet)
        memo.status = 'unpaid';
      }

      return memo;
    });

    // Step 6: Sort memos by sale date (most recent first)
    // This ensures the UI shows the latest sales at the top
    return memoGroups.sort((a, b) => {
      const dateA = new Date(a.saleDate || 0);
      const dateB = new Date(b.saleDate || 0);
      return dateB - dateA; // Descending order (newest first)
    });
  }

  /**
   * Get memo details with all associated payments
   * @param {string} memoNumber - The memo number
   * @param {Array<Object>} allTransactions - All transactions from context
   * @returns {Object|null} MemoDetails object or null if not found
   */
  getMemoDetails(memoNumber, allTransactions = []) {
    // Find all transactions for this memo
    const memoTransactions = allTransactions.filter(
      (t) => t.memoNumber === memoNumber
    );

    if (memoTransactions.length === 0) {
      return null;
    }

    // Separate sale and payment transactions
    // Normalize type to lowercase for comparison
    const saleTransaction = memoTransactions.find(
      (t) => t.type?.toLowerCase() === 'sale' || !t.type
    );
    const paymentTransactions = memoTransactions.filter(
      (t) => t.type?.toLowerCase() === 'payment'
    );

    if (!saleTransaction) {
      this.logger.warn(
        `No sale transaction found for memo ${memoNumber}`,
        'TransactionService'
      );
      return null;
    }

    // Calculate remaining due
    const totalAmount = saleTransaction.total || 0;
    const initialDeposit = saleTransaction.deposit || 0;
    const additionalPayments = paymentTransactions.reduce(
      (sum, p) => sum + (p.deposit || p.amount || 0),
      0
    );
    const totalPaid = initialDeposit + additionalPayments;
    const remainingDue = totalAmount - totalPaid;

    return {
      memoNumber,
      saleTransaction,
      paymentTransactions: paymentTransactions.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateA - dateB; // Oldest first
      }),
      totalAmount,
      totalPaid,
      remainingDue,
      status: remainingDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
    };
  }

  /**
   * Add payment to a specific memo
   * @param {string} memoNumber - The memo number to add payment to
   * @param {Object} paymentData - Payment data (amount, date, method, note)
   * @param {string} customerId - The customer ID
   * @returns {Promise<string>} The new payment transaction ID
   */
  async addPaymentToMemo(memoNumber, paymentData, customerId) {
    // Validate authentication
    requireAuth();

    // Sanitize input data
    const sanitizedPaymentData = sanitizeObject(paymentData);

    // Validate payment data
    const result = createValidResult();

    const memoError = validateRequired(memoNumber, 'memoNumber');
    if (memoError) {
      addError(result, memoError.field, memoError.message);
    }

    const customerError = validateRequired(customerId, 'customerId');
    if (customerError) {
      addError(result, customerError.field, customerError.message);
    }

    if (!paymentData.amount) {
      addError(result, 'amount', 'Payment amount is required');
    } else {
      const amountError = validatePositiveNumber(paymentData.amount, 'amount', false);
      if (amountError) {
        addError(result, amountError.field, amountError.message);
      }
    }

    if (!result.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(result)}`,
        ERROR_TYPES.VALIDATION,
        { memoNumber, paymentData, customerId, validationErrors: result.errors }
      );
    }

    return this.atomicOperations.execute('addPaymentToMemo', async () => {
      const transactionsRef = ref(this.db, COLLECTION_PATH);
      const newPaymentRef = push(transactionsRef);
      const paymentId = newPaymentRef.key;

      const paymentTransaction = {
        customerId,
        memoNumber,
        type: 'payment',
        amount: paymentData.amount,
        deposit: paymentData.amount, // For consistency with existing structure
        total: 0, // Payments don't have a total
        due: 0,
        date: paymentData.date || new Date().toISOString().split('T')[0],
        paymentMethod: paymentData.paymentMethod || 'cash',
        note: paymentData.note || '',
        createdAt: new Date().toISOString(),
      };

      const updates = {};
      updates[`/${COLLECTION_PATH}/${paymentId}`] = paymentTransaction;

      // Update Customer Financial Summary
      const customerRef = ref(this.db, `customers/${customerId}`);
      const customerSnapshot = await get(customerRef);

      if (customerSnapshot.exists()) {
        const customer = customerSnapshot.val();
        const currentSummary = customer.financialSummary || {
          totalRevenue: 0,
          totalDeposits: 0,
          totalDue: 0,
        };

        const newSummary = {
          totalRevenue: (currentSummary.totalRevenue || 0), // Payment doesn't increase revenue
          totalDeposits: (currentSummary.totalDeposits || 0) + (paymentTransaction.amount || 0),
          // Due decreases by the payment amount
          totalDue: (currentSummary.totalDue || 0) - (paymentTransaction.amount || 0),
          lastTransactionDate: paymentTransaction.createdAt,
        };

        updates[`/customers/${customerId}/financialSummary`] = newSummary;
        updates[`/customers/${customerId}/updatedAt`] = new Date().toISOString();
      }

      await update(ref(this.db), updates);

      this.logger.info(
        `Payment added to memo ${memoNumber}: ${paymentData.amount}`,
        'TransactionService'
      );
      return paymentId;
    });
  }

  /**
   * Calculate total due for a customer across all memos
   * @param {string} customerId - The customer ID
   * @param {Array<Object>} allTransactions - All transactions from context
   * @returns {number} Total due amount
   */
  calculateCustomerTotalDue(customerId, allTransactions = []) {
    const memoGroups = this.getCustomerTransactionsByMemo(
      customerId,
      allTransactions
    );

    return memoGroups.reduce((total, memo) => total + memo.dueAmount, 0);
  }

  /**
   * Get memos with outstanding dues for a customer
   * @param {string} customerId - The customer ID
   * @param {Array<Object>} allTransactions - All transactions from context
   * @returns {Array<MemoGroup>} Array of memos with due amount > 0
   */
  getCustomerMemosWithDues(customerId, allTransactions = []) {
    const memoGroups = this.getCustomerTransactionsByMemo(
      customerId,
      allTransactions
    );

    return memoGroups.filter((memo) => memo.dueAmount > 0);
  }
}

export default TransactionService;
