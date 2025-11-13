import { create } from "zustand";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
import { CustomerService } from "@/services/customerService";
import { useAppStore } from "@/store/appStore"; // Import the app store

// Helper function to lazily get the initialized service
const getAtomicService = () => {
  const service = useAppStore.getState().atomicOperations;
  if (!service) {
    logger.error(
      "AtomicOperationService not yet available in appStore",
      "customerStore"
    );
    // Return a mock service to prevent crashes, though operations will fail
    return {
      execute: () => Promise.reject(new Error("Atomic service not ready.")),
    };
  }
  return service;
};

// Create a lazy wrapper for the service
const lazyAtomicOperations = {
  execute: (operationName, operationFn, fallbackFn = null) => {
    // Get the service *at the time of execution*
    return getAtomicService().execute(operationName, operationFn, fallbackFn);
  },
};

// Instantiate CustomerService using the lazy wrapper
const customerService = new CustomerService(db, logger, lazyAtomicOperations);

export const useCustomerStore = create((set, get) => ({
  customers: [],
  transactions: [], // Transactions are needed to calculate dues
  loading: true,
  error: null,

  setCustomers: (customers) => set({ customers, loading: false }),
  setTransactions: (transactions) => set({ transactions }),

  getCustomerDue: (customerId) => {
    const { transactions } = get();
    return transactions
      ?.filter((t) => t.customerId === customerId)
      .reduce((total, t) => total + ((t.total || 0) - (t.deposit || 0)), 0);
  },

  addCustomer: async (customerData) => {
    try {
      const newCustomerId = await customerService.addCustomer(customerData);
      // No state update here, relying on Firebase listener to update the store
      return newCustomerId;
    } catch (error) {
      logger.error("Error adding customer:", error);
      set({ error });
    }
  },

  updateCustomer: async (customerId, updatedData) => {
    try {
      await customerService.updateCustomer(customerId, updatedData);
      // No state update here, relying on Firebase listener
    } catch (error) {
      logger.error("Error updating customer:", error);
      set({ error });
    }
  },

  deleteCustomer: async (customerId) => {
    try {
      await customerService.deleteCustomer(customerId);
      // No state update here, relying on Firebase listener
    } catch (error) {
      logger.error("Error deleting customer:", error);
      set({ error });
    }
  },
}));
