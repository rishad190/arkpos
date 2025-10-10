"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useReducer,
} from "react";
import {
  ref,
  onValue,
  push,
  set,
  remove,
  update,
  serverTimestamp,
  get,
  query,
  orderByChild,
  equalTo,
  runTransaction,
} from "firebase/database";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Create context
const DataContext = createContext(null);

// Default expense categories
const DEFAULT_EXPENSE_CATEGORIES = [
  "Utilities",
  "Rent",
  "Salaries",
  "Supplies",
  "Transportation",
  "Maintenance",
  "Marketing",
  "Insurance",
  "Taxes",
  "Others",
];

// Firebase References
const COLLECTION_REFS = {
  CUSTOMERS: "customers",
  TRANSACTIONS: "transactions",
  DAILY_CASH: "dailyCash",
  FABRIC_BATCHES: "fabricBatches",
  FABRICS: "fabrics",
  SUPPLIERS: "suppliers",
  SUPPLIER_TRANSACTIONS: "supplierTransactions",
  SETTINGS: "settings",
};

// Add settings to the initial state
const initialState = {
  customers: [],
  transactions: [],
  dailyCashTransactions: [],
  fabricBatches: [],
  fabrics: [],
  suppliers: [],
  supplierTransactions: [],
  loading: true,
  error: null,
  settings: {
    store: {
      storeName: "",
      address: "",
      phone: "",
      email: "",
      currency: "৳",
    },
    notifications: {
      lowStockAlert: true,
      duePaymentAlert: true,
      newOrderAlert: true,
      emailNotifications: false,
    },
    appearance: {
      theme: "light",
      compactMode: false,
      showImages: true,
    },
    security: {
      requirePassword: false,
      sessionTimeout: 30,
      backupEnabled: true,
    },
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  },
};

// Reducer with granular updates
function reducer(state, action) {
  const { type, payload } = action;
  const itemExists = (collection, id) =>
    collection.some((item) => item.id === id);

  switch (type) {
    // Customer actions
    case "ADD_CUSTOMER":
      return {
        ...state,
        customers: !itemExists(state.customers, payload.id)
          ? [...state.customers, payload]
          : state.customers,
      };
    case "UPDATE_CUSTOMER":
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === payload.id ? { ...c, ...payload } : c
        ),
      };
    case "REMOVE_CUSTOMER":
      return {
        ...state,
        customers: state.customers.filter((c) => c.id !== payload),
      };

    // Transaction actions
    case "ADD_TRANSACTION":
      return {
        ...state,
        transactions: !itemExists(state.transactions, payload.id)
          ? [...state.transactions, payload]
          : state.transactions,
      };
    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === payload.id ? { ...t, ...payload } : t
        ),
      };
    case "REMOVE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== payload),
      };

    // Other collection setters (can be refactored similarly if needed)
    case "SET_CUSTOMERS":
      return { ...state, customers: payload, loading: false };
    case "SET_TRANSACTIONS":
      return { ...state, transactions: payload, loading: false };
    case "SET_DAILY_CASH_TRANSACTIONS":
      return { ...state, dailyCashTransactions: payload, loading: false };
    case "SET_FABRIC_BATCHES":
      return { ...state, fabricBatches: payload, loading: false };
    case "SET_FABRICS":
      return { ...state, fabrics: payload, loading: false };
    case "SET_SUPPLIERS":
      return { ...state, suppliers: payload, loading: false };
    case "SET_SUPPLIER_TRANSACTIONS":
      return { ...state, supplierTransactions: payload, loading: false };

    case "SET_ERROR":
      return { ...state, error: payload, loading: false };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...payload } };
    default:
      return state;
  }
}

// Export the provider component
export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Firebase Subscriptions with granular updates
  useEffect(() => {
    const setupListener = (path, actions) => {
      const collectionRef = ref(db, path);
      const unsubscribers = [
        onChildAdded(collectionRef, (snapshot) => {
          dispatch({
            type: actions.add,
            payload: { id: snapshot.key, ...snapshot.val() },
          });
        }),
        onChildChanged(collectionRef, (snapshot) => {
          dispatch({
            type: actions.update,
            payload: { id: snapshot.key, ...snapshot.val() },
          });
        }),
        onChildRemoved(collectionRef, (snapshot) => {
          dispatch({ type: actions.remove, payload: snapshot.key });
        }),
      ];
      return () => unsubscribers.forEach((unsub) => unsub());
    };

    const unsubscribers = [
      setupListener(COLLECTION_REFS.CUSTOMERS, {
        add: "ADD_CUSTOMER",
        update: "UPDATE_CUSTOMER",
        remove: "REMOVE_CUSTOMER",
      }),
      setupListener(COLLECTION_REFS.TRANSACTIONS, {
        add: "ADD_TRANSACTION",
        update: "UPDATE_TRANSACTION",
        remove: "REMOVE_TRANSACTION",
      }),
      // Fallback for other collections - can be updated to granular listeners as well
    ];

    // Keep onValue for collections that don't need granular updates yet
    const collectionsToFetch = [
      {
        path: COLLECTION_REFS.DAILY_CASH,
        setter: (data) =>
          dispatch({ type: "SET_DAILY_CASH_TRANSACTIONS", payload: data }),
      },
      {
        path: COLLECTION_REFS.FABRIC_BATCHES,
        setter: (data) =>
          dispatch({ type: "SET_FABRIC_BATCHES", payload: data }),
      },
      {
        path: COLLECTION_REFS.FABRICS,
        setter: (data) => dispatch({ type: "SET_FABRICS", payload: data }),
      },
      {
        path: COLLECTION_REFS.SUPPLIERS,
        setter: (data) => dispatch({ type: "SET_SUPPLIERS", payload: data }),
      },
      {
        path: COLLECTION_REFS.SUPPLIER_TRANSACTIONS,
        setter: (data) =>
          dispatch({ type: "SET_SUPPLIER_TRANSACTIONS", payload: data }),
      },
    ];

    collectionsToFetch.forEach(({ path, setter }) => {
      const collectionRef = ref(db, path);
      const unsubscribe = onValue(collectionRef, (snapshot) => {
        const data = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, value]) => ({
              id,
              ...value,
            }))
          : [];
        setter(data);
      });
      unsubscribers.push(unsubscribe);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  // Add memoization for customer dues
  const customerDues = useMemo(() => {
    const dues = {};
    state.customers?.forEach((customer) => {
      dues[customer.id] = state.transactions
        ?.filter((t) => t.customerId === customer.id)
        .reduce((total, t) => total + ((t.total || 0) - (t.deposit || 0)), 0);
    });
    return dues;
  }, [state.customers, state.transactions]);

  const getCustomerDue = useCallback(
    (customerId) => {
      return customerDues[customerId] || 0;
    },
    [customerDues]
  );

  // Get expense categories
  const getExpenseCategories = useCallback(async () => {
    try {
      const categoriesRef = ref(
        db,
        `${COLLECTION_REFS.SETTINGS}/expense_categories`
      );
      const snapshot = await get(categoriesRef);

      if (snapshot.exists()) {
        return snapshot.val().categories || DEFAULT_EXPENSE_CATEGORIES;
      }

      // If no categories exist, initialize with defaults
      await set(categoriesRef, { categories: DEFAULT_EXPENSE_CATEGORIES });
      return DEFAULT_EXPENSE_CATEGORIES;
    } catch (error) {
      console.error("Error getting expense categories:", error);
      return DEFAULT_EXPENSE_CATEGORIES;
    }
  }, []);

  const updateExpenseCategories = async (categories) => {
    try {
      const categoriesRef = ref(
        db,
        `${COLLECTION_REFS.SETTINGS}/expense_categories`
      );
      await set(categoriesRef, { categories });

      // Update local state
      dispatch({
        type: "UPDATE_SETTINGS",
        payload: { expenseCategories: categories },
      });
    } catch (error) {
      console.error("Error updating expense categories:", error);
      throw error;
    }
  };

  // Customer Operations
  const customerOperations = {
    addCustomer: async (customerData) => {
      const customersRef = ref(db, COLLECTION_REFS.CUSTOMERS);
      const newCustomerRef = push(customersRef);
      await set(newCustomerRef, {
        ...customerData,
        createdAt: serverTimestamp(),
      });
      return newCustomerRef.key;
    },

    updateCustomer: async (customerId, updatedData) => {
      const customerRef = ref(db, `${COLLECTION_REFS.CUSTOMERS}/${customerId}`);
      await update(customerRef, {
        ...updatedData,
        updatedAt: serverTimestamp(),
      });
    },

    deleteCustomer: async (customerId) => {
      // First delete associated transactions
      const customerTransactions = state.transactions.filter(
        (t) => t.customerId === customerId
      );
      for (const transaction of customerTransactions) {
        await remove(
          ref(db, `${COLLECTION_REFS.TRANSACTIONS}/${transaction.id}`)
        );
      }
      // Then delete the customer
      await remove(ref(db, `${COLLECTION_REFS.CUSTOMERS}/${customerId}`));
    },

    getCustomerDue,
  };

  // Transaction Operations
  const transactionOperations = {
    addTransaction: async (transactionData) => {
      const transactionsRef = ref(db, COLLECTION_REFS.TRANSACTIONS);
      const newTransactionRef = push(transactionsRef);
      await set(newTransactionRef, {
        ...transactionData,
        createdAt: serverTimestamp(),
      });

      return newTransactionRef.key;
    },

    updateTransaction: async (transactionId, updatedData) => {
      const transactionRef = ref(
        db,
        `${COLLECTION_REFS.TRANSACTIONS}/${transactionId}`
      );
      await update(transactionRef, {
        ...updatedData,
        updatedAt: serverTimestamp(),
      });
    },

    deleteTransaction: async (transactionId) => {
      await remove(ref(db, `${COLLECTION_REFS.TRANSACTIONS}/${transactionId}`));
    },
  };

  // Fabric Operations
  const fabricOperations = {
    addFabric: async (fabricData) => {
      await push(ref(db, COLLECTION_REFS.FABRICS), fabricData);
    },

    updateFabric: async (fabricId, updatedData) => {
      await update(ref(db, `${COLLECTION_REFS.FABRICS}/${fabricId}`), {
        ...updatedData,
        updatedAt: serverTimestamp(),
      });
    },

    deleteFabric: async (fabricId) => {
      await remove(ref(db, `${COLLECTION_REFS.FABRICS}/${fabricId}`));
    },

    addFabricBatch: async (batchData) => {
      await push(ref(db, COLLECTION_REFS.FABRIC_BATCHES), {
        ...batchData,
        createdAt: serverTimestamp(),
      });
    },

    deleteFabricBatch: async (batchId) => {
      try {
        // Get the batch data first to update fabric totals
        const batchRef = ref(
          db,
          `${COLLECTION_REFS.FABRIC_BATCHES}/${batchId}`
        );
        const batchSnapshot = await get(batchRef);

        if (!batchSnapshot.exists()) {
          throw new Error("Batch not found");
        }

        // Delete the batch
        await remove(batchRef);
      } catch (error) {
        console.error("Error deleting fabric batch:", error);
        throw error;
      }
    },
  };

  // Supplier Operations
  const supplierOperations = {
    addSupplier: async (supplierData) => {
      try {
        const suppliersRef = ref(db, COLLECTION_REFS.SUPPLIERS);
        const newSupplierRef = push(suppliersRef);
        await set(newSupplierRef, {
          ...supplierData,
          totalDue: 0,
          createdAt: serverTimestamp(),
        });
        return newSupplierRef.key;
      } catch (error) {
        console.error("Error adding supplier:", error);
        throw error;
      }
    },

    updateSupplier: async (supplierId, updatedData) => {
      try {
        const supplierRef = ref(
          db,
          `${COLLECTION_REFS.SUPPLIERS}/${supplierId}`
        );
        await update(supplierRef, {
          ...updatedData,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error updating supplier:", error);
        throw error;
      }
    },

    deleteSupplier: async (supplierId) => {
      try {
        // First delete associated transactions
        const supplierTransactions = state.transactions.filter(
          (t) => t.supplierId === supplierId
        );

        for (const transaction of supplierTransactions) {
          await remove(
            ref(
              db,
              `${COLLECTION_REFS.SUPPLIER_TRANSACTIONS}/${transaction.id}`
            )
          );
        }

        // Then delete the supplier
        await remove(ref(db, `${COLLECTION_REFS.SUPPLIERS}/${supplierId}`));
      } catch (error) {
        console.error("Error deleting supplier:", error);
        throw error;
      }
    },

    addSupplierTransaction: async (transaction) => {
      try {
        const newTransactionRef = push(
          ref(db, COLLECTION_REFS.SUPPLIER_TRANSACTIONS)
        );
        const due = transaction.totalAmount - (transaction.paidAmount || 0);

        const newTransaction = {
          ...transaction,
          id: newTransactionRef.key,
          due,
          createdAt: serverTimestamp(),
        };

        await set(newTransactionRef, newTransaction);

        const supplierRef = ref(
          db,
          `${COLLECTION_REFS.SUPPLIERS}/${transaction.supplierId}`
        );
        await runTransaction(supplierRef, (supplier) => {
          if (supplier) {
            supplier.totalDue = (supplier.totalDue || 0) + due;
            supplier.updatedAt = serverTimestamp();
          }
          return supplier;
        });

        return newTransactionRef.key;
      } catch (error) {
        console.error("Error adding supplier transaction:", error);
        throw error;
      }
    },

    deleteSupplierTransaction: async (
      transactionId,
      supplierId,
      amount,
      paidAmount
    ) => {
      try {
        // Delete transaction
        await remove(
          ref(db, `${COLLECTION_REFS.SUPPLIER_TRANSACTIONS}/${transactionId}`)
        );

        // Update supplier's total due
        const supplierRef = ref(
          db,
          `${COLLECTION_REFS.SUPPLIERS}/${supplierId}`
        );
        const supplierSnapshot = await get(supplierRef);

        if (supplierSnapshot.exists()) {
          const supplier = supplierSnapshot.val();
          const dueAmount = amount - (paidAmount || 0);
          const newTotalDue = Math.max(0, (supplier.totalDue || 0) - dueAmount);

          await update(supplierRef, {
            totalDue: newTotalDue,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error("Error deleting supplier transaction:", error);
        throw error;
      }
    },
  };

  const dailyCashOperations = {
    addDailyCashTransaction: async (transaction) => {
      try {
        const dailyCashRef = ref(db, COLLECTION_REFS.DAILY_CASH);
        const newTransactionRef = push(dailyCashRef);
        await set(newTransactionRef, {
          ...transaction,
          id: newTransactionRef.key,
          createdAt: serverTimestamp(),
        });

        // Update related customer transaction if it's a sale
        if (transaction.type === "sale" && transaction.reference) {
          const customerTransactionRef = query(
            ref(db, "transactions"),
            orderByChild("memoNumber"),
            equalTo(transaction.reference)
          );

          const snapshot = await get(customerTransactionRef);
          if (snapshot.exists()) {
            const [transactionId, transactionData] = Object.entries(
              snapshot.val()
            )[0];
            await update(ref(db, `transactions/${transactionId}`), {
              deposit:
                (transactionData.deposit || 0) + (transaction.cashIn || 0),
              due:
                transactionData.total -
                ((transactionData.deposit || 0) + (transaction.cashIn || 0)),
            });
          }
        }

        return newTransactionRef.key;
      } catch (error) {
        console.error("Error adding daily cash transaction:", error);
        throw error;
      }
    },

    deleteDailyCashTransaction: async (transactionId) => {
      try {
        const transactionRef = ref(
          db,
          `${COLLECTION_REFS.DAILY_CASH}/${transactionId}`
        );
        await remove(transactionRef);
      } catch (error) {
        console.error("Error deleting daily cash transaction:", error);
        throw error;
      }
    },

    updateDailyCashTransaction: async (transactionId, updatedData) => {
      try {
        const transactionRef = ref(
          db,
          `${COLLECTION_REFS.DAILY_CASH}/${transactionId}`
        );
        await update(transactionRef, {
          ...updatedData,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error updating daily cash transaction:", error);
        throw error;
      }
    },

    setDailyCashTransactions: (transactions) => {
      dispatch({ type: "SET_DAILY_CASH_TRANSACTIONS", payload: transactions });
    },
  };

  const updateSettings = async (newSettings) => {
    try {
      // Update settings in Firebase
      await updateDoc(doc(db, "settings", "app"), newSettings);

      // Update local state
      dispatch({
        type: "UPDATE_SETTINGS",
        payload: newSettings,
      });

      return true;
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  const contextValue = {
    // State
    ...state,
    // Operations
    ...customerOperations,
    ...transactionOperations,
    ...fabricOperations,
    ...supplierOperations,
    ...dailyCashOperations,
    settings: state.settings,
    updateSettings,
    getExpenseCategories,
    updateExpenseCategories,
  };

  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
}

// Export the hook to use the context
export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
