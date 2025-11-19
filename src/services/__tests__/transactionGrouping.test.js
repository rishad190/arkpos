/**
 * Property-Based Tests for Transaction Grouping
 * Feature: codebase-improvements, Property 22: Transactions are grouped by memo
 * Validates: Requirements 11.1
 */

import * as fc from 'fast-check';
import { TransactionService } from '../transactionService';

// Mock dependencies
const mockDb = {};
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
const mockAtomicOperations = {
  execute: jest.fn((name, fn) => fn()),
};

describe('Property 22: Transactions are grouped by memo', () => {
  let transactionService;

  beforeEach(() => {
    transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
    jest.clearAllMocks();
  });

  /**
   * Generator for a transaction with specific memo and customer
   */
  const transactionWithMemoGenerator = (customerId, memoNumber, type = 'sale') => {
    return fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      customerId: fc.constant(customerId),
      memoNumber: fc.constant(memoNumber),
      type: fc.constant(type),
      total: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
      deposit: fc.float({ min: Math.fround(0), max: Math.fround(5000), noNaN: true }).map(n => Math.round(n * 100) / 100),
      date: fc.integer({ min: 0, max: 365 * 5 }).map(days => {
        const date = new Date('2020-01-01');
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
      }),
      createdAt: fc.integer({ min: 0, max: 365 * 5 }).map(days => {
        const date = new Date('2020-01-01');
        date.setDate(date.getDate() + days);
        return date.toISOString();
      }),
      products: fc.array(
        fc.record({
          fabricId: fc.string({ minLength: 1 }),
          fabricName: fc.string({ minLength: 1, maxLength: 50 }),
          colorName: fc.string({ minLength: 1, maxLength: 30 }),
          quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }).map(n => Math.round(n * 100) / 100),
          rate: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }).map(n => Math.round(n * 100) / 100),
        }),
        { minLength: 0, maxLength: 5 }
      ),
    });
  };

  /**
   * Generator for a customer with multiple memos
   */
  const customerWithMemosGenerator = () => {
    return fc.record({
      customerId: fc.string({ minLength: 1, maxLength: 20 }),
      memoCount: fc.integer({ min: 1, max: 10 }),
    }).chain(({ customerId, memoCount }) => {
      // Generate unique memo numbers
      return fc.array(
        fc.string({ minLength: 1, maxLength: 20 }),
        { minLength: memoCount, maxLength: memoCount }
      ).map(memos => {
        // Make memo numbers unique
        const uniqueMemos = [...new Set(memos)];
        while (uniqueMemos.length < memoCount) {
          uniqueMemos.push(`memo-${uniqueMemos.length}`);
        }
        return { customerId, memoNumbers: uniqueMemos.slice(0, memoCount) };
      });
    });
  };

  /**
   * Generator for transactions across multiple memos for a customer
   */
  const multiMemoTransactionsGenerator = () => {
    return customerWithMemosGenerator().chain(({ customerId, memoNumbers }) => {
      // For each memo, generate a sale transaction and optionally some payment transactions
      const memoGenerators = memoNumbers.map(memoNumber => {
        return fc.record({
          paymentCount: fc.integer({ min: 0, max: 3 }),
        }).chain(({ paymentCount }) => {
          return fc.tuple(
            transactionWithMemoGenerator(customerId, memoNumber, 'sale'),
            fc.array(
              transactionWithMemoGenerator(customerId, memoNumber, 'payment'),
              { minLength: paymentCount, maxLength: paymentCount }
            )
          ).map(([saleTransaction, payments]) => ({
            memoNumber,
            saleTransaction,
            payments,
          }));
        });
      });

      return fc.tuple(...memoGenerators).map(memoData => {
        // Flatten all transactions
        const allTransactions = [];
        memoData.forEach(({ saleTransaction, payments }) => {
          allTransactions.push(saleTransaction);
          allTransactions.push(...payments);
        });
        return {
          customerId,
          memoNumbers,
          transactions: allTransactions,
          expectedMemoCount: memoNumbers.length,
        };
      });
    });
  };

  it('should group all transactions by their memo number', () => {
    fc.assert(
      fc.property(multiMemoTransactionsGenerator(), ({ customerId, memoNumbers, transactions, expectedMemoCount }) => {
        // Action: Group transactions by memo
        const memoGroups = transactionService.getCustomerTransactionsByMemo(customerId, transactions);

        // Property 1: The number of memo groups should equal the number of unique memos
        expect(memoGroups.length).toBe(expectedMemoCount);

        // Property 2: Each memo group should have the correct memo number
        const groupedMemoNumbers = memoGroups.map(g => g.memoNumber);
        expect(groupedMemoNumbers.sort()).toEqual(memoNumbers.sort());

        // Property 3: Each transaction should appear in exactly one memo group
        const transactionsInGroups = memoGroups.flatMap(group => {
          const txns = [];
          if (group.saleTransaction) txns.push(group.saleTransaction);
          txns.push(...group.paymentTransactions);
          return txns;
        });

        // Count transactions by memo in original data
        const originalMemoTransactionCounts = Object.create(null);
        transactions.forEach(txn => {
          if (txn.memoNumber) {
            originalMemoTransactionCounts[txn.memoNumber] = (originalMemoTransactionCounts[txn.memoNumber] || 0) + 1;
          }
        });

        // Count transactions by memo in grouped data
        const groupedMemoTransactionCounts = Object.create(null);
        memoGroups.forEach(group => {
          const count = (group.saleTransaction ? 1 : 0) + group.paymentTransactions.length;
          groupedMemoTransactionCounts[group.memoNumber] = count;
        });

        // Property 4: Transaction counts should match
        expect(groupedMemoTransactionCounts).toEqual(originalMemoTransactionCounts);

        // Property 5: Each memo group should have the correct customerId
        memoGroups.forEach(group => {
          expect(group.customerId).toBe(customerId);
        });

        // Property 6: Sale transactions should be correctly identified
        memoGroups.forEach(group => {
          const originalSale = transactions.find(t => t.memoNumber === group.memoNumber && (t.type === 'sale' || !t.type));
          if (originalSale) {
            expect(group.saleTransaction).toBeDefined();
            expect(group.saleTransaction.id).toBe(originalSale.id);
          }
        });

        // Property 7: Payment transactions should be correctly grouped
        memoGroups.forEach(group => {
          const originalPayments = transactions.filter(t => t.memoNumber === group.memoNumber && t.type === 'payment');
          expect(group.paymentTransactions.length).toBe(originalPayments.length);
          
          const paymentIds = group.paymentTransactions.map(p => p.id).sort();
          const originalPaymentIds = originalPayments.map(p => p.id).sort();
          expect(paymentIds).toEqual(originalPaymentIds);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should handle transactions without memo numbers', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          transactionsWithMemo: fc.array(
            transactionWithMemoGenerator('cust1', 'memo1', 'sale'),
            { minLength: 1, maxLength: 5 }
          ),
          transactionsWithoutMemo: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              customerId: fc.constant('cust1'),
              memoNumber: fc.constant(undefined),
              type: fc.constantFrom('sale', 'payment'),
              total: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
              deposit: fc.float({ min: Math.fround(0), max: Math.fround(500), noNaN: true }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
        }),
        ({ customerId, transactionsWithMemo, transactionsWithoutMemo }) => {
          const allTransactions = [...transactionsWithMemo, ...transactionsWithoutMemo];

          // Action: Group transactions
          const memoGroups = transactionService.getCustomerTransactionsByMemo(customerId, allTransactions);

          // Property: Only transactions with memo numbers should be grouped
          const transactionsInGroups = memoGroups.flatMap(group => {
            const txns = [];
            if (group.saleTransaction) txns.push(group.saleTransaction);
            txns.push(...group.paymentTransactions);
            return txns;
          });

          // All transactions in groups should have memo numbers
          transactionsInGroups.forEach(txn => {
            expect(txn.memoNumber).toBeDefined();
            expect(txn.memoNumber).not.toBe('');
          });

          // Transactions without memo numbers should not appear in groups
          const groupedIds = transactionsInGroups.map(t => t.id);
          transactionsWithoutMemo.forEach(txn => {
            expect(groupedIds).not.toContain(txn.id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate correct due amounts for each memo group', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
          initialDeposit: fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }).map(n => Math.round(n * 100) / 100),
          paymentAmounts: fc.array(
            fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }).map(n => Math.round(n * 100) / 100),
            { minLength: 0, maxLength: 5 }
          ),
        }),
        ({ customerId, memoNumber, saleTotal, initialDeposit, paymentAmounts }) => {
          // Create sale transaction
          const saleTransaction = {
            id: 'sale-1',
            customerId,
            memoNumber,
            type: 'sale',
            total: saleTotal,
            deposit: initialDeposit,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          };

          // Create payment transactions
          const paymentTransactions = paymentAmounts.map((amount, index) => ({
            id: `payment-${index + 1}`,
            customerId,
            memoNumber,
            type: 'payment',
            total: 0,
            deposit: amount,
            amount: amount,
            date: `2024-01-${String(index + 2).padStart(2, '0')}`,
            createdAt: `2024-01-${String(index + 2).padStart(2, '0')}T00:00:00Z`,
          }));

          const allTransactions = [saleTransaction, ...paymentTransactions];

          // Action: Group transactions
          const memoGroups = transactionService.getCustomerTransactionsByMemo(customerId, allTransactions);

          // Property: Should have exactly one memo group
          expect(memoGroups.length).toBe(1);

          const memoGroup = memoGroups[0];

          // Property: Total amount should equal sale total
          expect(memoGroup.totalAmount).toBeCloseTo(saleTotal, 2);

          // Property: Paid amount should equal initial deposit plus all payments
          const expectedPaidAmount = initialDeposit + paymentAmounts.reduce((sum, amt) => sum + amt, 0);
          expect(memoGroup.paidAmount).toBeCloseTo(expectedPaidAmount, 2);

          // Property: Due amount should equal total minus paid
          const expectedDueAmount = saleTotal - expectedPaidAmount;
          expect(memoGroup.dueAmount).toBeCloseTo(expectedDueAmount, 2);

          // Property: Status should be correct based on due amount
          if (memoGroup.dueAmount <= 0) {
            expect(memoGroup.status).toBe('paid');
          } else if (memoGroup.paidAmount > 0) {
            expect(memoGroup.status).toBe('partial');
          } else {
            expect(memoGroup.status).toBe('unpaid');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only group transactions for the specified customer', () => {
    fc.assert(
      fc.property(
        fc.record({
          targetCustomerId: fc.string({ minLength: 1, maxLength: 20 }),
          otherCustomerIds: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { minLength: 1, maxLength: 3 }
          ),
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        ({ targetCustomerId, otherCustomerIds, memoNumber }) => {
          // Ensure other customer IDs are different from target
          const uniqueOtherIds = otherCustomerIds.filter(id => id !== targetCustomerId);
          if (uniqueOtherIds.length === 0) {
            uniqueOtherIds.push(`${targetCustomerId}-other`);
          }

          // Create transactions for target customer
          const targetTransactions = [
            {
              id: 'target-1',
              customerId: targetCustomerId,
              memoNumber,
              type: 'sale',
              total: 100,
              deposit: 50,
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ];

          // Create transactions for other customers with same memo number
          const otherTransactions = uniqueOtherIds.map((customerId, index) => ({
            id: `other-${index}`,
            customerId,
            memoNumber, // Same memo number!
            type: 'sale',
            total: 200,
            deposit: 100,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
          }));

          const allTransactions = [...targetTransactions, ...otherTransactions];

          // Action: Group transactions for target customer only
          const memoGroups = transactionService.getCustomerTransactionsByMemo(targetCustomerId, allTransactions);

          // Property: All memo groups should belong to target customer
          memoGroups.forEach(group => {
            expect(group.customerId).toBe(targetCustomerId);
          });

          // Property: No transactions from other customers should appear
          const transactionsInGroups = memoGroups.flatMap(group => {
            const txns = [];
            if (group.saleTransaction) txns.push(group.saleTransaction);
            txns.push(...group.paymentTransactions);
            return txns;
          });

          transactionsInGroups.forEach(txn => {
            expect(txn.customerId).toBe(targetCustomerId);
          });

          // Property: Should only have transactions from target customer
          expect(transactionsInGroups.length).toBe(targetTransactions.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when customer has no transactions', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          otherTransactions: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              customerId: fc.string({ minLength: 1, maxLength: 20 }),
              memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.constantFrom('sale', 'payment'),
              total: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
              deposit: fc.float({ min: Math.fround(0), max: Math.fround(500), noNaN: true }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
        }).filter(({ customerId, otherTransactions }) => {
          // Ensure no transactions belong to the target customer
          return !otherTransactions.some(t => t.customerId === customerId);
        }),
        ({ customerId, otherTransactions }) => {
          // Action: Group transactions for customer with no transactions
          const memoGroups = transactionService.getCustomerTransactionsByMemo(customerId, otherTransactions);

          // Property: Should return empty array
          expect(memoGroups).toEqual([]);
          expect(memoGroups.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Memo Due Display
 * Feature: codebase-improvements, Property 23: Memos with dues are displayed
 * Validates: Requirements 11.2
 */
describe('Property 23: Memos with dues are displayed', () => {
  let transactionService;

  beforeEach(() => {
    transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
    jest.clearAllMocks();
  });

  /**
   * Generator for a memo with a specific due amount
   */
  const memoWithDueGenerator = (customerId, memoNumber, dueAmount) => {
    return fc.record({
      saleTotal: fc.float({ min: Math.fround(dueAmount + 1), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
    }).map(({ saleTotal }) => {
      // Calculate deposit to achieve the desired due amount
      const deposit = Math.max(0, Math.round((saleTotal - dueAmount) * 100) / 100);
      const actualDue = Math.round((saleTotal - deposit) * 100) / 100;
      
      return {
        saleTransaction: {
          id: `sale-${memoNumber}`,
          customerId: customerId,
          memoNumber: memoNumber,
          type: 'sale',
          total: saleTotal,
          deposit: deposit,
          date: '2024-01-01',
          createdAt: '2024-01-01T00:00:00Z',
          products: [],
        },
        expectedDue: actualDue,
      };
    });
  };

  it('should include all memos with due amount greater than zero', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          memosWithDues: fc.array(
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 20 }), // memo number
              fc.float({ min: Math.fround(0.01), max: Math.fround(5000), noNaN: true }).map(n => Math.round(n * 100) / 100) // due amount > 0
            ),
            { minLength: 1, maxLength: 10 }
          ),
        }).chain(({ customerId, memosWithDues }) => {
          // Make memo numbers unique
          const uniqueMemos = new Map();
          memosWithDues.forEach(([memo, due]) => {
            if (!uniqueMemos.has(memo)) {
              uniqueMemos.set(memo, due);
            }
          });

          // Generate transactions for each memo
          const memoGenerators = Array.from(uniqueMemos.entries()).map(([memoNumber, dueAmount]) => {
            return memoWithDueGenerator(customerId, memoNumber, dueAmount);
          });

          return fc.tuple(...memoGenerators).map(memoData => ({
            customerId,
            transactions: memoData.flatMap(({ saleTransaction }) => [saleTransaction]),
            expectedMemosWithDues: memoData.map(({ saleTransaction, expectedDue }) => ({
              memoNumber: saleTransaction.memoNumber,
              expectedDue,
            })),
          }));
        }),
        ({ customerId, transactions, expectedMemosWithDues }) => {
          // Action: Get memos with dues
          const memosWithDues = transactionService.getCustomerMemosWithDues(customerId, transactions);

          // Property 1: All memos with due > 0 should be included
          expect(memosWithDues.length).toBe(expectedMemosWithDues.length);

          // Property 2: Each memo should have the correct due amount
          expectedMemosWithDues.forEach(({ memoNumber, expectedDue }) => {
            const memo = memosWithDues.find(m => m.memoNumber === memoNumber);
            expect(memo).toBeDefined();
            expect(memo.dueAmount).toBeGreaterThan(0);
            expect(memo.dueAmount).toBeCloseTo(expectedDue, 2);
          });

          // Property 3: All returned memos should have due > 0
          memosWithDues.forEach(memo => {
            expect(memo.dueAmount).toBeGreaterThan(0);
          });

          // Property 4: All returned memos should belong to the customer
          memosWithDues.forEach(memo => {
            expect(memo.customerId).toBe(customerId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude memos with zero or negative due amounts', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          paidMemos: fc.array(
            fc.record({
              memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
              saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
            }).chain(({ memoNumber, saleTotal }) => {
              // Generate deposit >= saleTotal to ensure due <= 0
              return fc.record({
                memoNumber: fc.constant(memoNumber),
                saleTotal: fc.constant(saleTotal),
                deposit: fc.float({ min: Math.fround(saleTotal), max: Math.fround(saleTotal * 1.5), noNaN: true }).map(n => Math.round(n * 100) / 100),
              });
            }),
            { minLength: 1, maxLength: 5 }
          ),
          unpaidMemos: fc.array(
            fc.record({
              memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
              saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
            }).chain(({ memoNumber, saleTotal }) => {
              // Generate deposit < saleTotal to ensure due > 0
              return fc.record({
                memoNumber: fc.constant(memoNumber),
                saleTotal: fc.constant(saleTotal),
                deposit: fc.float({ min: Math.fround(0), max: Math.fround(saleTotal * 0.99), noNaN: true }).map(n => Math.round(n * 100) / 100),
              });
            }),
            { minLength: 0, maxLength: 5 }
          ),
        }).map(({ customerId, paidMemos, unpaidMemos }) => {
          // Ensure memo numbers are unique across both arrays
          const allMemoNumbers = new Set();
          const uniquePaidMemos = paidMemos.filter(m => {
            if (allMemoNumbers.has(m.memoNumber)) return false;
            allMemoNumbers.add(m.memoNumber);
            return true;
          });
          const uniqueUnpaidMemos = unpaidMemos.filter(m => {
            if (allMemoNumbers.has(m.memoNumber)) return false;
            allMemoNumbers.add(m.memoNumber);
            return true;
          });

          return { customerId, paidMemos: uniquePaidMemos, unpaidMemos: uniqueUnpaidMemos };
        }),
        ({ customerId, paidMemos, unpaidMemos }) => {
          // Create transactions
          const transactions = [];

          // Add paid memo transactions (due <= 0)
          paidMemos.forEach(({ memoNumber, saleTotal, deposit }) => {
            transactions.push({
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: saleTotal,
              deposit,
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            });
          });

          // Add unpaid memo transactions (due > 0)
          unpaidMemos.forEach(({ memoNumber, saleTotal, deposit }) => {
            transactions.push({
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: saleTotal,
              deposit,
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            });
          });

          // Action: Get memos with dues
          const memosWithDues = transactionService.getCustomerMemosWithDues(customerId, transactions);

          // Property 1: Only unpaid memos should be returned
          expect(memosWithDues.length).toBe(unpaidMemos.length);

          // Property 2: No paid memos should be in the result
          const returnedMemoNumbers = memosWithDues.map(m => m.memoNumber);
          paidMemos.forEach(({ memoNumber }) => {
            expect(returnedMemoNumbers).not.toContain(memoNumber);
          });

          // Property 3: All unpaid memos should be in the result
          unpaidMemos.forEach(({ memoNumber }) => {
            expect(returnedMemoNumbers).toContain(memoNumber);
          });

          // Property 4: All returned memos should have due > 0
          memosWithDues.forEach(memo => {
            expect(memo.dueAmount).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display correct outstanding balance for each memo with dues', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
          initialDeposit: fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }).map(n => Math.round(n * 100) / 100),
          paymentAmounts: fc.array(
            fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }).map(n => Math.round(n * 100) / 100),
            { minLength: 0, maxLength: 5 }
          ),
        }).filter(({ saleTotal, initialDeposit, paymentAmounts }) => {
          // Ensure there's still a due amount after all payments
          const totalPaid = initialDeposit + paymentAmounts.reduce((sum, amt) => sum + amt, 0);
          return totalPaid < saleTotal;
        }),
        ({ customerId, memoNumber, saleTotal, initialDeposit, paymentAmounts }) => {
          // Create sale transaction
          const saleTransaction = {
            id: 'sale-1',
            customerId,
            memoNumber,
            type: 'sale',
            total: saleTotal,
            deposit: initialDeposit,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          };

          // Create payment transactions
          const paymentTransactions = paymentAmounts.map((amount, index) => ({
            id: `payment-${index + 1}`,
            customerId,
            memoNumber,
            type: 'payment',
            total: 0,
            deposit: amount,
            amount: amount,
            date: `2024-01-${String(index + 2).padStart(2, '0')}`,
            createdAt: `2024-01-${String(index + 2).padStart(2, '0')}T00:00:00Z`,
          }));

          const allTransactions = [saleTransaction, ...paymentTransactions];

          // Calculate expected due
          const expectedDue = saleTotal - initialDeposit - paymentAmounts.reduce((sum, amt) => sum + amt, 0);

          // Action: Get memos with dues
          const memosWithDues = transactionService.getCustomerMemosWithDues(customerId, allTransactions);

          // Property 1: Should have exactly one memo
          expect(memosWithDues.length).toBe(1);

          const memo = memosWithDues[0];

          // Property 2: Memo should have correct memo number
          expect(memo.memoNumber).toBe(memoNumber);

          // Property 3: Outstanding balance should be correct
          expect(memo.dueAmount).toBeCloseTo(expectedDue, 2);
          expect(memo.dueAmount).toBeGreaterThan(0);

          // Property 4: Total amount should match sale total
          expect(memo.totalAmount).toBeCloseTo(saleTotal, 2);

          // Property 5: Paid amount should match total payments
          const expectedPaid = initialDeposit + paymentAmounts.reduce((sum, amt) => sum + amt, 0);
          expect(memo.paidAmount).toBeCloseTo(expectedPaid, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when all memos are fully paid', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          fullyPaidMemos: fc.array(
            fc.record({
              memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
              saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }).map(({ customerId, fullyPaidMemos }) => {
          // Ensure unique memo numbers
          const uniqueMemos = [];
          const seenMemos = new Set();
          fullyPaidMemos.forEach(memo => {
            if (!seenMemos.has(memo.memoNumber)) {
              seenMemos.add(memo.memoNumber);
              uniqueMemos.push(memo);
            }
          });
          return { customerId, fullyPaidMemos: uniqueMemos };
        }),
        ({ customerId, fullyPaidMemos }) => {
          // Create transactions where deposit equals or exceeds total
          const transactions = fullyPaidMemos.map(({ memoNumber, saleTotal }) => ({
            id: `sale-${memoNumber}`,
            customerId,
            memoNumber,
            type: 'sale',
            total: saleTotal,
            deposit: saleTotal, // Fully paid
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          }));

          // Action: Get memos with dues
          const memosWithDues = transactionService.getCustomerMemosWithDues(customerId, transactions);

          // Property: Should return empty array
          expect(memosWithDues).toEqual([]);
          expect(memosWithDues.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle mix of paid and unpaid memos correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          paidCount: fc.integer({ min: 1, max: 5 }),
          unpaidCount: fc.integer({ min: 1, max: 5 }),
        }).chain(({ customerId, paidCount, unpaidCount }) => {
          return fc.record({
            customerId: fc.constant(customerId),
            paidMemos: fc.array(
              fc.record({
                memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
                saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
              }),
              { minLength: paidCount, maxLength: paidCount }
            ),
            unpaidMemos: fc.array(
              fc.record({
                memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
                saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
                deposit: fc.float({ min: Math.fround(0), max: Math.fround(99), noNaN: true }).map(n => Math.round(n * 100) / 100),
              }),
              { minLength: unpaidCount, maxLength: unpaidCount }
            ),
          });
        }).map(({ customerId, paidMemos, unpaidMemos }) => {
          // Ensure all memo numbers are unique
          const allMemoNumbers = new Set();
          const uniquePaidMemos = paidMemos.filter(m => {
            if (allMemoNumbers.has(m.memoNumber)) return false;
            allMemoNumbers.add(m.memoNumber);
            return true;
          });
          const uniqueUnpaidMemos = unpaidMemos.filter(m => {
            if (allMemoNumbers.has(m.memoNumber)) return false;
            allMemoNumbers.add(m.memoNumber);
            return true;
          });

          return { customerId, paidMemos: uniquePaidMemos, unpaidMemos: uniqueUnpaidMemos };
        }),
        ({ customerId, paidMemos, unpaidMemos }) => {
          const transactions = [];

          // Add fully paid memos
          paidMemos.forEach(({ memoNumber, saleTotal }) => {
            transactions.push({
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: saleTotal,
              deposit: saleTotal, // Fully paid
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            });
          });

          // Add unpaid memos
          unpaidMemos.forEach(({ memoNumber, saleTotal, deposit }) => {
            transactions.push({
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: saleTotal,
              deposit,
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            });
          });

          // Action: Get memos with dues
          const memosWithDues = transactionService.getCustomerMemosWithDues(customerId, transactions);

          // Property 1: Should only return unpaid memos
          expect(memosWithDues.length).toBe(unpaidMemos.length);

          // Property 2: All returned memos should be from unpaid list
          const returnedMemoNumbers = memosWithDues.map(m => m.memoNumber);
          unpaidMemos.forEach(({ memoNumber }) => {
            expect(returnedMemoNumbers).toContain(memoNumber);
          });

          // Property 3: No paid memos should be returned
          paidMemos.forEach(({ memoNumber }) => {
            expect(returnedMemoNumbers).not.toContain(memoNumber);
          });

          // Property 4: All returned memos should have due > 0
          memosWithDues.forEach(memo => {
            expect(memo.dueAmount).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Memo Payment Retrieval
 * Feature: codebase-improvements, Property 24: Memo details include all payments
 * Validates: Requirements 11.3
 */
describe('Property 24: Memo details include all payments', () => {
  let transactionService;

  beforeEach(() => {
    transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
    jest.clearAllMocks();
  });

  /**
   * Generator for a memo with sale and multiple payments
   */
  const memoWithPaymentsGenerator = () => {
    return fc.record({
      memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
      customerId: fc.string({ minLength: 1, maxLength: 20 }),
      saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
      initialDeposit: fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }).map(n => Math.round(n * 100) / 100),
      paymentCount: fc.integer({ min: 0, max: 10 }),
    }).chain(({ memoNumber, customerId, saleTotal, initialDeposit, paymentCount }) => {
      // Generate payment amounts
      return fc.array(
        fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true }).map(n => Math.round(n * 100) / 100),
        { minLength: paymentCount, maxLength: paymentCount }
      ).map(paymentAmounts => {
        // Create sale transaction
        const saleTransaction = {
          id: `sale-${memoNumber}`,
          customerId,
          memoNumber,
          type: 'sale',
          total: saleTotal,
          deposit: initialDeposit,
          date: '2024-01-01',
          createdAt: '2024-01-01T00:00:00Z',
          products: [],
        };

        // Create payment transactions
        const paymentTransactions = paymentAmounts.map((amount, index) => ({
          id: `payment-${memoNumber}-${index + 1}`,
          customerId,
          memoNumber,
          type: 'payment',
          amount: amount,
          deposit: amount,
          total: 0,
          date: `2024-01-${String(index + 2).padStart(2, '0')}`,
          createdAt: `2024-01-${String(index + 2).padStart(2, '0')}T00:00:00Z`,
        }));

        return {
          memoNumber,
          customerId,
          saleTransaction,
          paymentTransactions,
          allTransactions: [saleTransaction, ...paymentTransactions],
          expectedPaymentCount: paymentCount,
        };
      });
    });
  };

  it('should include all payment transactions for a memo', () => {
    fc.assert(
      fc.property(
        memoWithPaymentsGenerator(),
        ({ memoNumber, saleTransaction, paymentTransactions, allTransactions, expectedPaymentCount }) => {
          // Action: Get memo details
          const memoDetails = transactionService.getMemoDetails(memoNumber, allTransactions);

          // Property 1: Memo details should be returned
          expect(memoDetails).not.toBeNull();
          expect(memoDetails).toBeDefined();

          // Property 2: Memo number should match
          expect(memoDetails.memoNumber).toBe(memoNumber);

          // Property 3: Sale transaction should be included
          expect(memoDetails.saleTransaction).toBeDefined();
          expect(memoDetails.saleTransaction.id).toBe(saleTransaction.id);

          // Property 4: All payment transactions should be included
          expect(memoDetails.paymentTransactions).toBeDefined();
          expect(memoDetails.paymentTransactions.length).toBe(expectedPaymentCount);

          // Property 5: Payment transaction IDs should match
          const returnedPaymentIds = memoDetails.paymentTransactions.map(p => p.id).sort();
          const expectedPaymentIds = paymentTransactions.map(p => p.id).sort();
          expect(returnedPaymentIds).toEqual(expectedPaymentIds);

          // Property 6: Each payment transaction should have the correct memo number
          memoDetails.paymentTransactions.forEach(payment => {
            expect(payment.memoNumber).toBe(memoNumber);
            expect(payment.type).toBe('payment');
          });

          // Property 7: No transactions should be missing
          const allReturnedTransactionIds = [
            memoDetails.saleTransaction.id,
            ...memoDetails.paymentTransactions.map(p => p.id)
          ].sort();
          const allExpectedTransactionIds = allTransactions.map(t => t.id).sort();
          expect(allReturnedTransactionIds).toEqual(allExpectedTransactionIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all payments even when there are many', () => {
    fc.assert(
      fc.property(
        fc.record({
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          paymentCount: fc.integer({ min: 5, max: 20 }), // Many payments
        }).chain(({ memoNumber, customerId, paymentCount }) => {
          return fc.array(
            fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }).map(n => Math.round(n * 100) / 100),
            { minLength: paymentCount, maxLength: paymentCount }
          ).map(paymentAmounts => {
            const saleTransaction = {
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: 10000,
              deposit: 100,
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            };

            const paymentTransactions = paymentAmounts.map((amount, index) => ({
              id: `payment-${memoNumber}-${index + 1}`,
              customerId,
              memoNumber,
              type: 'payment',
              amount: amount,
              deposit: amount,
              total: 0,
              date: `2024-01-${String((index % 28) + 2).padStart(2, '0')}`,
              createdAt: `2024-01-${String((index % 28) + 2).padStart(2, '0')}T00:00:00Z`,
            }));

            return {
              memoNumber,
              allTransactions: [saleTransaction, ...paymentTransactions],
              expectedPaymentCount: paymentCount,
            };
          });
        }),
        ({ memoNumber, allTransactions, expectedPaymentCount }) => {
          // Action: Get memo details
          const memoDetails = transactionService.getMemoDetails(memoNumber, allTransactions);

          // Property: All payments should be included, no matter how many
          expect(memoDetails).not.toBeNull();
          expect(memoDetails.paymentTransactions.length).toBe(expectedPaymentCount);

          // Property: Each payment should be unique
          const paymentIds = memoDetails.paymentTransactions.map(p => p.id);
          const uniquePaymentIds = new Set(paymentIds);
          expect(uniquePaymentIds.size).toBe(expectedPaymentCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle memos with no payments', () => {
    fc.assert(
      fc.property(
        fc.record({
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
          initialDeposit: fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }).map(n => Math.round(n * 100) / 100),
        }),
        ({ memoNumber, customerId, saleTotal, initialDeposit }) => {
          const saleTransaction = {
            id: `sale-${memoNumber}`,
            customerId,
            memoNumber,
            type: 'sale',
            total: saleTotal,
            deposit: initialDeposit,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          };

          const allTransactions = [saleTransaction];

          // Action: Get memo details
          const memoDetails = transactionService.getMemoDetails(memoNumber, allTransactions);

          // Property 1: Memo details should be returned
          expect(memoDetails).not.toBeNull();

          // Property 2: Payment transactions should be an empty array
          expect(memoDetails.paymentTransactions).toBeDefined();
          expect(memoDetails.paymentTransactions).toEqual([]);
          expect(memoDetails.paymentTransactions.length).toBe(0);

          // Property 3: Sale transaction should still be included
          expect(memoDetails.saleTransaction).toBeDefined();
          expect(memoDetails.saleTransaction.id).toBe(saleTransaction.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not include payments from other memos', () => {
    fc.assert(
      fc.property(
        fc.record({
          targetMemoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          otherMemoNumbers: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { minLength: 1, maxLength: 5 }
          ),
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
        }).map(({ targetMemoNumber, otherMemoNumbers, customerId }) => {
          // Ensure other memo numbers are different from target
          const uniqueOtherMemos = otherMemoNumbers.filter(m => m !== targetMemoNumber);
          if (uniqueOtherMemos.length === 0) {
            uniqueOtherMemos.push(`${targetMemoNumber}-other`);
          }
          return { targetMemoNumber, otherMemoNumbers: uniqueOtherMemos, customerId };
        }),
        ({ targetMemoNumber, otherMemoNumbers, customerId }) => {
          // Create sale and payments for target memo
          const targetSale = {
            id: `sale-${targetMemoNumber}`,
            customerId,
            memoNumber: targetMemoNumber,
            type: 'sale',
            total: 1000,
            deposit: 100,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          };

          const targetPayments = [
            {
              id: `payment-${targetMemoNumber}-1`,
              customerId,
              memoNumber: targetMemoNumber,
              type: 'payment',
              amount: 200,
              deposit: 200,
              total: 0,
              date: '2024-01-02',
              createdAt: '2024-01-02T00:00:00Z',
            },
            {
              id: `payment-${targetMemoNumber}-2`,
              customerId,
              memoNumber: targetMemoNumber,
              type: 'payment',
              amount: 300,
              deposit: 300,
              total: 0,
              date: '2024-01-03',
              createdAt: '2024-01-03T00:00:00Z',
            },
          ];

          // Create transactions for other memos
          const otherTransactions = otherMemoNumbers.flatMap((memoNumber, index) => [
            {
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: 2000,
              deposit: 200,
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            },
            {
              id: `payment-${memoNumber}-1`,
              customerId,
              memoNumber,
              type: 'payment',
              amount: 500,
              deposit: 500,
              total: 0,
              date: '2024-01-02',
              createdAt: '2024-01-02T00:00:00Z',
            },
          ]);

          const allTransactions = [targetSale, ...targetPayments, ...otherTransactions];

          // Action: Get memo details for target memo
          const memoDetails = transactionService.getMemoDetails(targetMemoNumber, allTransactions);

          // Property 1: Should only include payments from target memo
          expect(memoDetails).not.toBeNull();
          expect(memoDetails.paymentTransactions.length).toBe(2);

          // Property 2: All returned payments should have target memo number
          memoDetails.paymentTransactions.forEach(payment => {
            expect(payment.memoNumber).toBe(targetMemoNumber);
          });

          // Property 3: Payment IDs should match target payments only
          const returnedPaymentIds = memoDetails.paymentTransactions.map(p => p.id).sort();
          const expectedPaymentIds = targetPayments.map(p => p.id).sort();
          expect(returnedPaymentIds).toEqual(expectedPaymentIds);

          // Property 4: No payments from other memos should be included
          const otherPaymentIds = otherTransactions
            .filter(t => t.type === 'payment')
            .map(t => t.id);
          
          memoDetails.paymentTransactions.forEach(payment => {
            expect(otherPaymentIds).not.toContain(payment.id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null when memo does not exist', () => {
    fc.assert(
      fc.property(
        fc.record({
          nonExistentMemoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          existingMemos: fc.array(
            fc.record({
              memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
              customerId: fc.string({ minLength: 1, maxLength: 20 }),
            }),
            { minLength: 0, maxLength: 5 }
          ),
        }).filter(({ nonExistentMemoNumber, existingMemos }) => {
          // Ensure the non-existent memo is not in the existing memos
          return !existingMemos.some(m => m.memoNumber === nonExistentMemoNumber);
        }),
        ({ nonExistentMemoNumber, existingMemos }) => {
          // Create transactions for existing memos
          const allTransactions = existingMemos.map(({ memoNumber, customerId }) => ({
            id: `sale-${memoNumber}`,
            customerId,
            memoNumber,
            type: 'sale',
            total: 1000,
            deposit: 100,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          }));

          // Action: Try to get details for non-existent memo
          const memoDetails = transactionService.getMemoDetails(nonExistentMemoNumber, allTransactions);

          // Property: Should return null
          expect(memoDetails).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate correct totals including all payments', () => {
    fc.assert(
      fc.property(
        fc.record({
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          saleTotal: fc.float({ min: Math.fround(1000), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
          initialDeposit: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }).map(n => Math.round(n * 100) / 100),
          paymentAmounts: fc.array(
            fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true }).map(n => Math.round(n * 100) / 100),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        ({ memoNumber, customerId, saleTotal, initialDeposit, paymentAmounts }) => {
          const saleTransaction = {
            id: `sale-${memoNumber}`,
            customerId,
            memoNumber,
            type: 'sale',
            total: saleTotal,
            deposit: initialDeposit,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          };

          const paymentTransactions = paymentAmounts.map((amount, index) => ({
            id: `payment-${memoNumber}-${index + 1}`,
            customerId,
            memoNumber,
            type: 'payment',
            amount: amount,
            deposit: amount,
            total: 0,
            date: `2024-01-${String(index + 2).padStart(2, '0')}`,
            createdAt: `2024-01-${String(index + 2).padStart(2, '0')}T00:00:00Z`,
          }));

          const allTransactions = [saleTransaction, ...paymentTransactions];

          // Calculate expected totals
          const expectedTotalPaid = initialDeposit + paymentAmounts.reduce((sum, amt) => sum + amt, 0);
          const expectedRemainingDue = saleTotal - expectedTotalPaid;

          // Action: Get memo details
          const memoDetails = transactionService.getMemoDetails(memoNumber, allTransactions);

          // Property 1: Total amount should match sale total
          expect(memoDetails.totalAmount).toBeCloseTo(saleTotal, 2);

          // Property 2: Total paid should include initial deposit and all payments
          expect(memoDetails.totalPaid).toBeCloseTo(expectedTotalPaid, 2);

          // Property 3: Remaining due should be correct
          expect(memoDetails.remainingDue).toBeCloseTo(expectedRemainingDue, 2);

          // Property 4: All payments should be accounted for in the total
          const sumOfPayments = memoDetails.paymentTransactions.reduce(
            (sum, p) => sum + (p.amount || p.deposit || 0),
            0
          );
          expect(memoDetails.totalPaid).toBeCloseTo(initialDeposit + sumOfPayments, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sort payment transactions chronologically', () => {
    fc.assert(
      fc.property(
        fc.record({
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          paymentCount: fc.integer({ min: 2, max: 10 }),
        }).chain(({ memoNumber, customerId, paymentCount }) => {
          // Generate random dates for payments
          return fc.array(
            fc.integer({ min: 0, max: 365 }),
            { minLength: paymentCount, maxLength: paymentCount }
          ).map(dayOffsets => {
            const saleTransaction = {
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: 10000,
              deposit: 100,
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            };

            // Create payments with random dates
            const paymentTransactions = dayOffsets.map((dayOffset, index) => {
              const date = new Date('2024-01-01');
              date.setDate(date.getDate() + dayOffset);
              const dateStr = date.toISOString().split('T')[0];

              return {
                id: `payment-${memoNumber}-${index + 1}`,
                customerId,
                memoNumber,
                type: 'payment',
                amount: 100,
                deposit: 100,
                total: 0,
                date: dateStr,
                createdAt: `${dateStr}T00:00:00Z`,
              };
            });

            // Shuffle the transactions to test sorting
            const shuffledTransactions = [saleTransaction, ...paymentTransactions].sort(() => Math.random() - 0.5);

            return {
              memoNumber,
              allTransactions: shuffledTransactions,
              expectedPaymentDates: paymentTransactions.map(p => p.date).sort(),
            };
          });
        }),
        ({ memoNumber, allTransactions, expectedPaymentDates }) => {
          // Action: Get memo details
          const memoDetails = transactionService.getMemoDetails(memoNumber, allTransactions);

          // Property: Payment transactions should be sorted by date (oldest first)
          expect(memoDetails).not.toBeNull();
          
          const returnedPaymentDates = memoDetails.paymentTransactions.map(p => p.date);
          
          // Check that dates are in ascending order
          for (let i = 1; i < returnedPaymentDates.length; i++) {
            const prevDate = new Date(returnedPaymentDates[i - 1]);
            const currDate = new Date(returnedPaymentDates[i]);
            expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
          }

          // Check that all expected dates are present
          expect(returnedPaymentDates.sort()).toEqual(expectedPaymentDates);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Payment Linking
 * Feature: codebase-improvements, Property 25: Payments link to memos
 * Validates: Requirements 11.4
 */
describe('Property 25: Payments link to memos', () => {
  let transactionService;

  beforeEach(() => {
    transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
    jest.clearAllMocks();
  });

  /**
   * Generator for non-empty strings (excluding whitespace-only)
   */
  const nonEmptyStringGenerator = (minLength = 1, maxLength = 20) => {
    return fc.string({ minLength, maxLength }).filter(s => s.trim().length > 0);
  };

  /**
   * Generator for payment data
   */
  const paymentDataGenerator = () => {
    return fc.record({
      amount: fc.float({ min: Math.fround(1), max: Math.fround(5000), noNaN: true }).map(n => Math.round(n * 100) / 100),
      date: fc.integer({ min: 0, max: 365 }).map(days => {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
      }),
      paymentMethod: fc.constantFrom('cash', 'card', 'bank_transfer', 'check'),
      note: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: '' }),
    });
  };

  it('should link payment to the specified memo number', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          memoNumber: nonEmptyStringGenerator(),
          customerId: nonEmptyStringGenerator(),
          paymentData: paymentDataGenerator(),
        }),
        async ({ memoNumber, customerId, paymentData }) => {
          // Mock Firebase operations through atomicOperations
          let capturedPaymentTransaction = null;
          const mockPaymentId = `payment-${Math.random().toString(36).substr(2, 9)}`;

          // Mock atomicOperations.execute to capture the payment data
          mockAtomicOperations.execute.mockImplementationOnce(async (name, fn) => {
            // Mock Firebase functions within the atomic operation
            const { ref, push, set } = require('firebase/database');
            const mockRef = jest.fn().mockReturnValue({});
            const mockPush = jest.fn().mockReturnValue({ key: mockPaymentId });
            const mockSet = jest.fn().mockImplementation(async (ref, data) => {
              capturedPaymentTransaction = data;
            });

            // Temporarily replace Firebase functions
            jest.spyOn(require('firebase/database'), 'ref').mockImplementation(mockRef);
            jest.spyOn(require('firebase/database'), 'push').mockImplementation(mockPush);
            jest.spyOn(require('firebase/database'), 'set').mockImplementation(mockSet);

            const result = await fn();

            // Restore
            mockRef.mockRestore();
            mockPush.mockRestore();
            mockSet.mockRestore();

            return result;
          });

          // Action: Add payment to memo
          const paymentId = await transactionService.addPaymentToMemo(
            memoNumber,
            paymentData,
            customerId
          );

          // Property 1: Payment transaction should be created
          expect(capturedPaymentTransaction).not.toBeNull();
          expect(capturedPaymentTransaction).toBeDefined();

          // Property 2: Payment should have the correct memo number
          expect(capturedPaymentTransaction.memoNumber).toBe(memoNumber);

          // Property 3: Payment should have the correct customer ID
          expect(capturedPaymentTransaction.customerId).toBe(customerId);

          // Property 4: Payment should have type 'payment'
          expect(capturedPaymentTransaction.type).toBe('payment');

          // Property 5: Payment amount should match input
          expect(capturedPaymentTransaction.amount).toBeCloseTo(paymentData.amount, 2);

          // Property 6: Payment should have the correct date
          expect(capturedPaymentTransaction.date).toBe(paymentData.date);

          // Property 7: Payment method should match input
          expect(capturedPaymentTransaction.paymentMethod).toBe(paymentData.paymentMethod);

          // Property 8: Payment note should match input
          expect(capturedPaymentTransaction.note).toBe(paymentData.note || '');

          // Property 9: Payment ID should be returned
          expect(paymentId).toBe(mockPaymentId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should link multiple payments to the same memo', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          memoNumber: nonEmptyStringGenerator(),
          customerId: nonEmptyStringGenerator(),
          paymentCount: fc.integer({ min: 2, max: 10 }),
        }).chain(({ memoNumber, customerId, paymentCount }) => {
          return fc.array(paymentDataGenerator(), {
            minLength: paymentCount,
            maxLength: paymentCount,
          }).map(payments => ({
            memoNumber,
            customerId,
            payments,
          }));
        }),
        async ({ memoNumber, customerId, payments }) => {
          const capturedPayments = [];
          let paymentIdCounter = 0;

          // Mock atomicOperations for each payment
          mockAtomicOperations.execute.mockImplementation(async (name, fn) => {
            const mockPaymentId = `payment-${++paymentIdCounter}`;
            
            const mockRef = jest.fn().mockReturnValue({});
            const mockPush = jest.fn().mockReturnValue({ key: mockPaymentId });
            const mockSet = jest.fn().mockImplementation(async (ref, data) => {
              capturedPayments.push(data);
            });

            jest.spyOn(require('firebase/database'), 'ref').mockImplementation(mockRef);
            jest.spyOn(require('firebase/database'), 'push').mockImplementation(mockPush);
            jest.spyOn(require('firebase/database'), 'set').mockImplementation(mockSet);

            const result = await fn();

            mockRef.mockRestore();
            mockPush.mockRestore();
            mockSet.mockRestore();

            return result;
          });

          // Action: Add multiple payments to the same memo
          const paymentIds = [];
          for (const paymentData of payments) {
            const paymentId = await transactionService.addPaymentToMemo(
              memoNumber,
              paymentData,
              customerId
            );
            paymentIds.push(paymentId);
          }

          // Property 1: All payments should be created
          expect(capturedPayments.length).toBe(payments.length);

          // Property 2: All payments should have the same memo number
          capturedPayments.forEach(payment => {
            expect(payment.memoNumber).toBe(memoNumber);
          });

          // Property 3: All payments should have the same customer ID
          capturedPayments.forEach(payment => {
            expect(payment.customerId).toBe(customerId);
          });

          // Property 4: All payments should have type 'payment'
          capturedPayments.forEach(payment => {
            expect(payment.type).toBe('payment');
          });

          // Property 5: Payment amounts should match inputs
          capturedPayments.forEach((payment, index) => {
            expect(payment.amount).toBeCloseTo(payments[index].amount, 2);
          });

          // Property 6: All payment IDs should be unique
          const uniqueIds = new Set(paymentIds);
          expect(uniqueIds.size).toBe(payments.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should link payments to different memos correctly', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          customerId: nonEmptyStringGenerator(),
          memoCount: fc.integer({ min: 2, max: 5 }),
        }).chain(({ customerId, memoCount }) => {
          return fc.array(
            fc.record({
              memoNumber: nonEmptyStringGenerator(),
              paymentData: paymentDataGenerator(),
            }),
            { minLength: memoCount, maxLength: memoCount }
          ).map(memoPayments => {
            // Ensure unique memo numbers
            const uniqueMemos = new Map();
            memoPayments.forEach(({ memoNumber, paymentData }) => {
              if (!uniqueMemos.has(memoNumber)) {
                uniqueMemos.set(memoNumber, paymentData);
              }
            });
            return {
              customerId,
              memoPayments: Array.from(uniqueMemos.entries()).map(([memoNumber, paymentData]) => ({
                memoNumber,
                paymentData,
              })),
            };
          });
        }),
        async ({ customerId, memoPayments }) => {
          const capturedPayments = [];
          let paymentIdCounter = 0;

          // Mock atomicOperations for each payment
          mockAtomicOperations.execute.mockImplementation(async (name, fn) => {
            const mockPaymentId = `payment-${++paymentIdCounter}`;
            
            const mockRef = jest.fn().mockReturnValue({});
            const mockPush = jest.fn().mockReturnValue({ key: mockPaymentId });
            const mockSet = jest.fn().mockImplementation(async (ref, data) => {
              capturedPayments.push(data);
            });

            jest.spyOn(require('firebase/database'), 'ref').mockImplementation(mockRef);
            jest.spyOn(require('firebase/database'), 'push').mockImplementation(mockPush);
            jest.spyOn(require('firebase/database'), 'set').mockImplementation(mockSet);

            const result = await fn();

            mockRef.mockRestore();
            mockPush.mockRestore();
            mockSet.mockRestore();

            return result;
          });

          // Action: Add payments to different memos
          for (const { memoNumber, paymentData } of memoPayments) {
            await transactionService.addPaymentToMemo(memoNumber, paymentData, customerId);
          }

          // Property 1: All payments should be created
          expect(capturedPayments.length).toBe(memoPayments.length);

          // Property 2: Each payment should have the correct memo number
          capturedPayments.forEach((payment, index) => {
            expect(payment.memoNumber).toBe(memoPayments[index].memoNumber);
          });

          // Property 3: All payments should have the same customer ID
          capturedPayments.forEach(payment => {
            expect(payment.customerId).toBe(customerId);
          });

          // Property 4: Payments should be correctly associated with their respective memos
          const paymentsByMemo = new Map();
          capturedPayments.forEach(payment => {
            if (!paymentsByMemo.has(payment.memoNumber)) {
              paymentsByMemo.set(payment.memoNumber, []);
            }
            paymentsByMemo.get(payment.memoNumber).push(payment);
          });

          // Each memo should have exactly one payment
          memoPayments.forEach(({ memoNumber }) => {
            expect(paymentsByMemo.has(memoNumber)).toBe(true);
            expect(paymentsByMemo.get(memoNumber).length).toBe(1);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject payment with missing memo number', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          customerId: nonEmptyStringGenerator(),
          paymentData: paymentDataGenerator(),
        }),
        async ({ customerId, paymentData }) => {
          // Action: Try to add payment without memo number
          await expect(
            transactionService.addPaymentToMemo(null, paymentData, customerId)
          ).rejects.toThrow();

          await expect(
            transactionService.addPaymentToMemo(undefined, paymentData, customerId)
          ).rejects.toThrow();

          await expect(
            transactionService.addPaymentToMemo('', paymentData, customerId)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject payment with missing customer ID', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          memoNumber: nonEmptyStringGenerator(),
          paymentData: paymentDataGenerator(),
        }),
        async ({ memoNumber, paymentData }) => {
          // Action: Try to add payment without customer ID
          await expect(
            transactionService.addPaymentToMemo(memoNumber, paymentData, null)
          ).rejects.toThrow();

          await expect(
            transactionService.addPaymentToMemo(memoNumber, paymentData, undefined)
          ).rejects.toThrow();

          await expect(
            transactionService.addPaymentToMemo(memoNumber, paymentData, '')
          ).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject payment with invalid amount', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          memoNumber: nonEmptyStringGenerator(),
          customerId: nonEmptyStringGenerator(),
          invalidAmount: fc.constantFrom(0, -1, -100, null, undefined, NaN),
        }),
        async ({ memoNumber, customerId, invalidAmount }) => {
          const paymentData = {
            amount: invalidAmount,
            date: '2024-01-01',
            paymentMethod: 'cash',
          };

          // Action: Try to add payment with invalid amount
          await expect(
            transactionService.addPaymentToMemo(memoNumber, paymentData, customerId)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should retrieve linked payments when getting memo details', () => {
    fc.assert(
      fc.property(
        fc.record({
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          saleTotal: fc.float({ min: Math.fround(1000), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
          paymentCount: fc.integer({ min: 1, max: 5 }),
        }).chain(({ memoNumber, customerId, saleTotal, paymentCount }) => {
          return fc.array(paymentDataGenerator(), {
            minLength: paymentCount,
            maxLength: paymentCount,
          }).map(payments => ({
            memoNumber,
            customerId,
            saleTotal,
            payments,
          }));
        }),
        ({ memoNumber, customerId, saleTotal, payments }) => {
          // Create sale transaction
          const saleTransaction = {
            id: `sale-${memoNumber}`,
            customerId,
            memoNumber,
            type: 'sale',
            total: saleTotal,
            deposit: 100,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          };

          // Create payment transactions with the memo number
          const paymentTransactions = payments.map((paymentData, index) => ({
            id: `payment-${memoNumber}-${index + 1}`,
            customerId,
            memoNumber, // This is the link!
            type: 'payment',
            amount: paymentData.amount,
            deposit: paymentData.amount,
            total: 0,
            date: paymentData.date,
            paymentMethod: paymentData.paymentMethod,
            note: paymentData.note || '',
            createdAt: `${paymentData.date}T00:00:00Z`,
          }));

          const allTransactions = [saleTransaction, ...paymentTransactions];

          // Action: Get memo details
          const memoDetails = transactionService.getMemoDetails(memoNumber, allTransactions);

          // Property 1: All payments should be linked to the memo
          expect(memoDetails).not.toBeNull();
          expect(memoDetails.paymentTransactions.length).toBe(payments.length);

          // Property 2: Each payment should have the correct memo number
          memoDetails.paymentTransactions.forEach(payment => {
            expect(payment.memoNumber).toBe(memoNumber);
          });

          // Property 3: Payment IDs should match
          const returnedPaymentIds = memoDetails.paymentTransactions.map(p => p.id).sort();
          const expectedPaymentIds = paymentTransactions.map(p => p.id).sort();
          expect(returnedPaymentIds).toEqual(expectedPaymentIds);

          // Property 4: All payments should be associated with the correct customer
          memoDetails.paymentTransactions.forEach(payment => {
            expect(payment.customerId).toBe(customerId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests for Customer Due Aggregation
 * Feature: codebase-improvements, Property 26: Customer total due aggregates memo dues
 * Validates: Requirements 11.5
 */
describe('Property 26: Customer total due aggregates memo dues', () => {
  let transactionService;

  beforeEach(() => {
    transactionService = new TransactionService(mockDb, mockLogger, mockAtomicOperations);
    jest.clearAllMocks();
  });

  /**
   * Generator for a customer with multiple memos with varying due amounts
   */
  const customerWithMultipleMemosGenerator = () => {
    return fc.record({
      customerId: fc.string({ minLength: 1, maxLength: 20 }),
      memoCount: fc.integer({ min: 1, max: 10 }),
    }).chain(({ customerId, memoCount }) => {
      // Generate unique memo numbers
      return fc.array(
        fc.string({ minLength: 1, maxLength: 20 }),
        { minLength: memoCount, maxLength: memoCount }
      ).chain(memoNumbers => {
        // Make memo numbers unique
        const uniqueMemos = [...new Set(memoNumbers)];
        while (uniqueMemos.length < memoCount) {
          uniqueMemos.push(`memo-${uniqueMemos.length}`);
        }

        // For each memo, generate sale and payment transactions
        const memoGenerators = uniqueMemos.slice(0, memoCount).map(memoNumber => {
          return fc.record({
            saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
            initialDeposit: fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }).map(n => Math.round(n * 100) / 100),
            paymentCount: fc.integer({ min: 0, max: 5 }),
          }).chain(({ saleTotal, initialDeposit, paymentCount }) => {
            return fc.array(
              fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true }).map(n => Math.round(n * 100) / 100),
              { minLength: paymentCount, maxLength: paymentCount }
            ).map(paymentAmounts => {
              // Create sale transaction
              const saleTransaction = {
                id: `sale-${memoNumber}`,
                customerId,
                memoNumber,
                type: 'sale',
                total: saleTotal,
                deposit: initialDeposit,
                date: '2024-01-01',
                createdAt: '2024-01-01T00:00:00Z',
                products: [],
              };

              // Create payment transactions
              const paymentTransactions = paymentAmounts.map((amount, index) => ({
                id: `payment-${memoNumber}-${index + 1}`,
                customerId,
                memoNumber,
                type: 'payment',
                amount: amount,
                deposit: amount,
                total: 0,
                date: `2024-01-${String(index + 2).padStart(2, '0')}`,
                createdAt: `2024-01-${String(index + 2).padStart(2, '0')}T00:00:00Z`,
              }));

              // Calculate expected due for this memo
              const totalPaid = initialDeposit + paymentAmounts.reduce((sum, amt) => sum + amt, 0);
              const memoDue = Math.round((saleTotal - totalPaid) * 100) / 100;

              return {
                memoNumber,
                saleTransaction,
                paymentTransactions,
                expectedDue: memoDue,
              };
            });
          });
        });

        return fc.tuple(...memoGenerators).map(memoData => {
          // Flatten all transactions
          const allTransactions = [];
          let expectedTotalDue = 0;

          memoData.forEach(({ saleTransaction, paymentTransactions, expectedDue }) => {
            allTransactions.push(saleTransaction);
            allTransactions.push(...paymentTransactions);
            expectedTotalDue += expectedDue;
          });

          return {
            customerId,
            transactions: allTransactions,
            expectedTotalDue: Math.round(expectedTotalDue * 100) / 100,
            memoCount: memoData.length,
            memoData,
          };
        });
      });
    });
  };

  it('should aggregate due amounts across all customer memos', () => {
    fc.assert(
      fc.property(
        customerWithMultipleMemosGenerator(),
        ({ customerId, transactions, expectedTotalDue, memoCount }) => {
          // Action: Calculate customer total due
          const actualTotalDue = transactionService.calculateCustomerTotalDue(customerId, transactions);

          // Property 1: Total due should equal sum of all memo dues
          expect(actualTotalDue).toBeCloseTo(expectedTotalDue, 2);

          // Property 2: Verify by manually calculating from memo groups
          const memoGroups = transactionService.getCustomerTransactionsByMemo(customerId, transactions);
          const manualTotalDue = memoGroups.reduce((sum, memo) => sum + memo.dueAmount, 0);
          expect(actualTotalDue).toBeCloseTo(manualTotalDue, 2);

          // Property 3: Should have the expected number of memos
          expect(memoGroups.length).toBe(memoCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return zero when customer has no transactions', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          otherTransactions: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              customerId: fc.string({ minLength: 1, maxLength: 20 }),
              memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.constantFrom('sale', 'payment'),
              total: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
              deposit: fc.float({ min: Math.fround(0), max: Math.fround(500), noNaN: true }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
        }).filter(({ customerId, otherTransactions }) => {
          // Ensure no transactions belong to the target customer
          return !otherTransactions.some(t => t.customerId === customerId);
        }),
        ({ customerId, otherTransactions }) => {
          // Action: Calculate total due for customer with no transactions
          const totalDue = transactionService.calculateCustomerTotalDue(customerId, otherTransactions);

          // Property: Should return zero
          expect(totalDue).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return zero when all customer memos are fully paid', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          memoCount: fc.integer({ min: 1, max: 5 }),
        }).chain(({ customerId, memoCount }) => {
          return fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { minLength: memoCount, maxLength: memoCount }
          ).map(memoNumbers => {
            // Make memo numbers unique
            const uniqueMemos = [...new Set(memoNumbers)];
            while (uniqueMemos.length < memoCount) {
              uniqueMemos.push(`memo-${uniqueMemos.length}`);
            }

            // Create fully paid transactions for each memo
            const transactions = uniqueMemos.slice(0, memoCount).map(memoNumber => ({
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: 1000,
              deposit: 1000, // Fully paid
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            }));

            return { customerId, transactions };
          });
        }),
        ({ customerId, transactions }) => {
          // Action: Calculate total due
          const totalDue = transactionService.calculateCustomerTotalDue(customerId, transactions);

          // Property: Should return zero when all memos are fully paid
          expect(totalDue).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly aggregate dues when some memos are paid and others are not', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          paidMemoCount: fc.integer({ min: 1, max: 3 }),
          unpaidMemoCount: fc.integer({ min: 1, max: 3 }),
        }).chain(({ customerId, paidMemoCount, unpaidMemoCount }) => {
          return fc.record({
            paidMemos: fc.array(
              fc.record({
                memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
                saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(5000), noNaN: true }).map(n => Math.round(n * 100) / 100),
              }),
              { minLength: paidMemoCount, maxLength: paidMemoCount }
            ),
            unpaidMemos: fc.array(
              fc.record({
                memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
                saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(5000), noNaN: true }).map(n => Math.round(n * 100) / 100),
                deposit: fc.float({ min: Math.fround(0), max: Math.fround(99), noNaN: true }).map(n => Math.round(n * 100) / 100),
              }),
              { minLength: unpaidMemoCount, maxLength: unpaidMemoCount }
            ),
          }).map(({ paidMemos, unpaidMemos }) => {
            // Ensure all memo numbers are unique
            const allMemoNumbers = new Set();
            const uniquePaidMemos = paidMemos.filter(m => {
              if (allMemoNumbers.has(m.memoNumber)) return false;
              allMemoNumbers.add(m.memoNumber);
              return true;
            });
            const uniqueUnpaidMemos = unpaidMemos.filter(m => {
              if (allMemoNumbers.has(m.memoNumber)) return false;
              allMemoNumbers.add(m.memoNumber);
              return true;
            });

            return { customerId, paidMemos: uniquePaidMemos, unpaidMemos: uniqueUnpaidMemos };
          });
        }),
        ({ customerId, paidMemos, unpaidMemos }) => {
          const transactions = [];
          let expectedTotalDue = 0;

          // Add fully paid memos (due = 0)
          paidMemos.forEach(({ memoNumber, saleTotal }) => {
            transactions.push({
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: saleTotal,
              deposit: saleTotal, // Fully paid
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            });
            // expectedTotalDue += 0 (no due for paid memos)
          });

          // Add unpaid memos (due > 0)
          unpaidMemos.forEach(({ memoNumber, saleTotal, deposit }) => {
            transactions.push({
              id: `sale-${memoNumber}`,
              customerId,
              memoNumber,
              type: 'sale',
              total: saleTotal,
              deposit,
              date: '2024-01-01',
              createdAt: '2024-01-01T00:00:00Z',
              products: [],
            });
            expectedTotalDue += Math.round((saleTotal - deposit) * 100) / 100;
          });

          // Action: Calculate total due
          const actualTotalDue = transactionService.calculateCustomerTotalDue(customerId, transactions);

          // Property: Total due should only include unpaid memos
          expect(actualTotalDue).toBeCloseTo(expectedTotalDue, 2);

          // Property: Total due should be greater than zero if there are unpaid memos
          if (unpaidMemos.length > 0) {
            expect(actualTotalDue).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle memos with partial payments correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          saleTotal: fc.float({ min: Math.fround(1000), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
          initialDeposit: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }).map(n => Math.round(n * 100) / 100),
          paymentAmounts: fc.array(
            fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true }).map(n => Math.round(n * 100) / 100),
            { minLength: 1, maxLength: 5 }
          ),
        }).filter(({ saleTotal, initialDeposit, paymentAmounts }) => {
          // Ensure there's still a due amount after all payments
          const totalPaid = initialDeposit + paymentAmounts.reduce((sum, amt) => sum + amt, 0);
          return totalPaid < saleTotal;
        }),
        ({ customerId, memoNumber, saleTotal, initialDeposit, paymentAmounts }) => {
          // Create sale transaction
          const saleTransaction = {
            id: `sale-${memoNumber}`,
            customerId,
            memoNumber,
            type: 'sale',
            total: saleTotal,
            deposit: initialDeposit,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          };

          // Create payment transactions
          const paymentTransactions = paymentAmounts.map((amount, index) => ({
            id: `payment-${memoNumber}-${index + 1}`,
            customerId,
            memoNumber,
            type: 'payment',
            amount: amount,
            deposit: amount,
            total: 0,
            date: `2024-01-${String(index + 2).padStart(2, '0')}`,
            createdAt: `2024-01-${String(index + 2).padStart(2, '0')}T00:00:00Z`,
          }));

          const allTransactions = [saleTransaction, ...paymentTransactions];

          // Calculate expected due
          const totalPaid = initialDeposit + paymentAmounts.reduce((sum, amt) => sum + amt, 0);
          const expectedDue = Math.round((saleTotal - totalPaid) * 100) / 100;

          // Action: Calculate total due
          const actualTotalDue = transactionService.calculateCustomerTotalDue(customerId, allTransactions);

          // Property: Total due should equal the remaining amount after partial payments
          expect(actualTotalDue).toBeCloseTo(expectedDue, 2);
          expect(actualTotalDue).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only aggregate dues for the specified customer', () => {
    fc.assert(
      fc.property(
        fc.record({
          targetCustomerId: fc.string({ minLength: 1, maxLength: 20 }),
          otherCustomerIds: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { minLength: 1, maxLength: 3 }
          ),
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        ({ targetCustomerId, otherCustomerIds, memoNumber }) => {
          // Ensure other customer IDs are different from target
          const uniqueOtherIds = otherCustomerIds.filter(id => id !== targetCustomerId);
          if (uniqueOtherIds.length === 0) {
            uniqueOtherIds.push(`${targetCustomerId}-other`);
          }

          // Create transaction for target customer with due
          const targetTransaction = {
            id: 'target-1',
            customerId: targetCustomerId,
            memoNumber: `${memoNumber}-target`,
            type: 'sale',
            total: 1000,
            deposit: 500,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          };

          // Create transactions for other customers with dues
          const otherTransactions = uniqueOtherIds.map((customerId, index) => ({
            id: `other-${index}`,
            customerId,
            memoNumber: `${memoNumber}-${index}`,
            type: 'sale',
            total: 2000,
            deposit: 1000,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          }));

          const allTransactions = [targetTransaction, ...otherTransactions];

          // Expected due for target customer only
          const expectedDue = 1000 - 500; // 500

          // Action: Calculate total due for target customer
          const actualTotalDue = transactionService.calculateCustomerTotalDue(targetCustomerId, allTransactions);

          // Property: Should only include target customer's dues
          expect(actualTotalDue).toBeCloseTo(expectedDue, 2);

          // Property: Should not include other customers' dues
          const otherCustomerTotalDue = uniqueOtherIds.reduce((sum, otherId) => {
            return sum + transactionService.calculateCustomerTotalDue(otherId, allTransactions);
          }, 0);
          expect(actualTotalDue).not.toBeCloseTo(actualTotalDue + otherCustomerTotalDue, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle negative dues as zero (overpayment scenario)', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
          saleTotal: fc.float({ min: Math.fround(100), max: Math.fround(1000), noNaN: true }).map(n => Math.round(n * 100) / 100),
        }).chain(({ customerId, memoNumber, saleTotal }) => {
          // Generate overpayment (deposit > total)
          return fc.record({
            customerId: fc.constant(customerId),
            memoNumber: fc.constant(memoNumber),
            saleTotal: fc.constant(saleTotal),
            deposit: fc.float({ min: Math.fround(saleTotal * 1.1), max: Math.fround(saleTotal * 2), noNaN: true }).map(n => Math.round(n * 100) / 100),
          });
        }),
        ({ customerId, memoNumber, saleTotal, deposit }) => {
          const transaction = {
            id: `sale-${memoNumber}`,
            customerId,
            memoNumber,
            type: 'sale',
            total: saleTotal,
            deposit: deposit, // Overpayment
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          };

          // Action: Calculate total due
          const totalDue = transactionService.calculateCustomerTotalDue(customerId, [transaction]);

          // Property: Due should not be negative (should be treated as zero or capped at zero)
          expect(totalDue).toBeLessThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain precision with floating point calculations', () => {
    fc.assert(
      fc.property(
        fc.record({
          customerId: fc.string({ minLength: 1, maxLength: 20 }),
          memoCount: fc.integer({ min: 3, max: 10 }),
        }).chain(({ customerId, memoCount }) => {
          // Generate memos with amounts that might cause floating point issues
          return fc.array(
            fc.record({
              memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
              saleTotal: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99), noNaN: true }).map(n => Math.round(n * 100) / 100),
              deposit: fc.float({ min: Math.fround(0), max: Math.fround(99.99), noNaN: true }).map(n => Math.round(n * 100) / 100),
            }),
            { minLength: memoCount, maxLength: memoCount }
          ).map(memos => {
            // Ensure unique memo numbers
            const uniqueMemos = [];
            const seenMemos = new Set();
            memos.forEach(memo => {
              if (!seenMemos.has(memo.memoNumber)) {
                seenMemos.add(memo.memoNumber);
                uniqueMemos.push(memo);
              }
            });

            return { customerId, memos: uniqueMemos };
          });
        }),
        ({ customerId, memos }) => {
          const transactions = memos.map(({ memoNumber, saleTotal, deposit }) => ({
            id: `sale-${memoNumber}`,
            customerId,
            memoNumber,
            type: 'sale',
            total: saleTotal,
            deposit,
            date: '2024-01-01',
            createdAt: '2024-01-01T00:00:00Z',
            products: [],
          }));

          // Calculate expected due manually
          const expectedDue = memos.reduce((sum, memo) => {
            return sum + Math.round((memo.saleTotal - memo.deposit) * 100) / 100;
          }, 0);

          // Action: Calculate total due
          const actualTotalDue = transactionService.calculateCustomerTotalDue(customerId, transactions);

          // Property: Should maintain precision (within 2 decimal places)
          expect(actualTotalDue).toBeCloseTo(expectedDue, 2);

          // Property: Result should be a valid number
          expect(Number.isFinite(actualTotalDue)).toBe(true);
          expect(Number.isNaN(actualTotalDue)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
