"use client";
import { ref, push, set, update, remove, get } from "firebase/database";

const COLLECTION_PATH = "customers";

/**
 * Customer Service - Handles all customer-related Firebase operations
 */
export class CustomerService {
  constructor(db, logger, atomicOperations) {
    this.db = db;
    this.logger = logger;
    this.atomicOperations = atomicOperations;
  }

  /**
   * Add a new customer
   */
  async addCustomer(customerData) {
    const validationErrors = this.validateCustomerData(customerData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    return this.atomicOperations.execute("addCustomer", async () => {
      const customersRef = ref(this.db, COLLECTION_PATH);
      const newCustomerRef = push(customersRef);
      await set(newCustomerRef, {
        ...customerData,
        createdAt: new Date().toISOString(),
      });
      return newCustomerRef.key;
    });
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(customerId, updatedData) {
    const validationErrors = this.validateCustomerData(updatedData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    return this.atomicOperations.execute("updateCustomer", async () => {
      const customerRef = ref(this.db, `${COLLECTION_PATH}/${customerId}`);
      await update(customerRef, {
        ...updatedData,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Delete a customer and their associated transactions
   */
  async deleteCustomer(customerId, customerTransactions = []) {
    return this.atomicOperations.execute("deleteCustomer", async () => {
      // First delete associated transactions
      for (const transaction of customerTransactions) {
        await remove(ref(this.db, `transactions/${transaction.id}`));
      }
      // Then delete the customer
      await remove(ref(this.db, `${COLLECTION_PATH}/${customerId}`));
    });
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId) {
    const customerRef = ref(this.db, `${COLLECTION_PATH}/${customerId}`);
    const snapshot = await get(customerRef);
    return snapshot.exists() ? { id: customerId, ...snapshot.val() } : null;
  }

  /**
   * Validate customer data
   */
  validateCustomerData(customerData) {
    const errors = [];
    if (!customerData.name?.trim()) errors.push("Customer name is required");
    if (!customerData.phone?.trim()) errors.push("Phone number is required");
    return errors;
  }

  /**
   * Calculate customer due amount
   */
  calculateCustomerDue(customerId, transactions = []) {
    return transactions
      .filter((t) => t.customerId === customerId)
      .reduce((total, t) => total + ((t.total || 0) - (t.deposit || 0)), 0);
  }
}

export default CustomerService;
