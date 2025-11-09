"use client";
import { ref, push, set, update, remove } from "firebase/database";

const COLLECTION_PATH = "transactions";

/**
 * Transaction Service - Handles all transaction-related Firebase operations
 */
export class TransactionService {
  constructor(db, logger, atomicOperations) {
    this.db = db;
    this.logger = logger;
    this.atomicOperations = atomicOperations;
  }

  /**
   * Add a new transaction
   */
  async addTransaction(transactionData) {
    const validationErrors = this.validateTransactionData(transactionData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
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
   */
  async updateTransaction(transactionId, updatedData) {
    const validationErrors = this.validateTransactionData(updatedData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
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
   * Delete a transaction
   */
  async deleteTransaction(transactionId) {
    return this.atomicOperations.execute("deleteTransaction", async () => {
      await remove(ref(this.db, `${COLLECTION_PATH}/${transactionId}`));
    });
  }

  /**
   * Validate transaction data
   */
  validateTransactionData(transactionData) {
    const errors = [];
    if (!transactionData.customerId) errors.push("Customer ID is required");
    if (
      (transactionData.total || 0) <= 0 &&
      (transactionData.deposit || 0) <= 0
    ) {
      errors.push("Either total or deposit must be a positive amount");
    }
    return errors;
  }

  /**
   * Calculate transaction statistics
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
   */
  getTransactionsByCustomer(transactions = [], customerId) {
    return transactions.filter((t) => t.customerId === customerId);
  }
}

export default TransactionService;
