import { create } from "zustand";
import {
  ref,
  push,
  set,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  get,
  serverTimestamp,
} from "firebase/database";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
import { TransactionService } from "@/services/transactionService";
import { AtomicOperationService } from "@/services/atomicOperations";

const transactionService = new TransactionService(db, logger, new AtomicOperationService());
const atomicOperations = new AtomicOperationService();

const COLLECTION_REFS = {
  TRANSACTIONS: "transactions",
  DAILY_CASH_INCOME: "dailyCashIncome",
  DAILY_CASH_EXPENSE: "dailyCashExpense",
};

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  dailyCashIncome: [],
  dailyCashExpense: [],
  loading: true,
  error: null,

  setTransactions: (transactions) => set({ transactions, loading: false }),
  setDailyCashIncome: (dailyCashIncome) => set({ dailyCashIncome }),
  setDailyCashExpense: (dailyCashExpense) => set({ dailyCashExpense }),

  // Transaction Operations
  addTransaction: async (transactionData) => {
    try {
      const newTransactionId = await transactionService.addTransaction(transactionData);
      // State updated by listener
      return newTransactionId;
    } catch (error) {
      logger.error("Error adding transaction:", error);
      set({ error });
    }
  },

  updateTransaction: async (transactionId, updatedData) => {
    try {
      await transactionService.updateTransaction(transactionId, updatedData);
      // State updated by listener
    } catch (error) {
      logger.error("Error updating transaction:", error);
      set({ error });
    }
  },

  deleteTransaction: async (transactionId) => {
    try {
      await transactionService.deleteTransaction(transactionId);
      // State updated by listener
    } catch (error) {
      logger.error("Error deleting transaction:", error);
      set({ error });
    }
  },

  // Daily Cash Operations
  addDailyCashTransaction: async (transaction) => {
    const validationErrors = [];
    if (!transaction.date) validationErrors.push("Date is required");
    if (!transaction.description?.trim()) validationErrors.push("Description is required");
    if ((transaction.cashIn || 0) < 0 || (transaction.cashOut || 0) < 0) {
      validationErrors.push("Cash amounts cannot be negative");
    }

    if (validationErrors.length > 0) {
      const error = new Error(`Validation failed: ${validationErrors.join(", ")}`);
      set({ error });
      throw error;
    }

    try {
      return await atomicOperations.execute("addDailyCashTransaction", async () => {
        const collectionPath =
          transaction.cashIn > 0
            ? COLLECTION_REFS.DAILY_CASH_INCOME
            : COLLECTION_REFS.DAILY_CASH_EXPENSE;
        const dailyCashRef = ref(db, collectionPath);
        const newTransactionRef = push(dailyCashRef);
        await set(newTransactionRef, {
          ...transaction,
          id: newTransactionRef.key,
          createdAt: serverTimestamp(),
        });

        if (transaction.type === "sale" && transaction.reference) {
          const customerTransactionRef = query(
            ref(db, "transactions"),
            orderByChild("memoNumber"),
            equalTo(transaction.reference)
          );

          const snapshot = await get(customerTransactionRef);
          if (snapshot.exists()) {
            const [transactionId, transactionData] = Object.entries(snapshot.val())[0];
            await update(ref(db, `transactions/${transactionId}`), {
              deposit: (transactionData.deposit || 0) + (transaction.cashIn || 0),
              due: transactionData.total - ((transactionData.deposit || 0) + (transaction.cashIn || 0)),
            });
          }
        }
        return newTransactionRef.key;
      });
    } catch (error) {
      logger.error("Error adding daily cash transaction:", error);
      set({ error });
    }
  },

  deleteDailyCashTransaction: async (transactionId) => {
    try {
      return await atomicOperations.execute("deleteDailyCashTransaction", async () => {
        let dailyCashData = null;
        let collectionPath = null;

        const incomeSnapshot = await get(ref(db, `${COLLECTION_REFS.DAILY_CASH_INCOME}/${transactionId}`));
        if (incomeSnapshot.exists()) {
          dailyCashData = incomeSnapshot.val();
          collectionPath = COLLECTION_REFS.DAILY_CASH_INCOME;
        } else {
          const expenseSnapshot = await get(ref(db, `${COLLECTION_REFS.DAILY_CASH_EXPENSE}/${transactionId}`));
          if (expenseSnapshot.exists()) {
            dailyCashData = expenseSnapshot.val();
            collectionPath = COLLECTION_REFS.DAILY_CASH_EXPENSE;
          }
        }

        if (!dailyCashData || !collectionPath) {
          throw new Error("Transaction not found in any daily cash collection.");
        }

        if (dailyCashData.type === "sale" && dailyCashData.reference) {
          const customerTransactionRef = query(
            ref(db, "transactions"),
            orderByChild("memoNumber"),
            equalTo(dailyCashData.reference)
          );
          const snapshot = await get(customerTransactionRef);

          if (snapshot.exists()) {
            const [id, transactionData] = Object.entries(snapshot.val())[0];
            await update(ref(db, `transactions/${id}`), {
              deposit: (transactionData.deposit || 0) - (dailyCashData.cashIn || 0),
            });
          }
        }

        await remove(ref(db, `${collectionPath}/${transactionId}`));
      });
    } catch (error) {
      logger.error("Error deleting daily cash transaction:", error);
      set({ error });
    }
  },

  updateDailyCashTransaction: async (transactionId, updatedData) => {
    const validationErrors = [];
    if (!updatedData.date) validationErrors.push("Date is required");
    if (!updatedData.description?.trim()) validationErrors.push("Description is required");
    if ((updatedData.cashIn || 0) < 0 || (updatedData.cashOut || 0) < 0) {
      validationErrors.push("Cash amounts cannot be negative");
    }

    if (validationErrors.length > 0) {
      const error = new Error(`Validation failed: ${validationErrors.join(", ")}`);
      set({ error });
      throw error;
    }

    try {
      return await atomicOperations.execute("updateDailyCashTransaction", async () => {
        let originalData = null;
        let originalCollectionPath = null;

        const incomeSnapshot = await get(ref(db, `${COLLECTION_REFS.DAILY_CASH_INCOME}/${transactionId}`));
        if (incomeSnapshot.exists()) {
          originalData = incomeSnapshot.val();
          originalCollectionPath = COLLECTION_REFS.DAILY_CASH_INCOME;
        } else {
          const expenseSnapshot = await get(ref(db, `${COLLECTION_REFS.DAILY_CASH_EXPENSE}/${transactionId}`));
          if (expenseSnapshot.exists()) {
            originalData = expenseSnapshot.val();
            originalCollectionPath = COLLECTION_REFS.DAILY_CASH_EXPENSE;
          }
        }

        if (!originalData || !originalCollectionPath) {
          throw new Error("Original transaction not found.");
        }

        const updatedCollectionPath =
          updatedData.cashIn > 0
            ? COLLECTION_REFS.DAILY_CASH_INCOME
            : COLLECTION_REFS.DAILY_CASH_EXPENSE;

        if (originalCollectionPath !== updatedCollectionPath) {
          await remove(ref(db, `${originalCollectionPath}/${transactionId}`));
          await set(ref(db, `${updatedCollectionPath}/${transactionId}`), {
            ...updatedData,
            updatedAt: serverTimestamp(),
          });
        } else {
          await update(ref(db, `${originalCollectionPath}/${transactionId}`), {
            ...updatedData,
            updatedAt: serverTimestamp(),
          });
        }

        if (originalData.type === "sale" && originalData.reference) {
          const customerTransactionRef = query(
            ref(db, "transactions"),
            orderByChild("memoNumber"),
            equalTo(originalData.reference)
          );
          const snapshot = await get(customerTransactionRef);

          if (snapshot.exists()) {
            const [id, transactionData] = Object.entries(snapshot.val())[0];
            const originalCashIn = originalData.cashIn || 0;
            const newCashIn = updatedData.cashIn || 0;
            const depositChange = newCashIn - originalCashIn;

            await update(ref(db, `transactions/${id}`), {
              deposit: (transactionData.deposit || 0) + depositChange,
            });
          }
        }
      });
    } catch (error) {
      logger.error("Error updating daily cash transaction:", error);
      set({ error });
    }
  },

  getExpenseCategories: () => {
    const { dailyCashExpense } = get();
    const categories = new Set();
    dailyCashExpense.forEach(transaction => {
      if (transaction.category) {
        categories.add(transaction.category);
      }
    });
    return Array.from(categories).sort();
  },
}));
