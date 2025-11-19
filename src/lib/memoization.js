/**
 * Memoization utilities for expensive calculations
 */

/**
 * Create a memoized version of a function
 * @template T
 * @param {Function} fn - Function to memoize
 * @param {Object} [options={}] - Memoization options
 * @param {number} [options.maxSize=100] - Maximum cache size
 * @param {number} [options.ttl=null] - Time to live in milliseconds (null = no expiration)
 * @param {Function} [options.keyGenerator=null] - Custom key generator function
 * @returns {Function} Memoized function
 */
export function memoize(fn, options = {}) {
  const {
    maxSize = 100,
    ttl = null,
    keyGenerator = null,
  } = options;

  const cache = new Map();
  const timestamps = new Map();

  return function memoized(...args) {
    // Generate cache key
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    // Check if cached value exists and is not expired
    if (cache.has(key)) {
      const timestamp = timestamps.get(key);
      if (!ttl || (Date.now() - timestamp) < ttl) {
        return cache.get(key);
      } else {
        // Expired, remove from cache
        cache.delete(key);
        timestamps.delete(key);
      }
    }

    // Compute new value
    const result = fn.apply(this, args);

    // Store in cache
    cache.set(key, result);
    timestamps.set(key, Date.now());

    // Enforce max size (LRU eviction)
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
      timestamps.delete(firstKey);
    }

    return result;
  };
}

/**
 * Create a memoized version of an async function
 * @template T
 * @param {Function} fn - Async function to memoize
 * @param {Object} [options={}] - Memoization options
 * @returns {Function} Memoized async function
 */
export function memoizeAsync(fn, options = {}) {
  const {
    maxSize = 100,
    ttl = null,
    keyGenerator = null,
  } = options;

  const cache = new Map();
  const timestamps = new Map();
  const pending = new Map(); // Track pending promises to avoid duplicate requests

  return async function memoized(...args) {
    // Generate cache key
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    // Check if cached value exists and is not expired
    if (cache.has(key)) {
      const timestamp = timestamps.get(key);
      if (!ttl || (Date.now() - timestamp) < ttl) {
        return cache.get(key);
      } else {
        // Expired, remove from cache
        cache.delete(key);
        timestamps.delete(key);
      }
    }

    // Check if there's a pending request for this key
    if (pending.has(key)) {
      return pending.get(key);
    }

    // Create new promise and track it
    const promise = fn.apply(this, args);
    pending.set(key, promise);

    try {
      const result = await promise;

      // Store in cache
      cache.set(key, result);
      timestamps.set(key, Date.now());

      // Enforce max size (LRU eviction)
      if (cache.size > maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
        timestamps.delete(firstKey);
      }

      return result;
    } finally {
      // Remove from pending
      pending.delete(key);
    }
  };
}

/**
 * Clear all memoization caches
 * @param {Function} memoizedFn - Memoized function to clear
 */
export function clearMemoCache(memoizedFn) {
  if (memoizedFn && memoizedFn.cache) {
    memoizedFn.cache.clear();
  }
}

/**
 * Memoize expensive customer calculations
 */
export const memoizedCalculations = {
  /**
   * Calculate customer due with memoization
   * @param {Array<Object>} transactions - All transactions
   * @param {string} customerId - Customer ID
   * @returns {number} Total due amount
   */
  calculateCustomerDue: memoize(
    (transactions, customerId) => {
      return transactions
        .filter((t) => t.customerId === customerId)
        .reduce((total, t) => total + ((t.total || 0) - (t.deposit || 0)), 0);
    },
    {
      maxSize: 200,
      ttl: 5000, // 5 seconds
      keyGenerator: (transactions, customerId) => {
        // Use transaction count and customerId as key for better cache hits
        const customerTransactions = transactions.filter(t => t.customerId === customerId);
        return `${customerId}_${customerTransactions.length}_${customerTransactions.reduce((sum, t) => sum + (t.total || 0) + (t.deposit || 0), 0)}`;
      },
    }
  ),

  /**
   * Calculate inventory totals with memoization
   * @param {Array<Object>} fabrics - All fabrics
   * @returns {Object} Inventory statistics
   */
  calculateInventoryTotals: memoize(
    (fabrics) => {
      let totalValue = 0;
      let totalQuantity = 0;
      let lowStockCount = 0;

      fabrics.forEach((fabric) => {
        if (fabric.batches) {
          Object.values(fabric.batches).forEach((batch) => {
            if (batch.items && Array.isArray(batch.items)) {
              batch.items.forEach((item) => {
                const quantity = item.quantity || 0;
                totalQuantity += quantity;
                if (batch.unitCost) {
                  totalValue += batch.unitCost * quantity;
                }
                if (quantity < 10) {
                  lowStockCount++;
                }
              });
            }
          });
        }
      });

      return {
        totalValue,
        totalQuantity,
        lowStockCount,
        fabricCount: fabrics.length,
      };
    },
    {
      maxSize: 10,
      ttl: 10000, // 10 seconds
      keyGenerator: (fabrics) => {
        // Use fabric count and total batch count as key
        const batchCount = fabrics.reduce((sum, f) => {
          return sum + (f.batches ? Object.keys(f.batches).length : 0);
        }, 0);
        return `fabrics_${fabrics.length}_${batchCount}`;
      },
    }
  ),

  /**
   * Calculate transaction statistics with memoization
   * @param {Array<Object>} transactions - All transactions
   * @returns {Object} Transaction statistics
   */
  calculateTransactionStats: memoize(
    (transactions) => {
      const totalRevenue = transactions.reduce(
        (sum, t) => sum + (t.total || 0),
        0
      );
      const totalDeposits = transactions.reduce(
        (sum, t) => sum + (t.deposit || 0),
        0
      );
      const totalDue = totalRevenue - totalDeposits;

      return {
        totalRevenue,
        totalDeposits,
        totalDue,
        transactionCount: transactions.length,
      };
    },
    {
      maxSize: 10,
      ttl: 5000, // 5 seconds
      keyGenerator: (transactions) => {
        // Use transaction count and sum as key
        const sum = transactions.reduce((s, t) => s + (t.total || 0) + (t.deposit || 0), 0);
        return `transactions_${transactions.length}_${sum}`;
      },
    }
  ),

  /**
   * Group transactions by memo with memoization
   * @param {Array<Object>} transactions - All transactions
   * @param {string} customerId - Customer ID
   * @returns {Array<Object>} Grouped memo transactions
   */
  groupTransactionsByMemo: memoize(
    (transactions, customerId) => {
      const customerTransactions = transactions.filter(
        (t) => t.customerId === customerId
      );

      const memoMap = new Map();

      customerTransactions.forEach((transaction) => {
        const memoNumber = transaction.memoNumber;
        if (!memoNumber) return;

        if (!memoMap.has(memoNumber)) {
          memoMap.set(memoNumber, {
            memoNumber,
            customerId,
            saleTransaction: null,
            paymentTransactions: [],
            totalAmount: 0,
            paidAmount: 0,
            dueAmount: 0,
            saleDate: null,
            status: 'unpaid',
          });
        }

        const memoGroup = memoMap.get(memoNumber);

        if (transaction.type === 'sale' || !transaction.type) {
          memoGroup.saleTransaction = transaction;
          memoGroup.totalAmount = transaction.total || 0;
          memoGroup.saleDate = transaction.date || transaction.createdAt;
          memoGroup.paidAmount = transaction.deposit || 0;
        } else if (transaction.type === 'payment') {
          memoGroup.paymentTransactions.push(transaction);
          memoGroup.paidAmount += transaction.deposit || transaction.amount || 0;
        }
      });

      const memoGroups = Array.from(memoMap.values()).map((memo) => {
        memo.dueAmount = memo.totalAmount - memo.paidAmount;
        if (memo.dueAmount <= 0) {
          memo.status = 'paid';
        } else if (memo.paidAmount > 0) {
          memo.status = 'partial';
        } else {
          memo.status = 'unpaid';
        }
        return memo;
      });

      return memoGroups.sort((a, b) => {
        const dateA = new Date(a.saleDate || 0);
        const dateB = new Date(b.saleDate || 0);
        return dateB - dateA;
      });
    },
    {
      maxSize: 100,
      ttl: 5000, // 5 seconds
      keyGenerator: (transactions, customerId) => {
        const customerTransactions = transactions.filter(t => t.customerId === customerId);
        return `memo_${customerId}_${customerTransactions.length}`;
      },
    }
  ),
};

export default memoizedCalculations;
