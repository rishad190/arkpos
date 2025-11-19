import * as fc from 'fast-check'

/**
 * Generate a valid customer object
 * @returns {fc.Arbitrary<Object>} Customer generator
 */
export function customerGenerator() {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    phone: fc.string({ minLength: 10, maxLength: 15 }).map(s => s.replace(/\D/g, '').slice(0, 10)),
    address: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    email: fc.option(fc.emailAddress(), { nil: undefined }),
  })
}

/**
 * Generate a valid transaction object
 * @returns {fc.Arbitrary<Object>} Transaction generator
 */
export function transactionGenerator() {
  return fc.record({
    customerId: fc.string({ minLength: 1 }),
    memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
    type: fc.constantFrom('sale', 'payment'),
    total: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }).map(n => Math.round(n * 100) / 100),
    deposit: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }).map(n => Math.round(n * 100) / 100),
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
    products: fc.array(productGenerator(), { minLength: 0, maxLength: 10 }),
  }).map(txn => ({
    ...txn,
    due: Math.max(0, Math.round((txn.total - txn.deposit) * 100) / 100),
  }))
}

/**
 * Generate a valid product object
 * @returns {fc.Arbitrary<Object>} Product generator
 */
export function productGenerator() {
  return fc.record({
    fabricId: fc.string({ minLength: 1 }),
    fabricName: fc.string({ minLength: 1, maxLength: 50 }),
    colorName: fc.string({ minLength: 1, maxLength: 30 }),
    quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }).map(n => Math.round(n * 100) / 100),
    rate: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
    unit: fc.constantFrom('meter', 'yard', 'piece'),
  }).map(product => ({
    ...product,
    amount: Math.round(product.quantity * product.rate * 100) / 100,
  }))
}

/**
 * Generate a valid fabric object
 * @returns {fc.Arbitrary<Object>} Fabric generator
 */
export function fabricGenerator() {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    category: fc.constantFrom('Cotton', 'Silk', 'Polyester', 'Wool', 'Linen'),
    unit: fc.constantFrom('meter', 'yard'),
    batches: fc.dictionary(
      fc.string({ minLength: 1 }),
      batchGenerator(),
      { minKeys: 0, maxKeys: 5 }
    ),
  })
}

/**
 * Generate a valid batch object
 * @returns {fc.Arbitrary<Object>} Batch generator
 */
export function batchGenerator() {
  return fc.record({
    items: fc.array(batchItemGenerator(), { minLength: 1, maxLength: 10 }),
    purchaseDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
    unitCost: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }).map(n => Math.round(n * 100) / 100),
    supplier: fc.string({ minLength: 1, maxLength: 50 }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
  })
}

/**
 * Generate a valid batch item object
 * @returns {fc.Arbitrary<Object>} Batch item generator
 */
export function batchItemGenerator() {
  return fc.record({
    colorName: fc.string({ minLength: 1, maxLength: 30 }),
    quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }).map(n => Math.round(n * 100) / 100),
    colorCode: fc.option(
      fc.integer({ min: 0, max: 16777215 }).map(n => '#' + n.toString(16).padStart(6, '0')),
      { nil: undefined }
    ),
  })
}

/**
 * Generate a valid supplier object
 * @returns {fc.Arbitrary<Object>} Supplier generator
 */
export function supplierGenerator() {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    phone: fc.string({ minLength: 10, maxLength: 15 }).map(s => s.replace(/\D/g, '').slice(0, 10)),
    address: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    email: fc.option(fc.emailAddress(), { nil: undefined }),
  })
}

/**
 * Generate a valid supplier transaction object
 * @returns {fc.Arbitrary<Object>} Supplier transaction generator
 */
export function supplierTransactionGenerator() {
  return fc.record({
    supplierId: fc.string({ minLength: 1, maxLength: 20 }),
    totalAmount: fc.float({ min: Math.fround(1), max: Math.fround(100000), noNaN: true }).map(n => Math.round(n * 100) / 100),
    paidAmount: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }).map(n => Math.round(n * 100) / 100),
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
    description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  }).chain(txn => {
    // Ensure paidAmount doesn't exceed totalAmount
    const maxPaid = txn.totalAmount;
    return fc.record({
      ...txn,
      paidAmount: fc.float({ min: Math.fround(0), max: Math.fround(maxPaid), noNaN: true }).map(n => Math.round(n * 100) / 100),
    }).map(adjustedTxn => ({
      ...adjustedTxn,
      due: Math.round((adjustedTxn.totalAmount - adjustedTxn.paidAmount) * 100) / 100,
    }));
  })
}

/**
 * Generate a memo with transactions
 * @returns {fc.Arbitrary<Object>} Memo with transactions generator
 */
export function memoWithTransactionsGenerator() {
  return fc.record({
    memoNumber: fc.string({ minLength: 1, maxLength: 20 }),
    saleTransaction: transactionGenerator().map(txn => ({ ...txn, type: 'sale' })),
    payments: fc.array(
      fc.record({
        amount: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }).map(n => Math.round(n * 100) / 100),
        date: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('cash', 'card', 'upi', 'cheque'),
        note: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
      }),
      { minLength: 0, maxLength: 5 }
    ),
  }).map(memo => {
    const totalPaid = memo.payments.reduce((sum, p) => sum + p.amount, 0)
    return {
      ...memo,
      dueAmount: Math.max(0, memo.saleTransaction.total - memo.saleTransaction.deposit - totalPaid),
    }
  })
}

/**
 * Generate a valid error object
 * @returns {fc.Arbitrary<Object>} Error generator
 */
export function errorGenerator() {
  return fc.record({
    message: fc.string({ minLength: 1, maxLength: 200 }),
    code: fc.constantFrom('NETWORK', 'VALIDATION', 'PERMISSION', 'NOT_FOUND', 'CONFLICT'),
    context: fc.option(fc.object(), { nil: undefined }),
  })
}

/**
 * Generate a validation result
 * @returns {fc.Arbitrary<Object>} Validation result generator
 */
export function validationResultGenerator() {
  return fc.record({
    isValid: fc.boolean(),
    errors: fc.array(
      fc.record({
        field: fc.string({ minLength: 1, maxLength: 50 }),
        message: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      { maxLength: 10 }
    ),
    warnings: fc.array(
      fc.record({
        field: fc.string({ minLength: 1, maxLength: 50 }),
        message: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      { maxLength: 10 }
    ),
  })
}

/**
 * Generate a positive number
 * @returns {fc.Arbitrary<number>} Positive number generator
 */
export function positiveNumberGenerator() {
  return fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true }).map(n => Math.round(n * 100) / 100)
}

/**
 * Generate a valid date string
 * @returns {fc.Arbitrary<string>} Date string generator
 */
export function dateStringGenerator() {
  return fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString())
}

/**
 * Generate a non-empty string
 * @returns {fc.Arbitrary<string>} Non-empty string generator
 */
export function nonEmptyStringGenerator() {
  return fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
}

/**
 * Generate whitespace-only string
 * @returns {fc.Arbitrary<string>} Whitespace string generator
 */
export function whitespaceStringGenerator() {
  return fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 })
}
