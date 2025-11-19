"use client";
import { ref, push, set, update, remove } from "firebase/database";
import { AppError, ERROR_TYPES } from "@/lib/errors";
import {
  createValidResult,
  addError,
  validateRequired,
  validatePositiveNumber,
  formatValidationErrors,
} from "@/lib/validation";

const COLLECTION_PATH = "transactions";

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
   * Add a new transaction to the database
   * @param {Partial<Transaction>} transactionData - Transaction data to add
   * @returns {Promise<string>} The new transaction ID
   * @throws {AppError} If validation fails or database operation fails
   */
  async addTransaction(transactionData) {
    const validationResult = this.validateTransactionData(transactionData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { transactionData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("addTransaction", async () => {
      const transactionsRef = ref(this.db, COLLECTION_PATH);
      const newTransactionRef = push(transactionsRef);

      const newTransaction = {
        ...transactionData,
        createdAt: new Date().toISOString(),
      };

      await set(newTransactionRef, newTransaction);
      return newTransactionRef.key;
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
    const validationResult = this.validateTransactionData(updatedData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { transactionId, updatedData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("updateTransaction", async () => {
      const transactionRef = ref(this.db, `${COLLECTION_PATH}/${transactionId}`);
      await update(transactionRef, {
        ...updatedData,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Delete a transaction from the database
   * @param {string} transactionId - The transaction ID to delete
   * @returns {Promise<void>}
   */
  async deleteTransaction(transactionId) {
    return this.atomicOperations.execute("deleteTransaction", async () => {
      await remove(ref(this.db, `${COLLECTION_PATH}/${transactionId}`));
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
   * @param {string} customerId - The customer ID
   * @param {Array<Object>} allTransactions - All transactions from context
   * @returns {Array<MemoGroup>} Array of memo groups with payment details
   */
  getCustomerTransactionsByMemo(customerId, allTransactions = []) {
    // Filter transactions for this customer
    const customerTransactions = allTransactions.filter(
      (t) => t.customerId === customerId
    );

    // Group transactions by memo number
    const memoMap = new Map();

    customerTransactions.forEach((transaction) => {
      const memoNumber = transaction.memoNumber;
      if (!memoNumber) return; // Skip transactions without memo numbers

      if (!memoMap.has(memoNumber)) {
        // Initialize memo group
        memoMap.set(memoNumber, {
          memoNumber,
          customerId,
          saleTransaction: null,
          paymentTransactions: [],
          totalAmount: 0,
          paidAmount: 0,
          dueAmount: 0,
          saleDate: null,
          status: 'unpaid'
        });
      }

      const memoGroup = memoMap.get(memoNumber);

      // Categorize transaction by type
      if (transaction.type === 'sale' || !transaction.type) {
        // Original sale transaction
        memoGroup.saleTransaction = transaction;
        memoGroup.totalAmount = transaction.total || 0;
        memoGroup.saleDate = transaction.date || transaction.createdAt;
        memoGroup.paidAmount = transaction.deposit || 0;
      } else if (transaction.type === 'payment') {
        // Payment transaction
        memoGroup.paymentTransactions.push(transaction);
        memoGroup.paidAmount += transaction.deposit || transaction.amount || 0;
      }
    });

    // Calculate due amounts and status for each memo
    const memoGroups = Array.from(memoMap.values()).map((memo) => {
      memo.dueAmount = memo.totalAmount - memo.paidAmount;
      
      // Determine status
      if (memo.dueAmount <= 0) {
        memo.status = 'paid';
      } else if (memo.paidAmount > 0) {
        memo.status = 'partial';
      } else {
        memo.status = 'unpaid';
      }

      return memo;
    });

    // Sort by sale date (most recent first)
    return memoGroups.sort((a, b) => {
      const dateA = new Date(a.saleDate || 0);
      const dateB = new Date(b.saleDate || 0);
      return dateB - dateA;
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
    const saleTransaction = memoTransactions.find(
      (t) => t.type === 'sale' || !t.type
    );
    const paymentTransactions = memoTransactions.filter(
      (t) => t.type === 'payment'
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
        const dateB = new Date(b.date || b.createdAt || 0);
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

      await set(newPaymentRef, paymentTransaction);
      this.logger.info(
        `Payment added to memo ${memoNumber}: ${paymentData.amount}`,
        'TransactionService'
      );
      return newPaymentRef.key;
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
