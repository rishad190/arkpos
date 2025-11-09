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
  onDisconnect,
  goOffline,
  goOnline,
} from "firebase/database";

import { db } from "@/lib/firebase";
import logger from "@/utils/logger";

// Create context
const DataContext = createContext(null);

// Firebase References
const COLLECTION_REFS = {
  CUSTOMERS: "customers",
  TRANSACTIONS: "transactions",
  DAILY_CASH: "dailyCash",

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
  dailyCashTransactions: [],

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
    case "SET_DAILY_CASH_TRANSACTIONS":
      return {
        ...state,
        dailyCashTransactions: action.payload,
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

// Helper functions for validation and performance
const validateFabricData = (fabricData) => {
  const errors = [];
  if (!fabricData.name?.trim()) errors.push("Fabric name is required");
  if (!fabricData.category?.trim()) errors.push("Category is required");
  if (!fabricData.unit?.trim()) errors.push("Unit is required");
  return errors;
};

const validateBatchData = (batchData) => {
  const errors = [];
  if (!batchData.fabricId) errors.push("Fabric ID is required");
  if (
    !batchData.items ||
    !Array.isArray(batchData.items) ||
    batchData.items.length === 0
  ) {
    errors.push("At least one item is required");
  }
  if (batchData.items) {
    batchData.items.forEach((item, index) => {
      if (!item.colorName?.trim())
        errors.push(`Item ${index + 1}: Color name is required`);
      if (!item.quantity || item.quantity <= 0)
        errors.push(`Item ${index + 1}: Valid quantity is required`);
    });
  }
  return errors;
};

const validateTransactionData = (transactionData) => {
  const errors = [];
  if (!transactionData.customerId) errors.push("Customer ID is required");
  if (
    (transactionData.total || 0) <= 0 &&
    (transactionData.deposit || 0) <= 0
  ) {
    errors.push("Either total or deposit must be a positive amount");
  }
  return errors;
};

const trackPerformance = (operationName, startTime, dispatch) => {
  const endTime = Date.now();
  const duration = endTime - startTime;

  const isSlow = duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION;
  const isVerySlow = duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION;

  dispatch({
    type: "UPDATE_PERFORMANCE_METRICS",
    payload: {
      operationCount: state.performanceMetrics.operationCount + 1,
      slowOperations:
        state.performanceMetrics.slowOperations + (isSlow ? 1 : 0),
      averageResponseTime:
        (state.performanceMetrics.averageResponseTime *
          state.performanceMetrics.operationCount +
          duration) /
        (state.performanceMetrics.operationCount + 1),
      lastOperationTime: new Date().toISOString(),
    },
  });

  if (isVerySlow) {
    logger.warn(
      `[Performance] Very slow operation: ${operationName} took ${duration}ms`
    );
  } else if (isSlow) {
    logger.info(
      `[Performance] Slow operation: ${operationName} took ${duration}ms`
    );
  }

  return duration;
};

// Export the provider component
export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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

  // Atomic transaction helper
  const executeAtomicOperation = useCallback(
    async (operationName, operationFn, fallbackFn = null) => {
      const operationId = `${operationName}_${Date.now()}`;
      const startTime = Date.now();

      dispatch({ type: "ADD_PENDING_OPERATION", payload: operationId });

      try {
        // Check connection state
        if (state.connectionState === CONNECTION_STATES.DISCONNECTED) {
          // Queue for offline processing
          dispatch({
            type: "ADD_TO_OFFLINE_QUEUE",
            payload: {
              id: operationId,
              name: operationName,
              fn: operationFn,
              timestamp: new Date().toISOString(),
            },
          });
          throw new Error("Operation queued for offline processing");
        }

        const result = await operationFn();

        // Track performance
        const duration = Date.now() - startTime;
        const isSlow = duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION;
        const isVerySlow =
          duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION;

        dispatch({
          type: "UPDATE_PERFORMANCE_METRICS",
          payload: {
            operationCount: state.performanceMetrics.operationCount + 1,
            slowOperations:
              state.performanceMetrics.slowOperations + (isSlow ? 1 : 0),
            averageResponseTime:
              (state.performanceMetrics.averageResponseTime *
                state.performanceMetrics.operationCount +
                duration) /
              (state.performanceMetrics.operationCount + 1),
            lastOperationTime: new Date().toISOString(),
          },
        });

        if (isVerySlow) {
          logger.warn(
            `[Performance] Very slow operation: ${operationName} took ${duration}ms`
          );
        } else if (isSlow) {
          logger.info(
            `[Performance] Slow operation: ${operationName} took ${duration}ms`
          );
        }

        return result;
      } catch (error) {
        logger.error(
          `[DataContext] Atomic operation failed: ${operationName}`,
          error
        );

        // Execute fallback if provided
        if (fallbackFn && typeof fallbackFn === "function") {
          try {
            await fallbackFn();
          } catch (fallbackError) {
            logger.error(
              `[DataContext] Fallback operation failed: ${operationName}`,
              fallbackError
            );
          }
        }

        throw error;
      } finally {
        dispatch({ type: "REMOVE_PENDING_OPERATION", payload: operationId });
      }
    },
    [state.connectionState, state.performanceMetrics, dispatch]
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
        path: COLLECTION_REFS.DAILY_CASH,
        setter: (data) => {
          // Convert daily cash transactions object to array format for components
          if (data && typeof data === "object") {
            const dailyCashArray = Object.entries(data)
              .map(([id, transactionData]) => ({
                id,
                ...transactionData,
              }))
              .filter(Boolean);
            dispatch({
              type: "SET_DAILY_CASH_TRANSACTIONS",
              payload: dailyCashArray,
            });
          } else {
            dispatch({ type: "SET_DAILY_CASH_TRANSACTIONS", payload: [] });
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
    ];

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

  // Batch-level locking for inventory management
  const acquireBatchLock = useCallback(async (batchId) => {
    const lockRef = ref(db, `locks/batches/${batchId}`);
    try {
      await set(lockRef, {
        lockedAt: serverTimestamp(),
        sessionId: Math.random().toString(36).substr(2, 9),
      });
      return true;
    } catch (error) {
      logger.warn(
        `[DataContext] Could not acquire lock for batch ${batchId}:`,
        error
      );
      return false;
    }
  }, []);

  const releaseBatchLock = useCallback(async (batchId) => {
    const lockRef = ref(db, `locks/batches/${batchId}`);
    try {
      await remove(lockRef);
    } catch (error) {
      logger.warn(
        `[DataContext] Could not release lock for batch ${batchId}:`,
        error
      );
    }
  }, []);

  // Customer Operations with atomic execution and validation
  const customerOperations = useMemo(
    () => ({
      addCustomer: async (customerData) => {
        // Validate customer data
        const validationErrors = [];
        if (!customerData.name?.trim())
          validationErrors.push("Customer name is required");
        if (!customerData.phone?.trim())
          validationErrors.push("Phone number is required");

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return executeAtomicOperation("addCustomer", async () => {
          const customersRef = ref(db, COLLECTION_REFS.CUSTOMERS);
          const newCustomerRef = push(customersRef);
          await set(newCustomerRef, {
            ...customerData,
            createdAt: new Date().toISOString(),
          });
          return newCustomerRef.key;
        });
      },

      updateCustomer: async (customerId, updatedData) => {
        // Validate customer data
        const validationErrors = [];
        if (!updatedData.name?.trim())
          validationErrors.push("Customer name is required");
        if (!updatedData.phone?.trim())
          validationErrors.push("Phone number is required");

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return executeAtomicOperation("updateCustomer", async () => {
          const customerRef = ref(
            db,
            `${COLLECTION_REFS.CUSTOMERS}/${customerId}`
          );
          await update(customerRef, {
            ...updatedData,
            updatedAt: serverTimestamp(),
          });
        });
      },

      deleteCustomer: async (customerId) => {
        return executeAtomicOperation("deleteCustomer", async () => {
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
        });
      },

      getCustomerDue,
    }),
    [state.transactions, getCustomerDue]
  );

  // Transaction Operations with atomic execution and validation
  const transactionOperations = useMemo(
    () => ({
      addTransaction: async (transactionData) => {
        // Validate transaction data
        const validationErrors = validateTransactionData(transactionData);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return executeAtomicOperation("addTransaction", async () => {
          const transactionsRef = ref(db, COLLECTION_REFS.TRANSACTIONS);
          const newTransactionRef = push(transactionsRef);

          const newTransaction = {
            ...transactionData,
            createdAt: new Date().toISOString(),
          };

          await set(newTransactionRef, newTransaction);

          return newTransactionRef.key;
        });
      },

      updateTransaction: async (transactionId, updatedData) => {
        // Validate transaction data
        const validationErrors = validateTransactionData(updatedData);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return executeAtomicOperation("updateTransaction", async () => {
          const transactionRef = ref(
            db,
            `${COLLECTION_REFS.TRANSACTIONS}/${transactionId}`
          );
          await update(transactionRef, {
            ...updatedData,
            updatedAt: serverTimestamp(),
          });
        });
      },

      deleteTransaction: async (transactionId) => {
        return executeAtomicOperation("deleteTransaction", async () => {
          await remove(
            ref(db, `${COLLECTION_REFS.TRANSACTIONS}/${transactionId}`)
          );
        });
      },
    }),
    [state.transactions, getCustomerDue]
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

        return executeAtomicOperation("addSupplier", async () => {
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

        return executeAtomicOperation("updateSupplier", async () => {
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
        return executeAtomicOperation("deleteSupplier", async () => {
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

        return executeAtomicOperation("addSupplierTransaction", async () => {
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
        return executeAtomicOperation("deleteSupplierTransaction", async () => {
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
            const newTotalDue = Math.max(
              0,
              (supplier.totalDue || 0) - dueAmount
            );

            await update(supplierRef, {
              totalDue: newTotalDue,
              updatedAt: serverTimestamp(),
            });
          }
        });
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

        return executeAtomicOperation("addDailyCashTransaction", async () => {
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
        });
      },

      deleteDailyCashTransaction: async (transactionId) => {
        return executeAtomicOperation(
          "deleteDailyCashTransaction",
          async () => {
            const transactionRef = ref(
              db,
              `${COLLECTION_REFS.DAILY_CASH}/${transactionId}`
            );
            await remove(transactionRef);
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

        return executeAtomicOperation(
          "updateDailyCashTransaction",
          async () => {
            const transactionRef = ref(
              db,
              `${COLLECTION_REFS.DAILY_CASH}/${transactionId}`
            );
            await update(transactionRef, {
              ...updatedData,
              updatedAt: serverTimestamp(),
            });
          }
        );
      },
    }),
    []
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

    return executeAtomicOperation("updateSettings", async () => {
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

  // Fabric Operations with atomic execution, validation, and batch-level locking
  // Updated for flattened structure where batches are nested within fabrics
  const fabricOperations = useMemo(
    () => ({
      addFabric: async (fabricData) => {
        // Validate fabric data
        const validationErrors = validateFabricData(fabricData);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return executeAtomicOperation("addFabric", async () => {
          const fabricsRef = ref(db, COLLECTION_REFS.FABRICS);
          const newFabricRef = push(fabricsRef);
          const fabricId = newFabricRef.key;

          // Create fabric with empty batches object
          await set(newFabricRef, {
            ...fabricData,
            batches: {},
            createdAt: new Date().toISOString(),
          });
          return fabricId;
        });
      },

      updateFabric: async (fabricId, updatedData) => {
        // Validate fabric data
        const validationErrors = validateFabricData(updatedData);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return executeAtomicOperation("updateFabric", async () => {
          const fabricRef = ref(db, `${COLLECTION_REFS.FABRICS}/${fabricId}`);
          await update(fabricRef, {
            ...updatedData,
            updatedAt: new Date().toISOString(),
          });
        });
      },

      deleteFabric: async (fabricId) => {
        return executeAtomicOperation("deleteFabric", async () => {
          // With flattened structure, batches are automatically deleted when fabric is deleted
          await remove(ref(db, `${COLLECTION_REFS.FABRICS}/${fabricId}`));
        });
      },

      addFabricBatch: async (batchData) => {
        // Validate batch data
        const validationErrors = validateBatchData(batchData);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        const { fabricId, ...batchDetails } = batchData;

        return executeAtomicOperation("addFabricBatch", async () => {
          const fabricRef = ref(db, `${COLLECTION_REFS.FABRICS}/${fabricId}`);
          const fabricSnapshot = await get(fabricRef);

          if (!fabricSnapshot.exists()) {
            throw new Error(`Fabric with ID ${fabricId} not found`);
          }

          const fabricData = fabricSnapshot.val();
          const batchId = `batch_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          // Add batch to fabric's batches object
          const updatedBatches = {
            ...(fabricData.batches || {}),
            [batchId]: {
              ...batchDetails,
              createdAt: new Date().toISOString(),
            },
          };

          await update(fabricRef, {
            batches: updatedBatches,
            updatedAt: new Date().toISOString(),
          });

          return batchId;
        });
      },

      updateFabricBatch: async (fabricId, batchId, updatedData) => {
        // Validate batch data
        const validationErrors = validateBatchData(updatedData);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
        }

        return executeAtomicOperation("updateFabricBatch", async () => {
          const fabricRef = ref(db, `${COLLECTION_REFS.FABRICS}/${fabricId}`);
          const fabricSnapshot = await get(fabricRef);

          if (!fabricSnapshot.exists()) {
            throw new Error(`Fabric with ID ${fabricId} not found`);
          }

          const fabricData = fabricSnapshot.val();
          if (!fabricData.batches || !fabricData.batches[batchId]) {
            throw new Error(
              `Batch with ID ${batchId} not found in fabric ${fabricId}`
            );
          }

          // Update the specific batch
          const updatedBatches = {
            ...fabricData.batches,
            [batchId]: {
              ...fabricData.batches[batchId],
              ...updatedData,
              updatedAt: new Date().toISOString(),
            },
          };

          await update(fabricRef, {
            batches: updatedBatches,
            updatedAt: new Date().toISOString(),
          });
        });
      },

      reduceInventory: async (saleProducts) => {
        return executeAtomicOperation("reduceInventory", async () => {
          logger.info(
            "[DataContext] Reducing inventory for products:",
            saleProducts
          );

          // Validate input products
          if (!Array.isArray(saleProducts) || saleProducts.length === 0) {
            throw new Error("No products provided for inventory reduction");
          }

          const updatePromises = [];
          const lockedBatches = new Set();

          try {
            for (const product of saleProducts) {
              logger.info(
                `[DataContext] Processing product: ${product.name}, quantity: ${product.quantity}, color: ${product.color}`
              );

              // Validate product data
              if (!product.fabricId) {
                throw new Error(
                  `Product "${product.name}" has no fabric ID. Please select a valid product.`
                );
              }

              if (!product.quantity || product.quantity <= 0) {
                throw new Error(
                  `Invalid quantity for product "${product.name}"`
                );
              }

              const fabricRef = ref(
                db,
                `${COLLECTION_REFS.FABRICS}/${product.fabricId}`
              );
              const fabricSnapshot = await get(fabricRef);

              if (!fabricSnapshot.exists()) {
                throw new Error(
                  `Fabric "${product.name}" (ID: ${product.fabricId}) not found in database`
                );
              }

              const fabricData = fabricSnapshot.val();
              if (
                !fabricData.batches ||
                Object.keys(fabricData.batches).length === 0
              ) {
                throw new Error(
                  `No batches found for fabric "${product.name}". Please purchase stock for this fabric first.`
                );
              }

              let remainingQuantity = product.quantity;

              // Sort batches by purchase date (FIFO)
              const sortedBatches = Object.entries(fabricData.batches)
                .map(([batchId, batch]) => ({ batchId, ...batch }))
                .sort(
                  (a, b) =>
                    new Date(a.purchaseDate || a.createdAt) -
                    new Date(b.purchaseDate || b.createdAt)
                );

              for (const batch of sortedBatches) {
                if (remainingQuantity <= 0) break;

                // Acquire lock for this batch
                const lockAcquired = await acquireBatchLock(batch.batchId);
                if (!lockAcquired) {
                  throw new Error(
                    `Could not acquire lock for batch ${batch.batchId}. Please try again.`
                  );
                }
                lockedBatches.add(batch.batchId);

                if (!batch.items || !Array.isArray(batch.items)) {
                  logger.warn(
                    `[DataContext] Batch ${batch.batchId} has no items array`
                  );
                  continue;
                }

                // Find items that match the color (if specified) or any item if no color
                const eligibleItems = batch.items.filter((item) => {
                  if (product.color) {
                    return (
                      item.colorName === product.color &&
                      (item.quantity || 0) > 0
                    );
                  }
                  return (item.quantity || 0) > 0;
                });

                for (const item of eligibleItems) {
                  if (remainingQuantity <= 0) break;

                  const availableQuantity = item.quantity || 0;
                  const quantityToReduce = Math.min(
                    availableQuantity,
                    remainingQuantity
                  );

                  if (quantityToReduce > 0) {
                    // Update the item quantity
                    item.quantity = availableQuantity - quantityToReduce;
                    remainingQuantity -= quantityToReduce;

                    logger.info(
                      `[DataContext] Reduced ${quantityToReduce} from batch ${
                        batch.batchId
                      }, item: ${item.colorName || "no color"}`
                    );
                  }
                }

                // If we modified any items in this batch, add to update promises
                if (remainingQuantity < product.quantity) {
                  updatePromises.push(
                    fabricOperations.updateFabricBatch(
                      product.fabricId,
                      batch.batchId,
                      {
                        fabricId: product.fabricId, // Add this line
                        items: batch.items,
                      }
                    )
                  );
                }
              }

              if (remainingQuantity > 0) {
                logger.warn(
                  `[DataContext] Could not reduce full quantity for ${product.name}. Remaining: ${remainingQuantity}`
                );
                throw new Error(
                  `Insufficient stock for ${product.name}. Only ${
                    product.quantity - remainingQuantity
                  } units available.`
                );
              }
            }

            // Wait for all batch updates to complete
            await Promise.all(updatePromises);
            logger.info(
              "[DataContext] Inventory reduction completed successfully"
            );
          } finally {
            // Release all acquired locks
            for (const batchId of lockedBatches) {
              await releaseBatchLock(batchId);
            }
          }
        });
      },
    }),
    []
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
