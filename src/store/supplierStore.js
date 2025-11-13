import { create } from "zustand";
import {
  ref,
  push,
  set,
  update,
  remove,
  get,
  serverTimestamp,
} from "firebase/database";
import { db } from "@/lib/firebase";
import { useAppStore } from "@/store/appStore"; // Import app store
import logger from "@/utils/logger";

const COLLECTION_REFS = {
  SUPPLIERS: "suppliers",
  SUPPLIER_TRANSACTIONS: "supplierTransactions",
};

// Helper function to lazily get the initialized service
const getAtomicService = () => {
  const service = useAppStore.getState().atomicOperations;
  if (!service) {
    logger.error(
      "AtomicOperationService not yet available in appStore",
      "supplierStore"
    );
    return {
      execute: () => Promise.reject(new Error("Atomic service not ready.")),
    };
  }
  return service;
};

// Create a lazy wrapper for the service
const atomicOperations = {
  execute: (operationName, operationFn, fallbackFn = null) => {
    return getAtomicService().execute(operationName, operationFn, fallbackFn);
  },
};

export const useSupplierStore = create((set, get) => ({
  suppliers: [],
  supplierTransactions: [],
  loading: true,
  error: null,

  setSuppliers: (suppliers) => set({ suppliers, loading: false }),
  setSupplierTransactions: (supplierTransactions) =>
    set({ supplierTransactions }),

  addSupplier: async (supplierData) => {
    const validationErrors = [];
    if (!supplierData.name?.trim())
      validationErrors.push("Supplier name is required");
    if (!supplierData.phone?.trim())
      validationErrors.push("Phone number is required");

    if (validationErrors.length > 0) {
      const error = new Error(
        `Validation failed: ${validationErrors.join(", ")}`
      );
      set({ error });
      throw error;
    }

    try {
      return await atomicOperations.execute("addSupplier", async () => {
        const suppliersRef = ref(db, COLLECTION_REFS.SUPPLIERS);
        const newSupplierRef = push(suppliersRef);
        await set(newSupplierRef, {
          ...supplierData,
          totalDue: 0,
          createdAt: serverTimestamp(),
        });
        return newSupplierRef.key;
      });
    } catch (error) {
      logger.error("Error adding supplier:", error);
      set({ error });
    }
  },

  updateSupplier: async (supplierId, updatedData) => {
    try {
      return await atomicOperations.execute("updateSupplier", async () => {
        const supplierRef = ref(
          db,
          `${COLLECTION_REFS.SUPPLIERS}/${supplierId}`
        );
        await update(supplierRef, {
          ...updatedData,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      logger.error("Error updating supplier:", error);
      set({ error });
    }
  },

  deleteSupplier: async (supplierId) => {
    try {
      return await atomicOperations.execute("deleteSupplier", async () => {
        const { supplierTransactions } = get();
        const transactionsToDelete = supplierTransactions.filter(
          (t) => t.supplierId === supplierId
        );

        for (const transaction of transactionsToDelete) {
          await remove(
            ref(
              db,
              `${COLLECTION_REFS.SUPPLIER_TRANSACTIONS}/${transaction.id}`
            )
          );
        }

        await remove(ref(db, `${COLLECTION_REFS.SUPPLIERS}/${supplierId}`));
      });
    } catch (error) {
      logger.error("Error deleting supplier:", error);
      set({ error });
    }
  },

  addSupplierTransaction: async (transaction) => {
    const validationErrors = [];
    if (!transaction.supplierId)
      validationErrors.push("Supplier ID is required");
    if (!transaction.totalAmount || transaction.totalAmount <= 0)
      validationErrors.push("Valid total amount is required");

    if (validationErrors.length > 0) {
      const error = new Error(
        `Validation failed: ${validationErrors.join(", ")}`
      );
      set({ error });
      throw error;
    }

    try {
      return await atomicOperations.execute(
        "addSupplierTransaction",
        async () => {
          const transactionsRef = ref(
            db,
            COLLECTION_REFS.SUPPLIER_TRANSACTIONS
          );
          const newTransactionRef = push(transactionsRef);

          const newTransaction = {
            ...transaction,
            id: newTransactionRef.key,
            due: transaction.totalAmount - (transaction.paidAmount || 0),
            createdAt: serverTimestamp(),
          };

          await set(newTransactionRef, newTransaction);

          const supplierRef = ref(
            db,
            `${COLLECTION_REFS.SUPPLIERS}/${transaction.supplierId}`
          );
          const supplierSnapshot = await get(supplierRef);

          if (supplierSnapshot.exists()) {
            const currentDue = supplierSnapshot.val().totalDue || 0;
            await update(supplierRef, {
              totalDue: currentDue + newTransaction.due,
              updatedAt: serverTimestamp(),
            });
          }

          return newTransactionRef.key;
        }
      );
    } catch (error) {
      logger.error("Error adding supplier transaction:", error);
      set({ error });
    }
  },

  deleteSupplierTransaction: async (
    transactionId,
    supplierId,
    amount,
    paidAmount
  ) => {
    try {
      return await atomicOperations.execute(
        "deleteSupplierTransaction",
        async () => {
          await remove(
            ref(db, `${COLLECTION_REFS.SUPPLIER_TRANSACTIONS}/${transactionId}`)
          );

          const supplierRef = ref(
            db,
            `${COLLECTION_REFS.SUPPLIERS}/${supplierId}`
          );
          const supplierSnapshot = await get(supplierRef);

          if (supplierSnapshot.exists()) {
            const supplier = supplierSnapshot.val();
            const dueAmount = amount - (paidAmount || 0);
            const newTotalDue = Math.max(
              0,
              (supplier.totalDue || 0) - dueAmount
            );

            await update(supplierRef, {
              totalDue: newTotalDue,
              updatedAt: serverTimestamp(),
            });
          }
        }
      );
    } catch (error) {
      logger.error("Error deleting supplier transaction:", error);
      set({ error });
    }
  },
}));
