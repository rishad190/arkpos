/**
 * Performance Integration Tests
 * Tests real-world scenarios with performance tracking
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { PerformanceTracker } from '@/lib/performanceTracker';
import { memoizedCalculations } from '@/lib/memoization';
import { paginate } from '@/lib/pagination';

// Simple mock data generators for performance testing
const generateCustomer = () => ({
  id: `customer-${Math.random().toString(36).substr(2, 9)}`,
  name: `Customer ${Math.random().toString(36).substr(2, 9)}`,
  phone: `${Math.floor(Math.random() * 10000000000)}`,
  address: `Address ${Math.random()}`,
});

const generateTransaction = () => {
  const total = Math.round(Math.random() * 10000 * 100) / 100;
  const deposit = Math.round(Math.random() * total * 100) / 100;
  return {
    id: `txn-${Math.random().toString(36).substr(2, 9)}`,
    customerId: `customer-${Math.floor(Math.random() * 100)}`,
    memoNumber: `MEMO-${Math.floor(Math.random() * 1000)}`,
    type: Math.random() > 0.5 ? 'sale' : 'payment',
    total,
    deposit,
    due: total - deposit,
    date: new Date(2020 + Math.random() * 5, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
    products: [],
  };
};

const generateFabric = () => ({
  id: `fabric-${Math.random().toString(36).substr(2, 9)}`,
  name: `Fabric ${Math.random().toString(36).substr(2, 9)}`,
  category: ['Cotton', 'Silk', 'Polyester'][Math.floor(Math.random() * 3)],
  unit: 'meter',
  batches: {},
});

const generateBatch = () => ({
  items: [
    {
      colorName: `Color ${Math.random().toString(36).substr(2, 5)}`,
      quantity: Math.round(Math.random() * 100 * 100) / 100,
    },
  ],
  purchaseDate: new Date(2020 + Math.random() * 5, Math.floor(Math.random() * 12), 1).toISOString(),
  unitCost: Math.round(Math.random() * 100 * 100) / 100,
  supplier: `Supplier ${Math.random().toString(36).substr(2, 5)}`,
  createdAt: new Date().toISOString(),
});

// Performance budgets
const BUDGETS = {
  CUSTOMER_LIFECYCLE: 2000,
  INVENTORY_UPDATE: 1000,
  TRANSACTION_PROCESSING: 1000,
  REPORT_GENERATION: 1500,
};

describe('Performance Integration Tests', () => {
  let performanceTracker;

  beforeEach(() => {
    performanceTracker = new PerformanceTracker();
  });

  afterEach(() => {
    performanceTracker.reset();
  });

  describe('Customer Lifecycle Performance', () => {
    test('should handle complete customer workflow within budget', () => {
      const handle = performanceTracker.startOperation('customerLifecycle');

      // 1. Create customer
      const customer = generateCustomer();

      // 2. Create multiple transactions
      const transactions = Array.from({ length: 20 }, () => {
        const txn = generateTransaction();
        txn.customerId = customer.id;
        return txn;
      });

      // 3. Calculate customer due
      const totalDue = transactions.reduce(
        (sum, t) => sum + ((t.total || 0) - (t.deposit || 0)),
        0
      );

      // 4. Group by memo
      const memoMap = new Map();
      transactions.forEach((t) => {
        if (!memoMap.has(t.memoNumber)) {
          memoMap.set(t.memoNumber, []);
        }
        memoMap.get(t.memoNumber).push(t);
      });

      // 5. Generate customer report
      const report = {
        customer,
        totalTransactions: transactions.length,
        totalDue,
        memoCount: memoMap.size,
        transactions: Array.from(memoMap.entries()).map(([memo, txns]) => ({
          memoNumber: memo,
          transactions: txns,
          total: txns.reduce((sum, t) => sum + (t.total || 0), 0),
        })),
      };

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(BUDGETS.CUSTOMER_LIFECYCLE);
      expect(report.totalTransactions).toBe(20);
      expect(report.totalDue).toBeGreaterThanOrEqual(0);
    });

    test('should handle customer search and pagination within budget', () => {
      const handle = performanceTracker.startOperation('customerSearchPagination');

      // Generate large customer dataset
      const customers = Array.from({ length: 1000 }, () => generateCustomer());

      // Search
      const searchTerm = 'test';
      const searchResults = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm)
      );

      // Paginate results
      const paginatedResults = paginate(searchResults, 1, 20);

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(300); // Search budget
      expect(paginatedResults.items.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Inventory Management Performance', () => {
    test('should handle inventory operations within budget', () => {
      const handle = performanceTracker.startOperation('inventoryOperations');

      // 1. Generate fabrics with batches
      const fabrics = Array.from({ length: 100 }, () => {
        const fabric = generateFabric();
        fabric.batches = {
          batch1: generateBatch(),
          batch2: generateBatch(),
        };
        return fabric;
      });

      // 2. Calculate inventory totals
      let totalValue = 0;
      let totalQuantity = 0;
      let lowStockItems = 0;

      fabrics.forEach((fabric) => {
        if (fabric.batches) {
          Object.values(fabric.batches).forEach((batch) => {
            if (batch.items) {
              batch.items.forEach((item) => {
                const qty = item.quantity || 0;
                totalQuantity += qty;
                totalValue += (batch.unitCost || 0) * qty;
                if (qty < 10) lowStockItems++;
              });
            }
          });
        }
      });

      // 3. Find low stock items
      const lowStockFabrics = fabrics.filter((fabric) => {
        if (!fabric.batches) return false;
        return Object.values(fabric.batches).some((batch) =>
          batch.items?.some((item) => (item.quantity || 0) < 10)
        );
      });

      // 4. Sort by quantity
      const sortedFabrics = [...fabrics].sort((a, b) => {
        const qtyA = Object.values(a.batches || {}).reduce(
          (sum, batch) =>
            sum +
            (batch.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0),
          0
        );
        const qtyB = Object.values(b.batches || {}).reduce(
          (sum, batch) =>
            sum +
            (batch.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0),
          0
        );
        return qtyB - qtyA;
      });

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(BUDGETS.INVENTORY_UPDATE);
      expect(totalQuantity).toBeGreaterThan(0);
      expect(lowStockFabrics.length).toBeGreaterThanOrEqual(0);
      expect(sortedFabrics.length).toBe(100);
    });

    test('should handle FIFO inventory reduction within budget', () => {
      const handle = performanceTracker.startOperation('fifoReduction');

      // Create fabric with multiple batches
      const fabric = generateFabric();
      fabric.batches = {
        batch1: {
          ...generateBatch(),
          purchaseDate: '2024-01-01',
          items: [{ colorName: 'Red', quantity: 100 }],
        },
        batch2: {
          ...generateBatch(),
          purchaseDate: '2024-02-01',
          items: [{ colorName: 'Red', quantity: 50 }],
        },
        batch3: {
          ...generateBatch(),
          purchaseDate: '2024-03-01',
          items: [{ colorName: 'Red', quantity: 75 }],
        },
      };

      // Reduce inventory using FIFO
      const reduceQuantity = 120;
      const colorName = 'Red';
      let remaining = reduceQuantity;

      // Sort batches by date (FIFO)
      const sortedBatches = Object.entries(fabric.batches).sort(
        ([, a], [, b]) =>
          new Date(a.purchaseDate) - new Date(b.purchaseDate)
      );

      const reductions = [];
      for (const [batchId, batch] of sortedBatches) {
        if (remaining <= 0) break;

        const item = batch.items.find((i) => i.colorName === colorName);
        if (item && item.quantity > 0) {
          const reduceFromBatch = Math.min(item.quantity, remaining);
          reductions.push({ batchId, quantity: reduceFromBatch });
          remaining -= reduceFromBatch;
        }
      }

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(100);
      expect(reductions.length).toBeGreaterThan(0);
      expect(remaining).toBe(0);
    });
  });

  describe('Transaction Processing Performance', () => {
    test('should process bulk transactions within budget', () => {
      const handle = performanceTracker.startOperation('bulkTransactions');

      // Generate transactions
      const transactions = Array.from({ length: 500 }, () =>
        generateTransaction()
      );

      // Group by customer
      const byCustomer = transactions.reduce((acc, t) => {
        if (!acc[t.customerId]) {
          acc[t.customerId] = [];
        }
        acc[t.customerId].push(t);
        return acc;
      }, {});

      // Calculate customer dues
      const customerDues = Object.entries(byCustomer).map(
        ([customerId, txns]) => ({
          customerId,
          totalDue: txns.reduce(
            (sum, t) => sum + ((t.total || 0) - (t.deposit || 0)),
            0
          ),
          transactionCount: txns.length,
        })
      );

      // Sort by due amount
      customerDues.sort((a, b) => b.totalDue - a.totalDue);

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(BUDGETS.TRANSACTION_PROCESSING);
      expect(customerDues.length).toBeGreaterThan(0);
    });

    test('should handle memo grouping for multiple customers within budget', () => {
      const handle = performanceTracker.startOperation('multiCustomerMemoGrouping');

      // Generate transactions for 50 customers
      const transactions = [];
      for (let i = 0; i < 50; i++) {
        const customerId = `customer-${i}`;
        // 10 memos per customer
        for (let j = 0; j < 10; j++) {
          const memoNumber = `MEMO-${i}-${j}`;
          const sale = generateTransaction();
          sale.customerId = customerId;
          sale.memoNumber = memoNumber;
          sale.type = 'sale';
          transactions.push(sale);

          // 0-3 payments per memo
          const paymentCount = Math.floor(Math.random() * 4);
          for (let k = 0; k < paymentCount; k++) {
            const payment = generateTransaction();
            payment.customerId = customerId;
            payment.memoNumber = memoNumber;
            payment.type = 'payment';
            transactions.push(payment);
          }
        }
      }

      // Group by customer and memo
      const customerMemos = {};
      transactions.forEach((t) => {
        if (!customerMemos[t.customerId]) {
          customerMemos[t.customerId] = new Map();
        }
        if (!customerMemos[t.customerId].has(t.memoNumber)) {
          customerMemos[t.customerId].set(t.memoNumber, {
            sales: [],
            payments: [],
          });
        }
        const memo = customerMemos[t.customerId].get(t.memoNumber);
        if (t.type === 'sale') {
          memo.sales.push(t);
        } else {
          memo.payments.push(t);
        }
      });

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(BUDGETS.TRANSACTION_PROCESSING);
      expect(Object.keys(customerMemos).length).toBe(50);
    });
  });

  describe('Report Generation Performance', () => {
    test('should generate financial summary within budget', () => {
      const handle = performanceTracker.startOperation('financialSummary');

      // Generate data
      const transactions = Array.from({ length: 1000 }, () =>
        generateTransaction()
      );
      const customers = Array.from({ length: 100 }, () => generateCustomer());

      // Calculate summary
      const summary = {
        totalRevenue: transactions.reduce((sum, t) => sum + (t.total || 0), 0),
        totalDeposits: transactions.reduce(
          (sum, t) => sum + (t.deposit || 0),
          0
        ),
        totalDue: 0,
        transactionCount: transactions.length,
        customerCount: customers.length,
        averageTransactionValue: 0,
        topCustomers: [],
      };

      summary.totalDue = summary.totalRevenue - summary.totalDeposits;
      summary.averageTransactionValue =
        summary.totalRevenue / summary.transactionCount;

      // Calculate top customers
      const customerTotals = transactions.reduce((acc, t) => {
        if (!acc[t.customerId]) {
          acc[t.customerId] = 0;
        }
        acc[t.customerId] += t.total || 0;
        return acc;
      }, {});

      summary.topCustomers = Object.entries(customerTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([customerId, total]) => ({ customerId, total }));

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(BUDGETS.REPORT_GENERATION);
      expect(summary.transactionCount).toBe(1000);
      expect(summary.topCustomers.length).toBe(10);
    });

    test('should generate inventory report within budget', () => {
      const handle = performanceTracker.startOperation('inventoryReport');

      // Generate fabrics
      const fabrics = Array.from({ length: 200 }, () => {
        const fabric = generateFabric();
        fabric.batches = {
          batch1: generateBatch(),
          batch2: generateBatch(),
        };
        return fabric;
      });

      // Generate report
      const report = {
        totalFabrics: fabrics.length,
        totalValue: 0,
        totalQuantity: 0,
        lowStockCount: 0,
        byCategory: {},
        topValueFabrics: [],
      };

      fabrics.forEach((fabric) => {
        // Calculate fabric totals
        let fabricValue = 0;
        let fabricQuantity = 0;

        if (fabric.batches) {
          Object.values(fabric.batches).forEach((batch) => {
            if (batch.items) {
              batch.items.forEach((item) => {
                const qty = item.quantity || 0;
                fabricQuantity += qty;
                fabricValue += (batch.unitCost || 0) * qty;
              });
            }
          });
        }

        report.totalValue += fabricValue;
        report.totalQuantity += fabricQuantity;

        if (fabricQuantity < 10) {
          report.lowStockCount++;
        }

        // Group by category
        if (!report.byCategory[fabric.category]) {
          report.byCategory[fabric.category] = {
            count: 0,
            value: 0,
            quantity: 0,
          };
        }
        report.byCategory[fabric.category].count++;
        report.byCategory[fabric.category].value += fabricValue;
        report.byCategory[fabric.category].quantity += fabricQuantity;

        // Track for top fabrics
        fabric.totalValue = fabricValue;
      });

      // Get top value fabrics
      report.topValueFabrics = fabrics
        .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
        .slice(0, 10)
        .map((f) => ({ id: f.id, name: f.name, value: f.totalValue }));

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(BUDGETS.REPORT_GENERATION);
      expect(report.totalFabrics).toBe(200);
      expect(report.topValueFabrics.length).toBe(10);
    });
  });

  describe('Memoization Impact', () => {
    test('should demonstrate memoization performance improvement', () => {
      const transactions = Array.from({ length: 1000 }, () =>
        generateTransaction()
      );
      const customerId = 'test-customer';
      transactions.forEach((t) => (t.customerId = customerId));

      // Without memoization
      const handle1 = performanceTracker.startOperation('withoutMemoization');
      for (let i = 0; i < 10; i++) {
        transactions
          .filter((t) => t.customerId === customerId)
          .reduce((sum, t) => sum + ((t.total || 0) - (t.deposit || 0)), 0);
      }
      const metrics1 = performanceTracker.endOperation(handle1);

      // With memoization
      const handle2 = performanceTracker.startOperation('withMemoization');
      for (let i = 0; i < 10; i++) {
        memoizedCalculations.calculateCustomerDue(transactions, customerId);
      }
      const metrics2 = performanceTracker.endOperation(handle2);

      // Memoized version should be faster or equal (timing can vary with small datasets)
      expect(metrics2.duration).toBeLessThanOrEqual(metrics1.duration);
    });
  });

  describe('Pagination Impact', () => {
    test('should demonstrate pagination performance benefit', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 1000,
      }));

      // Without pagination - process all items
      const handle1 = performanceTracker.startOperation('withoutPagination');
      const allItems = items.map((item) => ({
        ...item,
        formatted: `${item.name}: $${item.value.toFixed(2)}`,
      }));
      const metrics1 = performanceTracker.endOperation(handle1);

      // With pagination - process only one page
      const handle2 = performanceTracker.startOperation('withPagination');
      const paginatedResult = paginate(items, 1, 20);
      const pageItems = paginatedResult.items.map((item) => ({
        ...item,
        formatted: `${item.name}: $${item.value.toFixed(2)}`,
      }));
      const metrics2 = performanceTracker.endOperation(handle2);

      // Paginated version should be faster or equal (timing can vary)
      expect(metrics2.duration).toBeLessThanOrEqual(metrics1.duration);
      expect(pageItems.length).toBe(20);
      expect(allItems.length).toBe(10000);
    });
  });
});
