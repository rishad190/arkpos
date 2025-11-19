"use client";
import { ref, push, set, update, remove, get } from "firebase/database";
import { AppError, ERROR_TYPES } from "@/lib/errors";
import {
  createValidResult,
  addError,
  validateRequired,
  validateStringLength,
  validatePhoneNumber,
  validateEmail,
  validatePositiveNumber,
  formatValidationErrors,
} from "@/lib/validation";

const COLLECTION_PATH = "suppliers";
const SUPPLIER_TRANSACTIONS_PATH = "supplierTransactions";

/**
 * Supplier Service - Handles all supplier-related Firebase operations
 * @typedef {import('../types/models').Supplier} Supplier
 * @typedef {import('../types/models').SupplierTransaction} SupplierTransaction
 * @typedef {import('../types/models').ValidationResult} ValidationResult
 */
export class SupplierService {
  /**
   * Create a new SupplierService instance
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
   * Add a new supplier to the database
   * @param {Partial<Supplier>} supplierData - Supplier data to add (name, phone, address, email)
   * @returns {Promise<string>} The new supplier ID
   * @throws {AppError} If validation fails or database operation fails
   */
  async addSupplier(supplierData) {
    const validationResult = this.validateSupplierData(supplierData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { supplierData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("addSupplier", async () => {
      const suppliersRef = ref(this.db, COLLECTION_PATH);
      const newSupplierRef = push(suppliersRef);
      await set(newSupplierRef, {
        ...supplierData,
        totalDue: 0, // Initialize with zero due
        createdAt: new Date().toISOString(),
      });
      return newSupplierRef.key;
    });
  }

  /**
   * Update an existing supplier
   * @param {string} supplierId - The supplier ID to update
   * @param {Partial<Supplier>} updatedData - Updated supplier data
   * @returns {Promise<void>}
   * @throws {AppError} If validation fails or database operation fails
   */
  async updateSupplier(supplierId, updatedData) {
    const validationResult = this.validateSupplierData(updatedData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { supplierId, updatedData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("updateSupplier", async () => {
      const supplierRef = ref(this.db, `${COLLECTION_PATH}/${supplierId}`);
      await update(supplierRef, {
        ...updatedData,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Delete a supplier from the database
   * @param {string} supplierId - The supplier ID to delete
   * @returns {Promise<void>}
   * @throws {AppError} If supplier not found or database operation fails
   */
  async deleteSupplier(supplierId) {
    return this.atomicOperations.execute("deleteSupplier", async () => {
      const supplierRef = ref(this.db, `${COLLECTION_PATH}/${supplierId}`);
      const supplierSnapshot = await get(supplierRef);
      
      if (!supplierSnapshot.exists()) {
        throw new AppError(
          `Supplier with ID ${supplierId} not found`,
          ERROR_TYPES.NOT_FOUND,
          { supplierId }
        );
      }

      await remove(supplierRef);
    });
  }

  /**
   * Calculate total due for a supplier from their transactions
   * Validates that the calculated total matches the stored totalDue
   * @param {string} supplierId - The supplier ID
   * @param {Array<SupplierTransaction>} [supplierTransactions=[]] - Array of supplier transactions
   * @returns {Promise<{calculated: number, stored: number, isValid: boolean}>} Due calculation result
   */
  async calculateAndValidateSupplierDue(supplierId, supplierTransactions = []) {
    return this.atomicOperations.execute("calculateSupplierDue", async () => {
      // Get supplier data
      const supplierRef = ref(this.db, `${COLLECTION_PATH}/${supplierId}`);
      const supplierSnapshot = await get(supplierRef);
      
      if (!supplierSnapshot.exists()) {
        throw new AppError(
          `Supplier with ID ${supplierId} not found`,
          ERROR_TYPES.NOT_FOUND,
          { supplierId }
        );
      }

      const supplierData = supplierSnapshot.val();
      const storedTotalDue = supplierData.totalDue || 0;

      // Calculate total due from transactions
      const calculatedTotalDue = supplierTransactions
        .filter((t) => t.supplierId === supplierId)
        .reduce((total, t) => {
          const transactionDue = (t.totalAmount || 0) - (t.paidAmount || 0);
          return total + transactionDue;
        }, 0);

      // Validate that calculated matches stored (with small tolerance for floating point)
      const tolerance = 0.01;
      const isValid = Math.abs(calculatedTotalDue - storedTotalDue) < tolerance;

      if (!isValid) {
        this.logger.warn(
          `Supplier due mismatch for ${supplierId}: stored=${storedTotalDue}, calculated=${calculatedTotalDue}`
        );
      }

      return {
        calculated: calculatedTotalDue,
        stored: storedTotalDue,
        isValid,
        supplierId,
        transactionCount: supplierTransactions.filter((t) => t.supplierId === supplierId).length
      };
    });
  }

  /**
   * Update supplier total due based on transactions
   * @param {string} supplierId - The supplier ID
   * @param {Array<SupplierTransaction>} supplierTransactions - Array of supplier transactions
   * @returns {Promise<void>}
   */
  async updateSupplierTotalDue(supplierId, supplierTransactions = []) {
    return this.atomicOperations.execute("updateSupplierTotalDue", async () => {
      const calculatedTotalDue = supplierTransactions
        .filter((t) => t.supplierId === supplierId)
        .reduce((total, t) => {
          const transactionDue = (t.totalAmount || 0) - (t.paidAmount || 0);
          return total + transactionDue;
        }, 0);

      const supplierRef = ref(this.db, `${COLLECTION_PATH}/${supplierId}`);
      await update(supplierRef, {
        totalDue: calculatedTotalDue,
        updatedAt: new Date().toISOString(),
      });

      this.logger.info(
        `Updated supplier ${supplierId} total due to ${calculatedTotalDue}`
      );
    });
  }

  /**
   * Validate supplier data
   * @param {Object} supplierData - The supplier data to validate
   * @returns {ValidationResult} - Validation result with field-level errors
   */
  validateSupplierData(supplierData) {
    const result = createValidResult();

    // Validate name
    const nameError = validateRequired(supplierData.name, 'name');
    if (nameError) {
      addError(result, nameError.field, nameError.message);
    } else {
      const lengthError = validateStringLength(supplierData.name, 'name', 1, 100);
      if (lengthError) {
        addError(result, lengthError.field, lengthError.message);
      }
    }

    // Validate phone
    const phoneError = validateRequired(supplierData.phone, 'phone');
    if (phoneError) {
      addError(result, phoneError.field, phoneError.message);
    } else {
      const phoneFormatError = validatePhoneNumber(supplierData.phone, 'phone');
      if (phoneFormatError) {
        addError(result, phoneFormatError.field, phoneFormatError.message);
      }
    }

    // Validate email if provided
    if (supplierData.email) {
      const emailError = validateEmail(supplierData.email, 'email');
      if (emailError) {
        addError(result, emailError.field, emailError.message);
      }
    }

    // Validate address length if provided
    if (supplierData.address) {
      const addressLengthError = validateStringLength(supplierData.address, 'address', null, 500);
      if (addressLengthError) {
        addError(result, addressLengthError.field, addressLengthError.message);
      }
    }

    // Validate totalDue if provided
    if (supplierData.totalDue != null) {
      const dueError = validatePositiveNumber(supplierData.totalDue, 'totalDue', true);
      if (dueError) {
        addError(result, dueError.field, dueError.message);
      }
    }

    return result;
  }

  /**
   * Validate supplier transaction data
   * @param {Object} transactionData - The transaction data to validate
   * @returns {ValidationResult} - Validation result with field-level errors
   */
  validateSupplierTransactionData(transactionData) {
    const result = createValidResult();

    // Validate supplierId
    const supplierIdError = validateRequired(transactionData.supplierId, 'supplierId');
    if (supplierIdError) {
      addError(result, supplierIdError.field, supplierIdError.message);
    }

    // Validate totalAmount
    if (transactionData.totalAmount == null) {
      addError(result, 'totalAmount', 'Total amount is required');
    } else {
      const totalError = validatePositiveNumber(transactionData.totalAmount, 'totalAmount', true);
      if (totalError) {
        addError(result, totalError.field, totalError.message);
      }
    }

    // Validate paidAmount
    if (transactionData.paidAmount != null) {
      const paidError = validatePositiveNumber(transactionData.paidAmount, 'paidAmount', true);
      if (paidError) {
        addError(result, paidError.field, paidError.message);
      }

      // Validate that paidAmount doesn't exceed totalAmount
      if (transactionData.totalAmount != null && transactionData.paidAmount > transactionData.totalAmount) {
        addError(result, 'paidAmount', 'Paid amount cannot exceed total amount');
      }
    }

    return result;
  }
}

export default SupplierService;
