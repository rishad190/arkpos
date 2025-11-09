"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useReducer,
  useRef,
} from "react";
import {
  ref,
  onValue,
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
import { CustomerService } from "@/services/customerService";
import { TransactionService } from "@/services/transactionService";
import { FabricService } from "@/services/fabricService";
import { AtomicOperationService } from "@/services/atomicOperations";

// Create context
const DataContext = createContext(null);

// Firebase References
const COLLECTION_REFS = {
  CUSTOMERS: "customers",
  TRANSACTIONS: "transactions",
  DAILY_CASH_INCOME: "dailyCashIncome",
  DAILY_CASH_EXPENSE: "dailyCashExpense",

  SUPPLIERS: "suppliers",
  SUPPLIER_TRANSACTIONS: "supplierTransactions",

  FABRICS: "fabrics",
  FABRIC_BATCHES: "fabricBatches",
  SETTINGS: "settings",
  PERFORMANCE_METRICS: "performanceMetrics",
};

// Connection state constants
const CONNECTION_STATES = {
  CONNECTED: "connected",
  CONNECTING: "connecting",
  DISCONNECTED: "disconnected",
  OFFLINE: "offline",
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION: 2000, // 2 seconds
  VERY_SLOW_OPERATION: 5000, // 5 seconds
  DEBOUNCE_DELAY: 300, // 300ms
};

// Error types for better error handling
const ERROR_TYPES = {
  NETWORK: "network_error",
  VALIDATION: "validation_error",
  PERMISSION: "permission_error",
  NOT_FOUND: "not_found_error",
  CONFLICT: "conflict_error",
};

// Add settings to the initial state
const initialState = {
  customers: [],
  transactions: [],
  dailyCashIncome: [],
  dailyCashExpense: [],

  suppliers: [],
  supplierTransactions: [],
  fabrics: [],
  // Remove fabricBatches from initial state as batches are now nested in fabrics
  loading: true,
  error: null,
  connectionState: CONNECTION_STATES.CONNECTING,
  offlineQueue: [],
  pendingOperations: new Set(),
  performanceMetrics: {
    operationCount: 0,
    slowOperations: 0,
    averageResponseTime: 0,
    lastOperationTime: null,
  },
  settings: {
    store: {
      storeName: "",
      address: "",
      phone: "",
      email: "",
      currency: "৳",
      logo: "/download.png",
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
  },
};

// Add settings reducer cases
function reducer(state, action) {
  switch (action.type) {
    case "SET_CUSTOMERS":
      return {
        ...state,
        customers: action.payload,
        loading: false,
      };
    case "SET_TRANSACTIONS":
      return {
        ...state,
        transactions: action.payload,
        loading: false,
      };
    case "SET_DAILY_CASH_INCOME":
      return {
        ...state,
        dailyCashIncome: action.payload,
        loading: false,
      };
    case "SET_DAILY_CASH_EXPENSE":
      return {
        ...state,
        dailyCashExpense: action.payload,
        loading: false,
      };

    case "SET_SUPPLIERS":
      return {
        ...state,
        suppliers: action.payload,
        loading: false,
      };
    case "SET_SUPPLIER_TRANSACTIONS":
      return {
        ...state,
        supplierTransactions: action.payload,
        loading: false,
      };
    case "SET_FABRICS":
      return {
        ...state,
        fabrics: action.payload,
        loading: false,
      };
    // Remove SET_FABRIC_BATCHES case as batches are now nested in fabrics
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    case "SET_CONNECTION_STATE":
      return {
        ...state,
        connectionState: action.payload,
      };
    case "ADD_TO_OFFLINE_QUEUE":
      return {
        ...state,
        offlineQueue: [...state.offlineQueue, action.payload],
      };
    case "REMOVE_FROM_OFFLINE_QUEUE":
      return {
        ...state,
        offlineQueue: state.offlineQueue.filter(
          (_, index) => index !== action.payload
        ),
      };
    case "CLEAR_OFFLINE_QUEUE":
      return {
        ...state,
        offlineQueue: [],
      };
    case "ADD_PENDING_OPERATION":
      return {
        ...state,
        pendingOperations: new Set([
          ...state.pendingOperations,
          action.payload,
        ]),
      };
    case "REMOVE_PENDING_OPERATION":
      const newPendingOps = new Set(state.pendingOperations);
      newPendingOps.delete(action.payload);
      return {
        ...state,
        pendingOperations: newPendingOps,
      };
    case "UPDATE_PERFORMANCE_METRICS":
      return {
        ...state,
        performanceMetrics: {
          ...state.performanceMetrics,
          ...action.payload,
        },
      };
    default:
      return state;
  }
}

// Export the provider component
export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    console.warn("[PERF DEBUG] DataContext mounted - monitoring performance");
    console.warn(
      "[PERF DEBUG] Initial state size:",
      JSON.stringify(initialState).length,
      "bytes"
    );
  }, []);

  // Connection state monitoring
  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    const connectionUnsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val();
      dispatch({
        type: "SET_CONNECTION_STATE",
        payload: connected
          ? CONNECTION_STATES.CONNECTED
          : CONNECTION_STATES.DISCONNECTED,
      });

      if (connected) {
        logger.info("[DataContext] Firebase connection established");
      } else {
        logger.warn("[DataContext] Firebase connection lost");
      }
    });

    return () => connectionUnsubscribe();
  }, [dispatch]);

  // Process offline queue when connection is restored
  const processOfflineQueue = useCallback(async () => {
    if (state.offlineQueue.length === 0) return;

    logger.info(
      `[DataContext] Processing ${state.offlineQueue.length} offline operations`
    );

    const successfulOperations = [];
    const failedOperations = [];

    for (let i = 0; i < state.offlineQueue.length; i++) {
      const operation = state.offlineQueue[i];
      try {
        await operation.fn();
        successfulOperations.push(i);
        logger.info(
          `[DataContext] Offline operation ${i} completed successfully`
        );
      } catch (error) {
        failedOperations.push({ index: i, error });
        logger.error(`[DataContext] Offline operation ${i} failed:`, error);
      }
    }

    // Remove successful operations from queue
    successfulOperations.forEach((index) => {
      dispatch({ type: "REMOVE_FROM_OFFLINE_QUEUE", payload: index });
    });

    if (failedOperations.length > 0) {
      logger.warn(
        `[DataContext] ${failedOperations.length} offline operations failed`
      );
    }
  }, [state.offlineQueue]);

  // Initialize service instances
  const atomicOperations = useMemo(
    () => new AtomicOperationService(dispatch, () => state),
    [dispatch, state]
  );
  const customerService = useMemo(
    () => new CustomerService(db, logger, atomicOperations),
    [db, logger, atomicOperations]
  );
  const transactionService = useMemo(
    () => new TransactionService(db, logger, atomicOperations),
    [db, logger, atomicOperations]
  );
  const fabricService = useMemo(
    () => new FabricService(db, logger, atomicOperations),
    [db, logger, atomicOperations]
  );

  // Debounced Firebase Subscriptions
  useEffect(() => {
    const unsubscribers = [];
    const debounceTimers = {};

    const collections = [
      {
        path: COLLECTION_REFS.CUSTOMERS,
        setter: (data) => {
          // Convert customers object to array format for components
          if (data && typeof data === "object") {
            const customersArray = Object.entries(data)
              .map(([id, customerData]) => ({
                id,
                ...customerData,
              }))
              .filter(Boolean); // Remove null entries
            dispatch({ type: "SET_CUSTOMERS", payload: customersArray });
          } else {
            dispatch({ type: "SET_CUSTOMERS", payload: [] });
          }
        },
      },
      {
        path: COLLECTION_REFS.TRANSACTIONS,
        setter: (data) => {
          // Convert transactions object to array format for components
          if (data && typeof data === "object") {
            const transactionsArray = Object.entries(data)
              .map(([id, transactionData]) => ({
                id,
                ...transactionData,
              }))
              .filter(Boolean);
            dispatch({ type: "SET_TRANSACTIONS", payload: transactionsArray });
          } else {
            dispatch({ type: "SET_TRANSACTIONS", payload: [] });
          }
        },
      },

      {
        path: COLLECTION_REFS.SUPPLIERS,
        setter: (data) => {
          // Convert suppliers object to array format for components
          if (data && typeof data === "object") {
            const suppliersArray = Object.entries(data)
              .map(([id, supplierData]) => ({
                id,
                ...supplierData,
              }))
              .filter(Boolean);
            dispatch({ type: "SET_SUPPLIERS", payload: suppliersArray });
          } else {
            dispatch({ type: "SET_SUPPLIers", payload: [] });
          }
        },
      },
      {
        path: COLLECTION_REFS.FABRICS,
        setter: (data) => {
          // Convert flattened fabric structure to array format for components
          if (data && typeof data === "object") {
            const fabricsArray = Object.entries(data)
              .map(([id, fabricData]) => {
                // Remove any existing id field from fabricData to avoid conflicts
                const { id: existingId, ...cleanFabricData } = fabricData;

                // Only include fabrics that have a valid Firebase ID
                if (!id || id === "" || id === "0") {
                  logger.warn(
                    `[DataContext] Skipping fabric with invalid ID:`,
                    { id, fabricData }
                  );
                  return null;
                }

                return {
                  id,
                  ...cleanFabricData,
                  // Ensure batches is an array for compatibility
                  batches: cleanFabricData.batches
                    ? Object.entries(cleanFabricData.batches).map(
                        ([batchId, batch]) => ({
                          id: batchId,
                          ...batch,
                        })
                      )
                    : [],
                };
              })
              .filter(Boolean); // Remove null entries

            dispatch({ type: "SET_FABRICS", payload: fabricsArray });
          } else {
            logger.info("[DataContext] No fabric data found");
            dispatch({ type: "SET_FABRICS", payload: [] });
          }
        },
      },
      // Remove separate fabricBatches listener as batches are now nested in fabrics
      {
        path: COLLECTION_REFS.DAILY_CASH_INCOME,
        setter: (data) => {
          if (data && typeof data === "object") {
            const incomeArray = Object.entries(data)
              .map(([id, transactionData]) => ({
                id,
                ...transactionData,
              }))
              .filter(Boolean);
            dispatch({ type: "SET_DAILY_CASH_INCOME", payload: incomeArray });
          } else {
            dispatch({ type: "SET_DAILY_CASH_INCOME", payload: [] });
          }
        },
      },
      {
        path: COLLECTION_REFS.DAILY_CASH_EXPENSE,
        setter: (data) => {
          if (data && typeof data === "object") {
            const expenseArray = Object.entries(data)
              .map(([id, transactionData]) => ({
                id,
                ...transactionData,
              }))
              .filter(Boolean);
            dispatch({ type: "SET_DAILY_CASH_EXPENSE", payload: expenseArray });
          } else {
            dispatch({ type: "SET_DAILY_CASH_EXPENSE", payload: [] });
          }
        },
      }
    ]; // Closing the collections array

    try {
      collections.forEach(({ path, setter }) => {
        const collectionRef = ref(db, path);
        const unsubscribe = onValue(collectionRef, (snapshot) => {
          // Debounce rapid updates to improve performance
          if (debounceTimers[path]) {
            clearTimeout(debounceTimers[path]);
          }

          debounceTimers[path] = setTimeout(() => {
            if (snapshot.exists()) {
              const rawData = snapshot.val();
              // Removed raw data logging for cleaner console
              setter(rawData);
            } else {
              logger.info(`[DataContext] No data found for ${path}`);
              setter([]);
            }
          }, PERFORMANCE_THRESHOLDS.DEBOUNCE_DELAY);
        });
        unsubscribers.push(unsubscribe);
      });
    } catch (err) {
      logger.error("Error setting up Firebase listeners:", err);
      dispatch({ type: "SET_ERROR", payload: err.message });
    }

    const supplierTransactionsRef = ref(
      db,
      COLLECTION_REFS.SUPPLIER_TRANSACTIONS
    );
    const unsubscribe = onValue(supplierTransactionsRef, (snapshot) => {
      if (debounceTimers[COLLECTION_REFS.SUPPLIER_TRANSACTIONS]) {
        clearTimeout(debounceTimers[COLLECTION_REFS.SUPPLIER_TRANSACTIONS]);
      }

      debounceTimers[COLLECTION_REFS.SUPPLIER_TRANSACTIONS] = setTimeout(() => {
        if (snapshot.exists()) {
          const data = Object.entries(snapshot.val()).map(([id, value]) => ({
            id,
            ...value,
          }));
          dispatch({ type: "SET_SUPPLIER_TRANSACTIONS", payload: data });
        } else {
          dispatch({ type: "SET_SUPPLIER_TRANSACTIONS", payload: [] });
        }
      }, PERFORMANCE_THRESHOLDS.DEBOUNCE_DELAY);
    });
    unsubscribers.push(unsubscribe);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      Object.values(debounceTimers).forEach((timer) => clearTimeout(timer));
    };
  }, [dispatch]);

  // Add memoization for customer dues
  const customerDues = useMemo(() => {
    const dues = {};

    // Handle both array and object formats for customers
    const customersArray = Array.isArray(state.customers)
      ? state.customers
      : state.customers && typeof state.customers === "object"
      ? Object.values(state.customers)
      : [];

    customersArray?.forEach((customer) => {
      if (customer && customer.id) {
        dues[customer.id] = state.transactions
          ?.filter((t) => t.customerId === customer.id)
          .reduce((total, t) => total + ((t.total || 0) - (t.deposit || 0)), 0);
      }
    });
    return dues;
  }, [state.customers, state.transactions]);

  const getCustomerDue = useCallback(
    (customerId) => {
      return customerDues[customerId] || 0;
    },
    [customerDues]
  );

  // Customer Operations using service
  const customerOperations = useMemo(
    () => ({
      addCustomer: customerService.addCustomer.bind(customerService),
      updateCustomer: customerService.updateCustomer.bind(customerService),
      deleteCustomer: customerService.deleteCustomer.bind(customerService),
      getCustomerDue,
    }),
    [customerService, getCustomerDue]
  );

  // Transaction Operations using service
  const transactionOperations = useMemo(
    () => ({
      addTransaction:
        transactionService.addTransaction.bind(transactionService),
      updateTransaction:
        transactionService.updateTransaction.bind(transactionService),
      deleteTransaction:
        transactionService.deleteTransaction.bind(transactionService),
    }),
    [transactionService]
  );

  // Supplier Operations with atomic execution and validation
  const supplierOperations = useMemo(
    () => ({
      addSupplier: async (supplierData) => {
        // Validate supplier data
        const validationErrors = [];
        if (!supplierData.name?.trim())
          validationErrors.push("Supplier name is required");
        if (!supplierData.phone?.trim())
          validationErrors.push("Phone number is required");

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return atomicOperations.execute("addSupplier", async () => {
          const suppliersRef = ref(db, COLLECTION_REFS.SUPPLIERS);
          const newSupplierRef = push(suppliersRef);
          await set(newSupplierRef, {
            ...supplierData,
            totalDue: 0,
            createdAt: serverTimestamp(),
          });
          return newSupplierRef.key;
        });
      },

      updateSupplier: async (supplierId, updatedData) => {
        // Validate supplier data
        const validationErrors = [];
        if (!updatedData.name?.trim())
          validationErrors.push("Supplier name is required");
        if (!updatedData.phone?.trim())
          validationErrors.push("Phone number is required");

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return atomicOperations.execute("updateSupplier", async () => {
          const supplierRef = ref(
            db,
            `${COLLECTION_REFS.SUPPLIERS}/${supplierId}`
          );
          await update(supplierRef, {
            ...updatedData,
            updatedAt: serverTimestamp(),
          });
        });
      },

      deleteSupplier: async (supplierId) => {
        return atomicOperations.execute("deleteSupplier", async () => {
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
        });
      },

      addSupplierTransaction: async (transaction) => {
        // Validate supplier transaction data
        const validationErrors = [];
        if (!transaction.supplierId)
          validationErrors.push("Supplier ID is required");
        if (!transaction.totalAmount || transaction.totalAmount <= 0)
          validationErrors.push("Valid total amount is required");

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return atomicOperations.execute("addSupplierTransaction", async () => {
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

          // Update supplier's total due
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
        });
      },

      deleteSupplierTransaction: async (
        transactionId,
        supplierId,
        amount,
        paidAmount
      ) => {
        return atomicOperations.execute(
          "deleteSupplierTransaction",
          async () => {
            // Delete transaction
            await remove(
              ref(
                db,
                `${COLLECTION_REFS.SUPPLIER_TRANSACTIONS}/${transactionId}`
              )
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
      },
    }),
    [state.transactions]
  );

  // Daily Cash Operations with atomic execution and validation
  const dailyCashOperations = useMemo(
    () => ({
      addDailyCashTransaction: async (transaction) => {
        // Validate daily cash transaction data
        const validationErrors = [];
        if (!transaction.date) validationErrors.push("Date is required");
        if (!transaction.description?.trim())
          validationErrors.push("Description is required");
        if ((transaction.cashIn || 0) < 0 || (transaction.cashOut || 0) < 0) {
          validationErrors.push("Cash amounts cannot be negative");
        }

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return atomicOperations.execute("addDailyCashTransaction", async () => {
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
        });
      },

      deleteDailyCashTransaction: async (transactionId, reference) => {
        return atomicOperations.execute(
          "deleteDailyCashTransaction",
          async () => {
            let dailyCashData = null;
            let collectionPath = null;

            // Try to fetch from income collection
            const incomeSnapshot = await get(
              ref(db, `${COLLECTION_REFS.DAILY_CASH_INCOME}/${transactionId}`)
            );
            if (incomeSnapshot.exists()) {
              dailyCashData = incomeSnapshot.val();
              collectionPath = COLLECTION_REFS.DAILY_CASH_INCOME;
            } else {
              // If not found in income, try expense collection
              const expenseSnapshot = await get(
                ref(db, `${COLLECTION_REFS.DAILY_CASH_EXPENSE}/${transactionId}`)
              );
              if (expenseSnapshot.exists()) {
                dailyCashData = expenseSnapshot.val();
                collectionPath = COLLECTION_REFS.DAILY_CASH_EXPENSE;
              }
            }

            if (!dailyCashData || !collectionPath) {
              throw new Error("Transaction not found in any daily cash collection.");
            }

            // If it's a sale, update the related customer transaction
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
                  deposit:
                    (transactionData.deposit || 0) - (dailyCashData.cashIn || 0),
                });
              }
            }

            // Finally, remove the daily cash transaction from its determined collection
            await remove(ref(db, `${collectionPath}/${transactionId}`));
          }
        );
      },

      updateDailyCashTransaction: async (transactionId, updatedData) => {
        // Validate daily cash transaction data
        const validationErrors = [];
        if (!updatedData.date) validationErrors.push("Date is required");
        if (!updatedData.description?.trim())
          validationErrors.push("Description is required");
        if ((updatedData.cashIn || 0) < 0 || (updatedData.cashOut || 0) < 0) {
          validationErrors.push("Cash amounts cannot be negative");
        }

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return atomicOperations.execute(
          "updateDailyCashTransaction",
          async () => {
            let originalData = null;
            let originalCollectionPath = null;

            // Try to fetch from income collection
            const incomeSnapshot = await get(
              ref(db, `${COLLECTION_REFS.DAILY_CASH_INCOME}/${transactionId}`)
            );
            if (incomeSnapshot.exists()) {
              originalData = incomeSnapshot.val();
              originalCollectionPath = COLLECTION_REFS.DAILY_CASH_INCOME;
            } else {
              // If not found in income, try expense collection
              const expenseSnapshot = await get(
                ref(db, `${COLLECTION_REFS.DAILY_CASH_EXPENSE}/${transactionId}`)
              );
              if (expenseSnapshot.exists()) {
                originalData = expenseSnapshot.val();
                originalCollectionPath = COLLECTION_REFS.DAILY_CASH_EXPENSE;
              }
            }

            if (!originalData || !originalCollectionPath) {
              throw new Error("Original transaction not found in any daily cash collection.");
            }

            const updatedCollectionPath =
              updatedData.cashIn > 0
                ? COLLECTION_REFS.DAILY_CASH_INCOME
                : COLLECTION_REFS.DAILY_CASH_EXPENSE;

            // If the collection path changes, move the transaction
            if (originalCollectionPath !== updatedCollectionPath) {
              // Delete from old collection
              await remove(ref(db, `${originalCollectionPath}/${transactionId}`));

              // Add to new collection
              await set(ref(db, `${updatedCollectionPath}/${transactionId}`), {
                ...updatedData,
                updatedAt: serverTimestamp(),
              });
            } else {
              // Update in the current collection
              await update(ref(db, `${originalCollectionPath}/${transactionId}`), {
                ...updatedData,
                updatedAt: serverTimestamp(),
              });
            }

            // If it's a sale, update the related customer transaction
            if (
              originalData &&
              originalData.type === "sale" &&
              originalData.reference
            ) {
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
          }
        );
      },
    }),
    // Add state as a dependency to ensure atomicOperations has the latest state
    [state]
  );

  // Settings Operations with atomic execution and validation
  const updateSettings = useCallback(async (newSettings) => {
    // Validate settings data
    const validationErrors = [];
    if (!newSettings.store?.storeName?.trim())
      validationErrors.push("Store name is required");
    if (!newSettings.store?.address?.trim())
      validationErrors.push("Store address is required");
    if (!newSettings.store?.phone?.trim())
      validationErrors.push("Store phone is required");

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    return atomicOperations.execute("updateSettings", async () => {
      // Update settings in Firebase
      await update(ref(db, "settings"), newSettings);

      // Update local state
      dispatch({
        type: "UPDATE_SETTINGS",
        payload: newSettings,
      });

      return true;
    });
  }, []);

  // Placeholder for batch locking mechanisms
  const acquireBatchLock = useCallback(async (batchId) => {
    // In a real application, this would involve a distributed lock
    // For now, we'll just log and return true
    logger.info(`[Lock] Acquiring lock for batch: ${batchId}`);
    return true;
  }, []);

  const releaseBatchLock = useCallback(async (batchId) => {
    // In a real application, this would release the distributed lock
    logger.info(`[Lock] Releasing lock for batch: ${batchId}`);
  }, []);

  // Fabric Operations using service
  const fabricOperations = useMemo(
    () => ({
      addFabric: fabricService.addFabric.bind(fabricService),
      updateFabric: fabricService.updateFabric.bind(fabricService),
      deleteFabric: fabricService.deleteFabric.bind(fabricService),
      addFabricBatch: fabricService.addFabricBatch.bind(fabricService),
      updateFabricBatch: fabricService.updateFabricBatch.bind(fabricService),
      reduceInventory: (saleProducts) =>
        fabricService.reduceInventory(
          saleProducts,
          acquireBatchLock,
          releaseBatchLock
        ),
    }),
    [fabricService, acquireBatchLock, releaseBatchLock]
  );

  const contextValue = useMemo(
    () => ({
      // State
      ...state,
      ...customerOperations,
      ...transactionOperations,
      ...supplierOperations,
      ...dailyCashOperations,
      ...fabricOperations,
      settings: state.settings,
      updateSettings,
    }),
    [
      state,
      customerOperations,
      transactionOperations,
      supplierOperations,
      dailyCashOperations,
      fabricOperations,
      updateSettings,
    ]
  );

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
