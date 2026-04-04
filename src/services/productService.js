import {
  ref,
  push,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  serverTimestamp,
} from "firebase/database";

const PRODUCTS_PATH = "products";

export class ProductService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Add a new product/project
   * @param {Object} productData
   * @returns {Promise<string>} productId
   */
  async addProduct(productData) {
    try {
      const productsRef = ref(this.db, PRODUCTS_PATH);
      const newProductRef = push(productsRef);
      
      const payload = {
        ...productData,
        createdAt: serverTimestamp(),
        status: 'ACTIVE',
      };
      
      await update(newProductRef, payload);
      this.logger.info(`Product added: ${newProductRef.key}`);
      return newProductRef.key;
    } catch (error) {
      this.logger.error("Error adding product:", error);
      throw error;
    }
  }

  /**
   * Update an existing product
   * @param {string} id 
   * @param {Object} updates 
   */
  async updateProduct(id, updates) {
    try {
      const productRef = ref(this.db, `${PRODUCTS_PATH}/${id}`);
      await update(productRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      this.logger.info(`Product updated: ${id}`);
    } catch (error) {
      this.logger.error("Error updating product:", error);
      throw error;
    }
  }

  /**
   * Delete a product
   * @param {string} id 
   */
  async deleteProduct(id) {
    try {
      const productRef = ref(this.db, `${PRODUCTS_PATH}/${id}`);
      await remove(productRef);
      this.logger.info(`Product deleted: ${id}`);
    } catch (error) {
      this.logger.error("Error deleting product:", error);
      throw error;
    }
  }

  /**
   * Subscribe to products
   * @param {Function} callback 
   * @returns {Function} unsubscribe
   */
  subscribeToProducts(callback) {
    const productsRef = ref(this.db, PRODUCTS_PATH);
    const q = query(productsRef, orderByChild("createdAt"));

    const unsubscribe = onValue(
      q,
      (snapshot) => {
        const data = snapshot.val();
        const products = data
          ? Object.entries(data).map(([id, value]) => ({
              id,
              ...value,
            }))
          : [];
        
        // Calculate dynamic values (Investments, Returns, ROI)
        const enrichedProducts = products.map(product => this.enrichProductData(product));
        
        // Sort by date desc
        enrichedProducts.sort((a, b) => new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt));

        callback(enrichedProducts);
      },
      (error) => {
        this.logger.error("Error subscribing to products:", error);
        callback([]);
      }
    );

    return unsubscribe;
  }

  /**
   * Add a transaction to an existing product
   * @param {string} productId 
   * @param {Object} transactionData - { type: "INVESTMENT" | "RETURN", amount: Number, date: String, note: String }
   */
  async addProductTransaction(productId, transactionData) {
    try {
      const txRef = push(ref(this.db, `${PRODUCTS_PATH}/${productId}/transactions`));
      await update(txRef, {
        ...transactionData,
        createdAt: serverTimestamp()
      });
      this.logger.info(`Product transaction added to ${productId}`);
      return txRef.key;
    } catch (error) {
      this.logger.error("Error adding product transaction:", error);
      throw error;
    }
  }

  /**
   * Update a specific product transaction
   * @param {string} productId 
   * @param {string} transactionId 
   * @param {Object} updates 
   */
  async updateProductTransaction(productId, transactionId, updates) {
    try {
      const txRef = ref(this.db, `${PRODUCTS_PATH}/${productId}/transactions/${transactionId}`);
      await update(txRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      this.logger.info(`Product transaction updated: ${transactionId} for product ${productId}`);
    } catch (error) {
      this.logger.error("Error updating product transaction:", error);
      throw error;
    }
  }

  /**
   * Delete a specific product transaction
   * @param {string} productId 
   * @param {string} transactionId 
   */
  async deleteProductTransaction(productId, transactionId) {
    try {
      const txRef = ref(this.db, `${PRODUCTS_PATH}/${productId}/transactions/${transactionId}`);
      await remove(txRef);
      this.logger.info(`Product transaction deleted: ${transactionId} from product ${productId}`);
    } catch (error) {
      this.logger.error("Error deleting product transaction:", error);
      throw error;
    }
  }

  /**
   * Calculate manual ledger totals from sub-transactions
   * @param {Object} product 
   * @returns {Object} enriched product
   */
  enrichProductData(product) {
    let totalCost = 0;
    let totalSales = 0;
    let totalPartnerInvestment = 0;
    let totalSoldQuantity = 0;
    let partners = {}; // { [partnerName]: { invested: 0, payout: 0, balance: 0 } }

    const initInvestment = Number(product.initialInvestment) || 0;
    totalCost += initInvestment; // Legacy init mapped to cost

    if (product.transactions) {
       Object.values(product.transactions).forEach(t => {
           const amt = Math.abs(Number(t.amount) || 0);
           const type = t.type;
           const partnerName = t.partnerName || 'Unknown Partner';

           if (type === 'PRODUCT_COST' || type === 'OTHER_EXPENSE' || type === 'INVESTMENT') {
               totalCost += amt;
           } else if (type === 'PRODUCT_SALE' || type === 'RETURN') {
               totalSales += amt;
               if (t.soldQuantity) {
                   totalSoldQuantity += Number(t.soldQuantity) || 0;
               }
           } else if (type === 'PARTNER_INVESTMENT') {
               totalPartnerInvestment += amt;
               if (!partners[partnerName]) partners[partnerName] = { invested: 0, payout: 0, balance: 0 };
               partners[partnerName].invested += amt;
               partners[partnerName].balance += amt;
           } else if (type === 'PARTNER_PAYOUT') {
               if (!partners[partnerName]) partners[partnerName] = { invested: 0, payout: 0, balance: 0 };
               partners[partnerName].payout += amt;
               partners[partnerName].balance -= amt;
           }
       });
    }

    const netProfit = totalSales - totalCost;
    
    const initialQty = Number(product.quantity) || 0;
    const remainingQuantity = product.quantity ? Math.max(0, initialQty - totalSoldQuantity) : null;

    return {
      ...product,
      totalCost,
      totalSales,
      totalPartnerInvestment,
      totalSoldQuantity,
      remainingQuantity,
      netProfit,
      partners,
      daysElapsed: product.startDate ? Math.ceil(Math.abs(new Date() - new Date(product.startDate)) / (1000 * 60 * 60 * 24)) : 0
    };
  }
}
