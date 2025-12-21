import { ref, push, set, get, update, remove, onValue } from "firebase/database";
import { AppError, ERROR_TYPES } from "@/utils/error-handling";

const COLLECTION_PATH = "partnerProducts";

class PartnerProductService {
  constructor(db, logger, atomicOperations) {
    this.db = db;
    this.logger = logger;
    this.atomicOperations = atomicOperations;
  }

  /**
   * Subscribe to partner product updates
   * @param {Function} callback - Function called with updated product list
   * @returns {Function} Unsubscribe function
   */
  subscribeToPartnerProducts(callback) {
    const itemsRef = ref(this.db, COLLECTION_PATH);
    return onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        callback(productList);
      } else {
        callback([]);
      }
    }, (error) => {
      this.logger.error("Error subscribing to partner products:", error);
      callback([]);
    });
  }

  // --- Basic CRUD ---

  async create(data) {
    return this.atomicOperations.execute("createPartnerProduct", async () => {
      const itemsRef = ref(this.db, COLLECTION_PATH);
      const newItemRef = push(itemsRef);
      const id = newItemRef.key;
      
      await set(newItemRef, { ...data, id, createdAt: new Date().toISOString() });
      return id;
    });
  }

  async update(id, data) {
    return this.atomicOperations.execute("updatePartnerProduct", async () => {
      const itemRef = ref(this.db, `${COLLECTION_PATH}/${id}`);
      await update(itemRef, { ...data, updatedAt: new Date().toISOString() });
    });
  }

  async delete(id) {
    return this.atomicOperations.execute("deletePartnerProduct", async () => {
       const itemRef = ref(this.db, `${COLLECTION_PATH}/${id}`);
       await remove(itemRef);
    });
  }

  // --- Partner Sub-operations ---

  async addPartnerToProduct(productId, partnerName) {
    return this.atomicOperations.execute("addPartnerToProduct", async () => {
      const productRef = ref(this.db, `${COLLECTION_PATH}/${productId}`);
      const snapshot = await get(productRef);
      if (!snapshot.exists()) throw new AppError("Product not found", ERROR_TYPES.NOT_FOUND);
      
      const product = snapshot.val();
      const partners = product.partnerAccounts || [];
      
      if (partners.some(p => p.name === partnerName)) {
        throw new AppError("Partner already exists", ERROR_TYPES.VALIDATION);
      }

      partners.push({
        name: partnerName,
        transactions: []
      });

      await update(productRef, { partnerAccounts: partners, updatedAt: new Date().toISOString() });
    });
  }

  async updatePartnerName(productId, oldName, newName) {
    return this.atomicOperations.execute("updatePartnerName", async () => {
      const productRef = ref(this.db, `${COLLECTION_PATH}/${productId}`);
      const snapshot = await get(productRef);
      if (!snapshot.exists()) throw new AppError("Product not found", ERROR_TYPES.NOT_FOUND);
      
      const product = snapshot.val();
      const partners = product.partnerAccounts || [];
      const partnerIndex = partners.findIndex(p => p.name === oldName);
      
      if (partnerIndex === -1) throw new AppError("Partner not found", ERROR_TYPES.NOT_FOUND);

      partners[partnerIndex].name = newName;

      await update(productRef, { partnerAccounts: partners, updatedAt: new Date().toISOString() });
    });
  }

  async deletePartner(productId, partnerName) {
    return this.atomicOperations.execute("deletePartner", async () => {
      const productRef = ref(this.db, `${COLLECTION_PATH}/${productId}`);
      const snapshot = await get(productRef);
      if (!snapshot.exists()) throw new AppError("Product not found", ERROR_TYPES.NOT_FOUND);
      
      const product = snapshot.val();
      const partners = product.partnerAccounts || [];
      const updatedPartners = partners.filter(p => p.name !== partnerName);

      await update(productRef, { partnerAccounts: updatedPartners, updatedAt: new Date().toISOString() });
    });
  }

  // --- Partner Transaction Sub-operations ---

  async addTransactionToPartner(productId, partnerName, transactionData) {
    return this.atomicOperations.execute("addTransactionToPartner", async () => {
      const productRef = ref(this.db, `${COLLECTION_PATH}/${productId}`);
      const snapshot = await get(productRef);
      if (!snapshot.exists()) throw new AppError("Product not found", ERROR_TYPES.NOT_FOUND);
      
      const product = snapshot.val();
      const partners = product.partnerAccounts || [];
      const partnerIndex = partners.findIndex(p => p.name === partnerName);
      
      if (partnerIndex === -1) throw new AppError("Partner not found", ERROR_TYPES.NOT_FOUND);

      const transactions = partners[partnerIndex].transactions || [];
      const newTx = {
        ...transactionData,
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      
      transactions.push(newTx);
      partners[partnerIndex].transactions = transactions;

      await update(productRef, { partnerAccounts: partners, updatedAt: new Date().toISOString() });
      return newTx.id;
    });
  }

  async updatePartnerTransaction(productId, partnerName, transactionId, updatedData) {
    return this.atomicOperations.execute("updatePartnerTransaction", async () => {
      const productRef = ref(this.db, `${COLLECTION_PATH}/${productId}`);
      const snapshot = await get(productRef);
      if (!snapshot.exists()) throw new AppError("Product not found", ERROR_TYPES.NOT_FOUND);
      
      const product = snapshot.val();
      const partners = product.partnerAccounts || [];
      const partnerIndex = partners.findIndex(p => p.name === partnerName);
      
      if (partnerIndex === -1) throw new AppError("Partner not found", ERROR_TYPES.NOT_FOUND);

      const transactions = partners[partnerIndex].transactions || [];
      const txIndex = transactions.findIndex(t => t.id === transactionId);
      
      if (txIndex === -1) throw new AppError("Transaction not found", ERROR_TYPES.NOT_FOUND);

      transactions[txIndex] = { ...transactions[txIndex], ...updatedData };
      partners[partnerIndex].transactions = transactions;

      await update(productRef, { partnerAccounts: partners, updatedAt: new Date().toISOString() });
    });
  }

  async deletePartnerTransaction(productId, partnerName, transactionId) {
    return this.atomicOperations.execute("deletePartnerTransaction", async () => {
      const productRef = ref(this.db, `${COLLECTION_PATH}/${productId}`);
      const snapshot = await get(productRef);
      if (!snapshot.exists()) throw new AppError("Product not found", ERROR_TYPES.NOT_FOUND);
      
      const product = snapshot.val();
      const partners = product.partnerAccounts || [];
      const partnerIndex = partners.findIndex(p => p.name === partnerName);
      
      if (partnerIndex === -1) throw new AppError("Partner not found", ERROR_TYPES.NOT_FOUND);

      const transactions = partners[partnerIndex].transactions || [];
      const updatedTransactions = transactions.filter(t => t.id !== transactionId);
      partners[partnerIndex].transactions = updatedTransactions;

      await update(productRef, { partnerAccounts: partners, updatedAt: new Date().toISOString() });
    });
  }
}

export { PartnerProductService };
