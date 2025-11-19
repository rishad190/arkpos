import { render } from '@testing-library/react'

/**
 * Custom render function that wraps components with necessary providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} Render result
 */
export function renderWithProviders(ui, options = {}) {
  const { wrapper, ...renderOptions } = options
  
  return render(ui, { ...renderOptions, wrapper })
}

/**
 * Create a mock Firebase database reference
 * @returns {Object} Mock database reference
 */
export function createMockDbRef() {
  return {
    set: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve({ exists: () => true, val: () => ({}) })),
    push: jest.fn(() => ({ key: 'mock-key' })),
    update: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(() => Promise.resolve({ exists: () => true, val: () => ({}) })),
  }
}

/**
 * Create a mock logger
 * @returns {Object} Mock logger
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}

/**
 * Create a mock atomic operations service
 * @returns {Object} Mock atomic operations service
 */
export function createMockAtomicOperations() {
  return {
    execute: jest.fn((name, fn) => fn()),
    isOnline: jest.fn(() => true),
    getQueueLength: jest.fn(() => 0),
  }
}

/**
 * Wait for async operations to complete
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a mock Firebase snapshot
 * @param {*} data - Data to return from snapshot
 * @returns {Object} Mock snapshot
 */
export function createMockSnapshot(data) {
  return {
    exists: () => data !== null && data !== undefined,
    val: () => data,
    key: 'mock-key',
    ref: createMockDbRef(),
  }
}

/**
 * Flush all pending promises
 * @returns {Promise<void>}
 */
export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve))
}

export * from '@testing-library/react'
