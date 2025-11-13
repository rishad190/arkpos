import { create } from "zustand";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
import { CustomerService } from "@/services/customerService";
import { AtomicOperationService } from "@/services/atomicOperations";

const customerService = new CustomerService(db, logger, new AtomicOperationService());

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
