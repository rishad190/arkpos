"use client";
import { ref, push, set, update, remove, get, query, orderByChild, equalTo, onValue } from "firebase/database";
import { AppError, ERROR_TYPES } from "@/lib/errors";
import {
  createValidResult,
  addError,
  validateRequired,
  validatePositiveNumber,
  formatValidationErrors,
} from "@/lib/validation";

const DAILY_CASH_INCOME_PATH = "dailyCashIncome";
const DAILY_CASH_EXPENSE_PATH = "dailyCashExpense";
const TRANSACTIONS_PATH = "transactions";

/**
 * Cash Transaction Service - Handles atomic cash transaction operations
 * @typedef {import('../types/models').DailyCashTransaction} DailyCashTransaction
 * @typedef {import('../types/models').Transaction} Transaction
 * @typedef {import('../types/models').ValidationResult} ValidationResult
 */
export class CashTransactionService {
  /**
   * Create a new CashTransactionService instance
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
   * Subscribe to daily cash income
   * @param {Function} callback - Function called with updated income list
   * @param {Object} [options] - Query options
   * @returns {Function} Unsubscribe function
   */
  subscribeToDailyCashIncome(callback) {
    const incomeRef = ref(this.db, DAILY_CASH_INCOME_PATH);
    const q = query(incomeRef, orderByChild("createdAt"));

    return onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const incomeList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        // Sort by date descending
        incomeList.sort((a, b) => new Date(b.date) - new Date(a.date));
        callback(incomeList);
      } else {
        callback([]);
      }
    }, (error) => {
      this.logger.error("Error subscribing to daily cash income:", error);
      callback([]);
    });
  }

  /**
   * Subscribe to daily cash expense
   * @param {Function} callback - Function called with updated expense list
   * @param {Object} [options] - Query options
   * @returns {Function} Unsubscribe function
   */
  subscribeToDailyCashExpense(callback) {
    const expenseRef = ref(this.db, DAILY_CASH_EXPENSE_PATH);
    const q = query(expenseRef, orderByChild("createdAt"));

    return onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const expenseList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        // Sort by date descending
        expenseList.sort((a, b) => new Date(b.date) - new Date(a.date));
        callback(expenseList);
      } else {
        callback([]);
      }
    }, (error) => {
      this.logger.error("Error subscribing to daily cash expense:", error);
      callback([]);
    });
  }

  /**
   * Add a cash transaction and update related customer transaction atomically
   * @param {Partial<DailyCashTransaction>} cashTransactionData - Cash transaction data
   * @param {string} [relatedTransactionId] - Related customer transaction ID (optional)
   * @returns {Promise<string>} The new cash transaction ID
   * @throws {AppError} If validation fails or database operation fails
   */
  async addCashTransaction(cashTransactionData, relatedTransactionId = null) {
    const validationResult = this.validateCashTransactionData(cashTransactionData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { cashTransactionData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("addCashTransaction", async () => {
      const updates = {};
      
      // Determine collection path based on transaction type
      const collectionPath = cashTransactionData.cashIn > 0
        ? DAILY_CASH_INCOME_PATH
        : DAILY_CASH_EXPENSE_PATH;
      
      // Create new cash transaction
      const cashRef = ref(this.db, collectionPath);
      const newCashRef = push(cashRef);
      const cashTransactionId = newCashRef.key;
      
      updates[`${collectionPath}/${cashTransactionId}`] = {
        ...cashTransactionData,
        createdAt: new Date().toISOString(),
      };

      // If there's a related customer transaction, update it atomically
      if (relatedTransactionId) {
        const transactionRef = ref(this.db, `${TRANSACTIONS_PATH}/${relatedTransactionId}`);
        const transactionSnapshot = await get(transactionRef);
        
        if (!transactionSnapshot.exists()) {
          throw new AppError(
            `Related transaction ${relatedTransactionId} not found`,
            ERROR_TYPES.NOT_FOUND,
            { relatedTransactionId }
          );
        }

        const transactionData = transactionSnapshot.val();
        const currentDeposit = transactionData.deposit || 0;
        const cashAmount = cashTransactionData.cashIn || cashTransactionData.cashOut || 0;
        
        // Update customer transaction deposit
        updates[`${TRANSACTIONS_PATH}/${relatedTransactionId}/deposit`] = currentDeposit + cashAmount;
        updates[`${TRANSACTIONS_PATH}/${relatedTransactionId}/updatedAt`] = new Date().toISOString();
      }

      // Execute all updates atomically
      await update(ref(this.db), updates);
      
      this.logger.info(
        `Cash transaction ${cashTransactionId} added atomically${relatedTransactionId ? ` with customer transaction ${relatedTransactionId}` : ''}`
      );
      
      return cashTransactionId;
    });
  }

  /**
   * Update a cash transaction and related customer transaction atomically
   * @param {string} cashTransactionId - The cash transaction ID to update
   * @param {Partial<DailyCashTransaction>} updatedData - Updated cash transaction data
   * @param {string} [relatedTransactionId] - Related customer transaction ID (optional)
   * @param {number} [previousCashAmount] - Previous cash amount for adjustment (optional)
   * @returns {Promise<void>}
   * @throws {AppError} If validation fails or database operation fails
   */
  async updateCashTransaction(
    cashTransactionId,
    updatedData,
    relatedTransactionId = null,
    previousCashAmount = 0
  ) {
    const validationResult = this.validateCashTransactionData(updatedData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { cashTransactionId, updatedData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("updateCashTransaction", async () => {
      const updates = {};
      
      // Find the cash transaction in either income or expense collection
      let collectionPath = null;
      const incomeRef = ref(this.db, `${DAILY_CASH_INCOME_PATH}/${cashTransactionId}`);
      const expenseRef = ref(this.db, `${DAILY_CASH_EXPENSE_PATH}/${cashTransactionId}`);
      
      const incomeSnapshot = await get(incomeRef);
      if (incomeSnapshot.exists()) {
        collectionPath = DAILY_CASH_INCOME_PATH;
      } else {
        const expenseSnapshot = await get(expenseRef);
        if (expenseSnapshot.exists()) {
          collectionPath = DAILY_CASH_EXPENSE_PATH;
        }
      }
      
      if (!collectionPath) {
        throw new AppError(
          `Cash transaction ${cashTransactionId} not found`,
          ERROR_TYPES.NOT_FOUND,
          { cashTransactionId }
        );
      }

      // Update cash transaction
      updates[`${collectionPath}/${cashTransactionId}`] = {
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };

      // If there's a related customer transaction, update it atomically
      if (relatedTransactionId) {
        const transactionRef = ref(this.db, `${TRANSACTIONS_PATH}/${relatedTransactionId}`);
        const transactionSnapshot = await get(transactionRef);
        
        if (!transactionSnapshot.exists()) {
          throw new AppError(
            `Related transaction ${relatedTransactionId} not found`,
            ERROR_TYPES.NOT_FOUND,
            { relatedTransactionId }
          );
        }

        const transactionData = transactionSnapshot.val();
        const currentDeposit = transactionData.deposit || 0;
        const newCashAmount = updatedData.cashIn || updatedData.cashOut || 0;
        
        // Adjust deposit: remove old amount, add new amount
        const adjustedDeposit = currentDeposit - previousCashAmount + newCashAmount;
        
        updates[`${TRANSACTIONS_PATH}/${relatedTransactionId}/deposit`] = adjustedDeposit;
        updates[`${TRANSACTIONS_PATH}/${relatedTransactionId}/updatedAt`] = new Date().toISOString();
      }

      // Execute all updates atomically
      await update(ref(this.db), updates);
      
      this.logger.info(
        `Cash transaction ${cashTransactionId} updated atomically${relatedTransactionId ? ` with customer transaction ${relatedTransactionId}` : ''}`
      );
    });
  }

  /**
   * Delete a cash transaction and update related customer transaction atomically
   * @param {string} cashTransactionId - The cash transaction ID to delete
   * @param {string} [reference] - Reference to related transaction (e.g., memo number)
   * @returns {Promise<void>}
   * @throws {AppError} If cash transaction not found or database operation fails
   */
  async deleteCashTransaction(cashTransactionId, reference = null) {
    return this.atomicOperations.execute("deleteCashTransaction", async () => {
      const updates = {};
      
      // Find the cash transaction in either income or expense collection
      let collectionPath = null;
      let cashData = null;
      
      const incomeRef = ref(this.db, `${DAILY_CASH_INCOME_PATH}/${cashTransactionId}`);
      const expenseRef = ref(this.db, `${DAILY_CASH_EXPENSE_PATH}/${cashTransactionId}`);
      
      const incomeSnapshot = await get(incomeRef);
      if (incomeSnapshot.exists()) {
        collectionPath = DAILY_CASH_INCOME_PATH;
        cashData = incomeSnapshot.val();
      } else {
        const expenseSnapshot = await get(expenseRef);
        if (expenseSnapshot.exists()) {
          collectionPath = DAILY_CASH_EXPENSE_PATH;
          cashData = expenseSnapshot.val();
        }
      }
      
      if (!collectionPath || !cashData) {
        throw new AppError(
          `Cash transaction ${cashTransactionId} not found`,
          ERROR_TYPES.NOT_FOUND,
          { cashTransactionId }
        );
      }

      // Mark cash transaction for deletion
      updates[`${collectionPath}/${cashTransactionId}`] = null;

      // If it's a sale with a reference, update the related customer transaction
      if (cashData.type === 'sale' && (cashData.reference || reference)) {
        const memoNumber = cashData.reference || reference;
        const customerTransactionQuery = query(
          ref(this.db, TRANSACTIONS_PATH),
          orderByChild('memoNumber'),
          equalTo(memoNumber)
        );
        
        const snapshot = await get(customerTransactionQuery);
        if (snapshot.exists()) {
          const transactions = snapshot.val();
          for (const [id, transactionData] of Object.entries(transactions)) {
            const currentDeposit = transactionData.deposit || 0;
            const cashAmount = cashData.cashIn || 0;
            const adjustedDeposit = currentDeposit - cashAmount;
            
            updates[`${TRANSACTIONS_PATH}/${id}/deposit`] = Math.max(0, adjustedDeposit);
            updates[`${TRANSACTIONS_PATH}/${id}/updatedAt`] = new Date().toISOString();
          }
        }
      }

      // Execute all updates atomically
      await update(ref(this.db), updates);
      
      this.logger.info(
        `Cash transaction ${cashTransactionId} deleted atomically${reference ? ` with reference ${reference}` : ''}`
      );
    });
  }

  /**
   * Validate cash transaction data
   * @param {Object} cashTransactionData - The cash transaction data to validate
   * @returns {ValidationResult} - Validation result with field-level errors
   */
  validateCashTransactionData(cashTransactionData) {
    const result = createValidResult();

    // Validate that either cashIn or cashOut is provided
    const cashIn = cashTransactionData.cashIn || 0;
    const cashOut = cashTransactionData.cashOut || 0;

    if (cashIn <= 0 && cashOut <= 0) {
      addError(result, 'cashIn', 'Either cashIn or cashOut must be a positive amount');
      addError(result, 'cashOut', 'Either cashIn or cashOut must be a positive amount');
    }

    // Validate cashIn if provided
    if (cashTransactionData.cashIn != null && cashTransactionData.cashIn > 0) {
      const cashInError = validatePositiveNumber(cashTransactionData.cashIn, 'cashIn', false);
      if (cashInError) {
        addError(result, cashInError.field, cashInError.message);
      }
    }

    // Validate cashOut if provided
    if (cashTransactionData.cashOut != null && cashTransactionData.cashOut > 0) {
      const cashOutError = validatePositiveNumber(cashTransactionData.cashOut, 'cashOut', false);
      if (cashOutError) {
        addError(result, cashOutError.field, cashOutError.message);
      }
    }

    // Validate description
    const descriptionError = validateRequired(cashTransactionData.description, 'description');
    if (descriptionError) {
      addError(result, descriptionError.field, descriptionError.message);
    }

    // Validate date
    const dateError = validateRequired(cashTransactionData.date, 'date');
    if (dateError) {
      addError(result, dateError.field, dateError.message);
    }

    return result;
  }
}

export default CashTransactionService;
