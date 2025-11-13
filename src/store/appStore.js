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
import { AtomicOperationService } from "@/services/atomicOperations";
import logger from "@/utils/logger";

const atomicOperations = new AtomicOperationService();

const COLLECTION_REFS = {
  PARTNER_PRODUCTS: "partnerProducts",
  SETTINGS: "settings",
};

const CONNECTION_STATES = {
  CONNECTED: "connected",
  CONNECTING: "connecting",
  DISCONNECTED: "disconnected",
  OFFLINE: "offline",
};

export const useAppStore = create((set, get) => ({
  partnerProducts: [],
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
  connectionState: CONNECTION_STATES.CONNECTING,
  offlineQueue: [],
  pendingOperations: new Set(),
  performanceMetrics: {
    operationCount: 0,
    slowOperations: 0,
    averageResponseTime: 0,
    lastOperationTime: null,
  },
  loading: true,
  error: null,

  setPartnerProducts: (partnerProducts) => set({ partnerProducts, loading: false }),
  setSettings: (settings) => set({ settings }),
  setConnectionState: (connectionState) => set({ connectionState }),

  // Partner Product Operations
  addPartnerProduct: async (productData) => {
    try {
      return await atomicOperations.execute("addPartnerProduct", async () => {
        const productsRef = ref(db, COLLECTION_REFS.PARTNER_PRODUCTS);
        const newProductRef = push(productsRef);
        await set(newProductRef, {
          ...productData,
          createdAt: serverTimestamp(),
        });
        return newProductRef.key;
      });
    } catch (error) {
      logger.error("Error adding partner product:", error);
      set({ error });
    }
  },

  updatePartnerProduct: async (productId, updatedData) => {
    try {
      return await atomicOperations.execute("updatePartnerProduct", async () => {
        const productRef = ref(db, `${COLLECTION_REFS.PARTNER_PRODUCTS}/${productId}`);
        await update(productRef, {
          ...updatedData,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      logger.error("Error updating partner product:", error);
      set({ error });
    }
  },

  deletePartnerProduct: async (productId) => {
    try {
      return await atomicOperations.execute("deletePartnerProduct", async () => {
        await remove(ref(db, `${COLLECTION_REFS.PARTNER_PRODUCTS}/${productId}`));
      });
    } catch (error) {
      logger.error("Error deleting partner product:", error);
      set({ error });
    }
  },

  addPartnerToProduct: async (productId, partnerName) => {
    try {
      return await atomicOperations.execute("addPartnerToProduct", async () => {
        const productRef = ref(db, `${COLLECTION_REFS.PARTNER_PRODUCTS}/${productId}`);
        const snapshot = await get(productRef);
        if (snapshot.exists()) {
          const productData = snapshot.val();
          const partnerAccounts = productData.partnerAccounts || [];
          if (partnerAccounts.some(p => p.name === partnerName)) {
            console.warn(`Partner "${partnerName}" already exists.`);
            return;
          }
          const updatedPartnerAccounts = [
            ...partnerAccounts,
            { name: partnerName, transactions: [] },
          ];
          await update(productRef, { partnerAccounts: updatedPartnerAccounts });
        }
      });
    } catch (error) {
      logger.error("Error adding partner to product:", error);
      set({ error });
    }
  },

  addTransactionToPartner: async (productId, partnerName, transactionData) => {
    try {
      return await atomicOperations.execute("addTransactionToPartner", async () => {
        const productRef = ref(db, `${COLLECTION_REFS.PARTNER_PRODUCTS}/${productId}`);
        const snapshot = await get(productRef);
        if (snapshot.exists()) {
          const productData = snapshot.val();
          const partnerAccounts = productData.partnerAccounts || [];
          const partnerIndex = partnerAccounts.findIndex(p => p.name === partnerName);

          if (partnerIndex === -1) {
            throw new Error(`Partner "${partnerName}" not found.`);
          }
          
          const newTransaction = {
            id: Date.now(),
            ...transactionData
          };

          const updatedPartnerAccounts = [...partnerAccounts];
          updatedPartnerAccounts[partnerIndex].transactions = [
            ...(updatedPartnerAccounts[partnerIndex].transactions || []),
            newTransaction,
          ];

          await update(productRef, { partnerAccounts: updatedPartnerAccounts });
        }
      });
    } catch (error) {
      logger.error("Error adding transaction to partner:", error);
      set({ error });
    }
  },

  updatePartnerName: async (productId, oldName, newName) => {
    try {
      return await atomicOperations.execute("updatePartnerName", async () => {
        const productRef = ref(db, `${COLLECTION_REFS.PARTNER_PRODUCTS}/${productId}`);
        const snapshot = await get(productRef);
        if (snapshot.exists()) {
          const productData = snapshot.val();
          const partnerAccounts = productData.partnerAccounts || [];
          const partnerIndex = partnerAccounts.findIndex(p => p.name === oldName);

          if (partnerIndex === -1) {
            throw new Error(`Partner "${oldName}" not found.`);
          }

          const updatedPartnerAccounts = [...partnerAccounts];
          updatedPartnerAccounts[partnerIndex].name = newName;

          await update(productRef, { partnerAccounts: updatedPartnerAccounts });
        }
      });
    } catch (error) {
      logger.error("Error updating partner name:", error);
      set({ error });
    }
  },

  deletePartner: async (productId, partnerName) => {
    try {
      return await atomicOperations.execute("deletePartner", async () => {
        const productRef = ref(db, `${COLLECTION_REFS.PARTNER_PRODUCTS}/${productId}`);
        const snapshot = await get(productRef);
        if (snapshot.exists()) {
          const productData = snapshot.val();
          const partnerAccounts = productData.partnerAccounts || [];
          const updatedPartnerAccounts = partnerAccounts.filter(p => p.name !== partnerName);
          await update(productRef, { partnerAccounts: updatedPartnerAccounts });
        }
      });
    } catch (error) {
      logger.error("Error deleting partner:", error);
      set({ error });
    }
  },

  updatePartnerTransaction: async (productId, partnerName, transactionId, newTransactionData) => {
    try {
      return await atomicOperations.execute("updatePartnerTransaction", async () => {
        const productRef = ref(db, `${COLLECTION_REFS.PARTNER_PRODUCTS}/${productId}`);
        const snapshot = await get(productRef);
        if (snapshot.exists()) {
          const productData = snapshot.val();
          const partnerAccounts = productData.partnerAccounts || [];
          const partnerIndex = partnerAccounts.findIndex(p => p.name === partnerName);

          if (partnerIndex === -1) {
            throw new Error(`Partner "${partnerName}" not found.`);
          }

          const transactions = partnerAccounts[partnerIndex].transactions || [];
          const transactionIndex = transactions.findIndex(t => t.id === transactionId);

          if (transactionIndex === -1) {
            throw new Error(`Transaction with ID "${transactionId}" not found.`);
          }
          
          const updatedPartnerAccounts = [...partnerAccounts];
          updatedPartnerAccounts[partnerIndex].transactions[transactionIndex] = {
            ...updatedPartnerAccounts[partnerIndex].transactions[transactionIndex],
            ...newTransactionData,
          };

          await update(productRef, { partnerAccounts: updatedPartnerAccounts });
        }
      });
    } catch (error) {
      logger.error("Error updating partner transaction:", error);
      set({ error });
    }
  },

  deletePartnerTransaction: async (productId, partnerName, transactionId) => {
    try {
      return await atomicOperations.execute("deletePartnerTransaction", async () => {
        const productRef = ref(db, `${COLLECTION_REFS.PARTNER_PRODUCTS}/${productId}`);
        const snapshot = await get(productRef);
        if (snapshot.exists()) {
          const productData = snapshot.val();
          const partnerAccounts = productData.partnerAccounts || [];
          const partnerIndex = partnerAccounts.findIndex(p => p.name === partnerName);

          if (partnerIndex === -1) {
            throw new Error(`Partner "${partnerName}" not found.`);
          }

          const updatedPartnerAccounts = [...partnerAccounts];
          updatedPartnerAccounts[partnerIndex].transactions = (updatedPartnerAccounts[partnerIndex].transactions || []).filter(
            t => t.id !== transactionId
          );

          await update(productRef, { partnerAccounts: updatedPartnerAccounts });
        }
      });
    } catch (error) {
      logger.error("Error deleting partner transaction:", error);
      set({ error });
    }
  },

  // Settings Operations
  updateSettings: async (newSettings) => {
    const validationErrors = [];
    if (!newSettings.store?.storeName?.trim()) validationErrors.push("Store name is required");
    if (!newSettings.store?.address?.trim()) validationErrors.push("Store address is required");
    if (!newSettings.store?.phone?.trim()) validationErrors.push("Store phone is required");

    if (validationErrors.length > 0) {
      const error = new Error(`Validation failed: ${validationErrors.join(", ")}`);
      set({ error });
      throw error;
    }

    try {
      return await atomicOperations.execute("updateSettings", async () => {
        await update(ref(db, "settings"), newSettings);
        set({ settings: newSettings });
        return true;
      });
    } catch (error) {
      logger.error("Error updating settings:", error);
      set({ error });
    }
  },
}));
