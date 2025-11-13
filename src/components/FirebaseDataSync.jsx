"use client";

import { useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";

import { useCustomerStore } from "@/store/customerStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSupplierStore } from "@/store/supplierStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useAppStore } from "@/store/appStore";

const COLLECTION_REFS = {
  CUSTOMERS: "customers",
  TRANSACTIONS: "transactions",
  DAILY_CASH_INCOME: "dailyCashIncome",
  DAILY_CASH_EXPENSE: "dailyCashExpense",
  SUPPLIERS: "suppliers",
  SUPPLIER_TRANSACTIONS: "supplierTransactions",
  FABRICS: "fabrics",
  PARTNER_PRODUCTS: "partnerProducts",
  SETTINGS: "settings",
};

const PERFORMANCE_THRESHOLDS = {
  DEBOUNCE_DELAY: 300, // 300ms
};

export function FirebaseDataSync() {
  const { setCustomers, setTransactions: setCustomerTransactions } = useCustomerStore();
  const { setFabrics } = useInventoryStore();
  const { setSuppliers, setSupplierTransactions } = useSupplierStore();
  const { setTransactions, setDailyCashIncome, setDailyCashExpense } = useTransactionStore();
  const { setPartnerProducts, setSettings, setConnectionState } = useAppStore();

  const debounceTimers = useRef({}).current;

  useEffect(() => {
    const unsubscribers = [];

    // --- Connection State ---
    const connectedRef = ref(db, ".info/connected");
    const connectionUnsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val();
      setConnectionState(connected ? "connected" : "disconnected");
      if (connected) {
        logger.info("[FirebaseDataSync] Firebase connection established");
      } else {
        logger.warn("[FirebaseDataSync] Firebase connection lost");
      }
    });
    unsubscribers.push(connectionUnsubscribe);

    // --- Data Collections ---
    const collections = [
      {
        path: COLLECTION_REFS.CUSTOMERS,
        setter: (data) => {
          const arrayData = data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : [];
          setCustomers(arrayData);
        },
      },
      {
        path: COLLECTION_REFS.TRANSACTIONS,
        setter: (data) => {
          const arrayData = data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : [];
          setTransactions(arrayData);
          setCustomerTransactions(arrayData); // Also update transactions in customer store for due calculations
        },
      },
      {
        path: COLLECTION_REFS.SUPPLIERS,
        setter: (data) => {
          const arrayData = data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : [];
          setSuppliers(arrayData);
        },
      },
      {
        path: COLLECTION_REFS.SUPPLIER_TRANSACTIONS,
        setter: (data) => {
            const arrayData = data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : [];
            setSupplierTransactions(arrayData);
        }
      },
      {
        path: COLLECTION_REFS.FABRICS,
        setter: (data) => {
          if (data && typeof data === "object") {
            const fabricsArray = Object.entries(data)
              .map(([id, fabricData]) => {
                const { id: existingId, ...cleanFabricData } = fabricData;
                if (!id) return null;
                return {
                  id,
                  ...cleanFabricData,
                  batches: cleanFabricData.batches
                    ? Object.entries(cleanFabricData.batches).map(([batchId, batch]) => ({ id: batchId, ...batch }))
                    : [],
                };
              })
              .filter(Boolean);
            setFabrics(fabricsArray);
          } else {
            setFabrics([]);
          }
        },
      },
      {
        path: COLLECTION_REFS.PARTNER_PRODUCTS,
        setter: (data) => {
            const arrayData = data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : [];
            setPartnerProducts(arrayData);
        }
      },
      {
        path: COLLECTION_REFS.DAILY_CASH_INCOME,
        setter: (data) => {
            const arrayData = data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : [];
            setDailyCashIncome(arrayData);
        }
      },
      {
        path: COLLECTION_REFS.DAILY_CASH_EXPENSE,
        setter: (data) => {
            const arrayData = data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : [];
            setDailyCashExpense(arrayData);
        }
      },
      {
        path: COLLECTION_REFS.SETTINGS,
        setter: (data) => {
            if (data) {
                setSettings(data);
            }
        }
      }
    ];

    collections.forEach(({ path, setter }) => {
      const collectionRef = ref(db, path);
      const unsubscribe = onValue(collectionRef, (snapshot) => {
        if (debounceTimers[path]) {
          clearTimeout(debounceTimers[path]);
        }
        debounceTimers[path] = setTimeout(() => {
          if (snapshot.exists()) {
            setter(snapshot.val());
          } else {
            logger.info(`[FirebaseDataSync] No data for ${path}`);
            setter([]); // Send empty array if no data
          }
        }, PERFORMANCE_THRESHOLDS.DEBOUNCE_DELAY);
      });
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      Object.values(debounceTimers).forEach((timer) => clearTimeout(timer));
    };
  }, [
    setCustomers,
    setTransactions,
    setCustomerTransactions,
    setFabrics,
    setSuppliers,
    setSupplierTransactions,
    setPartnerProducts,
    setDailyCashIncome,
    setDailyCashExpense,
    setSettings,
    setConnectionState,
    debounceTimers,
  ]);

  return null; // This component does not render anything
}
