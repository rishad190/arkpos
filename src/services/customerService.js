"use client";
import { ref, push, set, update, remove, get, onValue } from "firebase/database";
import { AppError, ERROR_TYPES } from "@/lib/errors";
import {
  createValidResult,
  addError,
  validateRequired,
  validateStringLength,
  validatePhoneNumber,
  validateEmail,
  formatValidationErrors,
} from "@/lib/validation";
import { requireAuth } from "@/lib/authValidation";
import { sanitizeObject } from "@/lib/sanitization";

const COLLECTION_PATH = "customers";

/**
 * Customer Service - Handles all customer-related Firebase operations
 * @typedef {import('../types/models').Customer} Customer
 * @typedef {import('../types/models').Transaction} Transaction
 * @typedef {import('../types/models').ValidationResult} ValidationResult
 */
export class CustomerService {
  /**
   * Create a new CustomerService instance
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
   * Subscribe to customer updates
   * @param {Function} callback - Function called with updated customer list
   * @returns {Function} Unsubscribe function
   */
  subscribeToCustomers(callback) {
    const customersRef = ref(this.db, COLLECTION_PATH);
    return onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const customerList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        callback(customerList);
      } else {
        callback([]);
      }
    }, (error) => {
      this.logger.error("Error subscribing to customers:", error);
      callback([]);
    });
  }

  /**
   * Add a new customer to the database
   * @param {Partial<Customer>} customerData - Customer data to add (name, phone, address, email)
   * @returns {Promise<string>} The new customer ID
   * @throws {AppError} If validation fails or database operation fails
   */
  async addCustomer(customerData) {
    // Validate authentication
    requireAuth();

    // Sanitize input data
    const sanitizedData = sanitizeObject(customerData);

    const validationResult = this.validateCustomerData(sanitizedData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { customerData: sanitizedData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("addCustomer", async () => {
      const customersRef = ref(this.db, COLLECTION_PATH);
      const newCustomerRef = push(customersRef);
      await set(newCustomerRef, {
        ...sanitizedData,
        createdAt: new Date().toISOString(),
      });
      return newCustomerRef.key;
    });
  }

  /**
   * Update an existing customer
   * @param {string} customerId - The customer ID to update
   * @param {Partial<Customer>} updatedData - Updated customer data
   * @returns {Promise<void>}
   * @throws {AppError} If validation fails or database operation fails
   */
  async updateCustomer(customerId, updatedData) {
    // Validate authentication
    requireAuth();

    // Sanitize input data
    const sanitizedData = sanitizeObject(updatedData);

    const validationResult = this.validateCustomerData(sanitizedData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { customerId, updatedData: sanitizedData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("updateCustomer", async () => {
      const customerRef = ref(this.db, `${COLLECTION_PATH}/${customerId}`);
      await update(customerRef, {
        ...sanitizedData,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Delete a customer and their associated transactions
   * @param {string} customerId - The customer ID to delete
   * @param {Array<Transaction>} [customerTransactions=[]] - Associated transactions to delete
   * @returns {Promise<void>}
   * @throws {AppError} If deletion fails or customer not found
   */
  async deleteCustomer(customerId, customerTransactions = []) {
    // Validate authentication
    requireAuth();

    return this.atomicOperations.execute("deleteCustomer", async () => {
      this.logger.info(`Attempting to delete customer: ${customerId}`);
      this.logger.info(
        `Number of associated transactions to delete: ${customerTransactions.length}`
      );

      try {
        // Verify customer exists before attempting deletion
        const customerRef = ref(this.db, `${COLLECTION_PATH}/${customerId}`);
        const customerSnapshot = await get(customerRef);
        
        if (!customerSnapshot.exists()) {
          throw new AppError(
            `Customer with ID ${customerId} not found`,
            ERROR_TYPES.NOT_FOUND,
            { customerId }
          );
        }

        // Use Firebase multi-path update for atomic deletion
        const updates = {};
        
        // Mark customer for deletion
        updates[`${COLLECTION_PATH}/${customerId}`] = null;
        
        // Mark all associated transactions for deletion
        for (const transaction of customerTransactions) {
          this.logger.info(
            `Marking transaction for deletion: ${transaction.id} for customer: ${customerId}`
          );
          updates[`transactions/${transaction.id}`] = null;
        }

        // Execute all deletions atomically
        await update(ref(this.db), updates);
        
        this.logger.info(
          `Successfully deleted customer ${customerId} and ${customerTransactions.length} transactions atomically`
        );
      } catch (error) {
        this.logger.error(
          `Error during customer or transaction deletion for customer ${customerId}:`,
          error.message,
          error.code,
          error
        );
        throw error; // Re-throw the error so it can be caught by the store
      }
    });
  }

  /**
   * Get customer by ID
   * @param {string} customerId - The customer ID to retrieve
   * @returns {Promise<Customer|null>} The customer object or null if not found
   */
  async getCustomer(customerId) {
    // Validate authentication
    requireAuth();

    const customerRef = ref(this.db, `${COLLECTION_PATH}/${customerId}`);
    const snapshot = await get(customerRef);
    return snapshot.exists() ? { id: customerId, ...snapshot.val() } : null;
  }

  /**
   * Validate customer data
   * @param {Object} customerData - The customer data to validate
   * @returns {ValidationResult} - Validation result with field-level errors
   */
  validateCustomerData(customerData) {
    const result = createValidResult();

    // Validate name
    const nameError = validateRequired(customerData.name, 'name');
    if (nameError) {
      addError(result, nameError.field, nameError.message);
    } else {
      const lengthError = validateStringLength(customerData.name, 'name', 1, 100);
      if (lengthError) {
        addError(result, lengthError.field, lengthError.message);
      }
    }

    // Validate phone
    const phoneError = validateRequired(customerData.phone, 'phone');
    if (phoneError) {
      addError(result, phoneError.field, phoneError.message);
    } else {
      const phoneFormatError = validatePhoneNumber(customerData.phone, 'phone');
      if (phoneFormatError) {
        addError(result, phoneFormatError.field, phoneFormatError.message);
      }
    }

    // Validate email if provided
    if (customerData.email) {
      const emailError = validateEmail(customerData.email, 'email');
      if (emailError) {
        addError(result, emailError.field, emailError.message);
      }
    }

    // Validate address length if provided
    if (customerData.address) {
      const addressLengthError = validateStringLength(customerData.address, 'address', null, 500);
      if (addressLengthError) {
        addError(result, addressLengthError.field, addressLengthError.message);
      }
    }

    return result;
  }

  /**
   * Calculate customer due amount from transactions
   * @param {string} customerId - The customer ID
   * @param {Array<Transaction>} [transactions=[]] - Array of all transactions
   * @returns {number} Total due amount for the customer
   */
  calculateCustomerDue(customerId, transactions = []) {
    return transactions
      .filter((t) => t.customerId === customerId)
      .reduce((total, t) => total + ((t.total || 0) - (t.deposit || 0)), 0);
  }
}

export default CustomerService;
