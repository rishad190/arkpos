/**
 * Performance Benchmark Tests
 * Tests key operations against performance budgets
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { PerformanceTracker } from '@/lib/performanceTracker';
import { memoizedCalculations, memoize, memoizeAsync } from '@/lib/memoization';
import { paginate, filterAndPaginate, sortAndPaginate } from '@/lib/pagination';

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

// Performance budgets (in milliseconds)
const PERFORMANCE_BUDGETS = {
  TRANSACTION_CREATION: 1000,
  CUSTOMER_LIST_RENDER: 500,
  SEARCH_RESULTS: 300,
  CALCULATION: 100,
  PAGINATION: 50,
  MEMOIZATION_HIT: 10,
};

describe('Performance Benchmarks', () => {
  let performanceTracker;

  beforeEach(() => {
    performanceTracker = new PerformanceTracker();
  });

  afterEach(() => {
    performanceTracker.reset();
  });

  describe('Calculation Performance', () => {
    test('should calculate customer due within budget', () => {
      // Generate test data
      const transactions = Array.from({ length: 100 }, () =>
        generateTransaction()
      );
      const customerId = 'test-customer-1';
      transactions.forEach((t) => (t.customerId = customerId));

      const handle = performanceTracker.startOperation('calculateCustomerDue');

      // Perform calculation
      const due = transactions
        .filter((t) => t.customerId === customerId)
        .reduce((total, t) => total + ((t.total || 0) - (t.deposit || 0)), 0);

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.CALCULATION);
      expect(due).toBeGreaterThanOrEqual(0);
    });

    test('should calculate inventory totals within budget', () => {
      // Generate test data with batches
      const fabrics = Array.from({ length: 50 }, () => {
        const fabric = generateFabric();
        fabric.batches = {
          batch1: generateBatch(),
          batch2: generateBatch(),
        };
        return fabric;
      });

      const handle = performanceTracker.startOperation('calculateInventoryTotals');

      // Perform calculation
      let totalValue = 0;
      let totalQuantity = 0;

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
              });
            }
          });
        }
      });

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.CALCULATION);
      expect(totalQuantity).toBeGreaterThan(0);
    });

    test('should group transactions by memo within budget', () => {
      // Generate transactions with memo numbers
      const customerId = 'test-customer-1';
      const transactions = [];

      // Create 20 memos with 1-5 transactions each
      for (let i = 1; i <= 20; i++) {
        const memoNumber = `MEMO-${i}`;
        const saleTransaction = generateTransaction();
        saleTransaction.customerId = customerId;
        saleTransaction.memoNumber = memoNumber;
        saleTransaction.type = 'sale';
        transactions.push(saleTransaction);

        // Add 0-4 payment transactions
        const paymentCount = Math.floor(Math.random() * 5);
        for (let j = 0; j < paymentCount; j++) {
          const payment = generateTransaction();
          payment.customerId = customerId;
          payment.memoNumber = memoNumber;
          payment.type = 'payment';
          transactions.push(payment);
        }
      }

      const handle = performanceTracker.startOperation('groupTransactionsByMemo');

      // Perform grouping
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
          });
        }

        const memoGroup = memoMap.get(memoNumber);

        if (transaction.type === 'sale' || !transaction.type) {
          memoGroup.saleTransaction = transaction;
          memoGroup.totalAmount = transaction.total || 0;
          memoGroup.paidAmount = transaction.deposit || 0;
        } else if (transaction.type === 'payment') {
          memoGroup.paymentTransactions.push(transaction);
          memoGroup.paidAmount += transaction.deposit || transaction.amount || 0;
        }
      });

      const memoGroups = Array.from(memoMap.values());

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.CALCULATION);
      expect(memoGroups.length).toBe(20);
    });
  });

  describe('Pagination Performance', () => {
    test('should paginate small dataset within budget', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      const handle = performanceTracker.startOperation('paginateSmall');
      const result = paginate(items, 1, 20);
      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.PAGINATION);
      expect(result.items).toHaveLength(20);
      expect(result.pagination.totalPages).toBe(5);
    });

    test('should paginate large dataset within budget', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({ id: i }));

      const handle = performanceTracker.startOperation('paginateLarge');
      const result = paginate(items, 50, 20);
      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.PAGINATION);
      expect(result.items).toHaveLength(20);
      expect(result.pagination.totalPages).toBe(500);
    });

    test('should filter and paginate within budget', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        status: i % 2 === 0 ? 'active' : 'inactive',
      }));

      const handle = performanceTracker.startOperation('filterAndPaginate');
      const result = filterAndPaginate(
        items,
        (item) => item.status === 'active',
        1,
        20
      );
      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.PAGINATION);
      expect(result.items).toHaveLength(20);
    });

    test('should sort and paginate within budget', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${Math.random().toString(36).substr(2, 9)}`,
      }));

      const handle = performanceTracker.startOperation('sortAndPaginate');
      const result = sortAndPaginate(
        items,
        (a, b) => a.name.localeCompare(b.name),
        1,
        20
      );
      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.PAGINATION);
      expect(result.items).toHaveLength(20);
    });
  });

  describe('Memoization Performance', () => {
    test('should have fast cache hits', () => {
      const expensiveFn = jest.fn((x) => {
        // Simulate expensive calculation
        let result = 0;
        for (let i = 0; i < 10000; i++) {
          result += Math.sqrt(x * i);
        }
        return result;
      });

      const memoizedFn = memoize(expensiveFn);

      // First call - cache miss
      const handle1 = performanceTracker.startOperation('memoizeMiss');
      memoizedFn(42);
      const metrics1 = performanceTracker.endOperation(handle1);

      // Second call - cache hit
      const handle2 = performanceTracker.startOperation('memoizeHit');
      memoizedFn(42);
      const metrics2 = performanceTracker.endOperation(handle2);

      expect(expensiveFn).toHaveBeenCalledTimes(1);
      expect(metrics2.duration).toBeLessThan(PERFORMANCE_BUDGETS.MEMOIZATION_HIT);
      // Cache hit should be faster (allow for timing variance)
      expect(metrics2.duration).toBeLessThanOrEqual(metrics1.duration);
    });

    test('should have fast async cache hits', async () => {
      const expensiveAsyncFn = jest.fn(async (x) => {
        // Simulate async expensive calculation
        await new Promise((resolve) => setTimeout(resolve, 10));
        return x * 2;
      });

      const memoizedFn = memoizeAsync(expensiveAsyncFn);

      // First call - cache miss
      const handle1 = performanceTracker.startOperation('memoizeAsyncMiss');
      await memoizedFn(42);
      const metrics1 = performanceTracker.endOperation(handle1);

      // Second call - cache hit
      const handle2 = performanceTracker.startOperation('memoizeAsyncHit');
      await memoizedFn(42);
      const metrics2 = performanceTracker.endOperation(handle2);

      expect(expensiveAsyncFn).toHaveBeenCalledTimes(1);
      expect(metrics2.duration).toBeLessThan(PERFORMANCE_BUDGETS.MEMOIZATION_HIT);
      expect(metrics2.duration).toBeLessThan(metrics1.duration);
    });

    test('should handle cache eviction efficiently', () => {
      const fn = (x) => x * 2;
      const memoizedFn = memoize(fn, { maxSize: 10 });

      const handle = performanceTracker.startOperation('cacheEviction');

      // Fill cache beyond max size
      for (let i = 0; i < 20; i++) {
        memoizedFn(i);
      }

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.CALCULATION);
    });
  });

  describe('Search Performance', () => {
    test('should search customers within budget', () => {
      const customers = Array.from({ length: 1000 }, () => generateCustomer());

      const handle = performanceTracker.startOperation('searchCustomers');

      const searchTerm = 'test';
      const results = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm)
      );

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.SEARCH_RESULTS);
      expect(Array.isArray(results)).toBe(true);
    });

    test('should search transactions within budget', () => {
      const transactions = Array.from({ length: 5000 }, () =>
        generateTransaction()
      );

      const handle = performanceTracker.startOperation('searchTransactions');

      const customerId = 'test-customer-1';
      const results = transactions.filter((t) => t.customerId === customerId);

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.SEARCH_RESULTS);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Performance Tracker Overhead', () => {
    test('should have minimal overhead', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        const handle = performanceTracker.startOperation('test');
        performanceTracker.endOperation(handle);
      }

      const duration = Date.now() - start;
      const avgOverhead = duration / iterations;

      // Overhead should be less than 1ms per operation
      expect(avgOverhead).toBeLessThan(1);
    });

    test('should handle concurrent operations', () => {
      const handles = [];

      const handle = performanceTracker.startOperation('concurrentTest');

      // Start 100 concurrent operations
      for (let i = 0; i < 100; i++) {
        handles.push(performanceTracker.startOperation(`operation-${i}`));
      }

      // End all operations
      handles.forEach((h) => performanceTracker.endOperation(h));

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(100);
      expect(performanceTracker.getMetrics().summary.totalOperations).toBe(101);
    });
  });

  describe('Large Dataset Performance', () => {
    test('should handle 10,000 transactions efficiently', () => {
      const transactions = Array.from({ length: 10000 }, () =>
        generateTransaction()
      );

      const handle = performanceTracker.startOperation('largeDatasetProcessing');

      // Group by customer
      const byCustomer = transactions.reduce((acc, t) => {
        if (!acc[t.customerId]) {
          acc[t.customerId] = [];
        }
        acc[t.customerId].push(t);
        return acc;
      }, {});

      // Calculate totals
      const totals = Object.entries(byCustomer).map(([customerId, txns]) => ({
        customerId,
        total: txns.reduce((sum, t) => sum + (t.total || 0), 0),
        count: txns.length,
      }));

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.CALCULATION * 2);
      expect(totals.length).toBeGreaterThan(0);
    });

    test('should handle 1,000 fabrics with batches efficiently', () => {
      const fabrics = Array.from({ length: 1000 }, () => {
        const fabric = generateFabric();
        fabric.batches = {
          batch1: generateBatch(),
          batch2: generateBatch(),
          batch3: generateBatch(),
        };
        return fabric;
      });

      const handle = performanceTracker.startOperation('largeFabricProcessing');

      // Calculate inventory statistics
      const stats = fabrics.reduce(
        (acc, fabric) => {
          acc.totalFabrics++;
          if (fabric.batches) {
            Object.values(fabric.batches).forEach((batch) => {
              acc.totalBatches++;
              if (batch.items) {
                batch.items.forEach((item) => {
                  acc.totalItems++;
                  acc.totalQuantity += item.quantity || 0;
                });
              }
            });
          }
          return acc;
        },
        { totalFabrics: 0, totalBatches: 0, totalItems: 0, totalQuantity: 0 }
      );

      const metrics = performanceTracker.endOperation(handle);

      expect(metrics.duration).toBeLessThan(PERFORMANCE_BUDGETS.CALCULATION * 3);
      expect(stats.totalFabrics).toBe(1000);
    });
  });

  describe('Performance Budget Compliance', () => {
    test('should track slow operation percentage', () => {
      // Simulate mix of fast and slow operations
      for (let i = 0; i < 100; i++) {
        const handle = performanceTracker.startOperation('mixedOperation');
        // Simulate varying durations
        const delay = i < 95 ? 10 : 3000; // 5% slow operations
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Busy wait
        }
        performanceTracker.endOperation(handle);
      }

      const metrics = performanceTracker.getMetrics();
      const slowPercentage = metrics.summary.slowOperationPercentage;

      // Should be close to 5%
      expect(slowPercentage).toBeGreaterThan(0);
      expect(slowPercentage).toBeLessThan(10);
    });

    test('should identify bottlenecks', () => {
      // Create operations with different performance characteristics
      for (let i = 0; i < 50; i++) {
        const handle = performanceTracker.startOperation('fastOperation');
        performanceTracker.endOperation(handle);
      }

      for (let i = 0; i < 10; i++) {
        const handle = performanceTracker.startOperation('slowOperation');
        const start = Date.now();
        while (Date.now() - start < 5500) {
          // Busy wait to simulate very slow operation (> 5000ms threshold)
        }
        performanceTracker.endOperation(handle);
      }

      const bottlenecks = performanceTracker.identifyBottlenecks();

      expect(bottlenecks.length).toBeGreaterThan(0);
      const slowBottleneck = bottlenecks.find(
        (b) => b.operationName === 'slowOperation'
      );
      expect(slowBottleneck).toBeDefined();
      expect(slowBottleneck.severity).toBe('high');
    });
  });
});
