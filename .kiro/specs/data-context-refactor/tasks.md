# Implementation Plan

- [ ] 1. Set up testing infrastructure and utilities
  - Create `src/hooks/__tests__/utils/hookTestUtils.js` with mock factories for Firebase, logger, services, and atomic operations
  - Install fast-check library for property-based testing: `npm install --save-dev fast-check`
  - Create shared test fixtures for common data structures (customers, transactions, fabrics, etc.)
  - _Requirements: 10.1, 10.2, 10.5_

- [ ] 2. Implement useConnection hook
  - Create `src/hooks/useConnection.js` with connection state monitoring
  - Implement Firebase `.info/connected` listener with state management
  - Implement offline queue state management (add, remove, update operations)
  - Implement `processOfflineQueue` function with retry logic
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 2.1 Write property test for useConnection
  - **Property 21: Connection state transitions**
  - **Validates: Requirements 8.2, 8.3, 8.4**

- [ ]* 2.2 Write property test for offline queue
  - **Property 22: Offline queue persistence**
  - **Validates: Requirements 8.5**

- [ ]* 2.3 Write unit tests for useConnection
  - Test initial connection state
  - Test connection state transitions
  - Test offline queue operations
  - Test queue processing on reconnection
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 3. Implement useCustomers hook
  - Create `src/hooks/useCustomers.js` with state management using useReducer
  - Implement Firebase listener for customers collection with debouncing (300ms)
  - Implement CRUD operations using CustomerService (addCustomer, updateCustomer, deleteCustomer)
  - Implement memoized `getCustomerDue` function using memoizedCalculations
  - Implement memoized `customerDues` computed value
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ]* 3.1 Write property test for Firebase debouncing
  - **Property 1: Firebase update debouncing**
  - **Validates: Requirements 1.2**

- [ ]* 3.2 Write property test for CRUD validation
  - **Property 2: CRUD operation validation**
  - **Validates: Requirements 1.3, 1.4**

- [ ]* 3.3 Write property test for customer deletion
  - **Property 3: Customer deletion cascade**
  - **Validates: Requirements 1.5**

- [ ]* 3.4 Write property test for memoization
  - **Property 4: Memoization consistency**
  - **Validates: Requirements 1.6**

- [ ]* 3.5 Write unit tests for useCustomers
  - Test initial state structure
  - Test customer addition with valid data
  - Test customer update with validation
  - Test customer deletion with transactions
  - Test due calculation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 4. Implement useTransactions hook
  - Create `src/hooks/useTransactions.js` with state management using useReducer
  - Implement Firebase listener for transactions collection with debouncing (300ms)
  - Implement CRUD operations using TransactionService (addTransaction, updateTransaction, deleteTransaction)
  - Implement `getCustomerTransactionsByMemo` using memoizedCalculations
  - Implement `getMemoDetails` function
  - Implement `addPaymentToMemo` function
  - Implement `calculateCustomerTotalDue` function
  - Implement `getCustomerMemosWithDues` function
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ]* 4.1 Write property test for transaction grouping
  - **Property 5: Transaction memo grouping**
  - **Validates: Requirements 2.6**

- [ ]* 4.2 Write property test for payment due calculation
  - **Property 6: Payment due recalculation**
  - **Validates: Requirements 2.7**

- [ ]* 4.3 Write unit tests for useTransactions
  - Test initial state structure
  - Test transaction CRUD operations
  - Test memo grouping logic
  - Test payment addition to memo
  - Test due calculations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 5. Implement useSuppliers hook
  - Create `src/hooks/useSuppliers.js` with state management for suppliers and supplier transactions
  - Implement Firebase listeners for both suppliers and supplierTransactions collections with debouncing
  - Implement supplier CRUD operations (addSupplier, updateSupplier, deleteSupplier) with validation
  - Implement supplier transaction operations (addSupplierTransaction, deleteSupplierTransaction)
  - Implement atomic supplier due updates when transactions are added/deleted
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]* 5.1 Write property test for supplier deletion
  - **Property 7: Supplier deletion atomicity**
  - **Validates: Requirements 3.5**

- [ ]* 5.2 Write property test for supplier due updates
  - **Property 8: Supplier due update atomicity**
  - **Validates: Requirements 3.6**

- [ ]* 5.3 Write unit tests for useSuppliers
  - Test initial state structure
  - Test supplier CRUD operations with validation
  - Test supplier transaction operations
  - Test atomic due updates
  - Test deletion cascade
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 6. Implement useFabrics hook
  - Create `src/hooks/useFabrics.js` with state management using useReducer
  - Implement Firebase listener for fabrics collection with data transformation (flat to nested batches array)
  - Implement fabric CRUD operations using FabricService (addFabric, updateFabric, deleteFabric)
  - Implement batch operations (addFabricBatch, updateFabricBatch)
  - Implement `reduceInventory` function with FIFO logic and batch locking
  - Implement `acquireBatchLock` and `releaseBatchLock` utility functions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 6.1 Write property test for fabric data transformation
  - **Property 9: Fabric data transformation**
  - **Validates: Requirements 4.2**

- [ ]* 6.2 Write property test for FIFO inventory reduction
  - **Property 10: FIFO inventory reduction**
  - **Validates: Requirements 4.5**

- [ ]* 6.3 Write property test for fabric deletion
  - **Property 11: Fabric batch cascade deletion**
  - **Validates: Requirements 4.6**

- [ ]* 6.4 Write unit tests for useFabrics
  - Test initial state structure with nested batches
  - Test fabric CRUD operations
  - Test batch operations
  - Test inventory reduction with locking
  - Test FIFO strategy
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 7. Implement usePartnerProducts hook
  - Create `src/hooks/usePartnerProducts.js` with state management using useReducer
  - Implement Firebase listener for partnerProducts collection with debouncing
  - Implement product CRUD operations (addPartnerProduct, updatePartnerProduct, deletePartnerProduct)
  - Implement partner operations (addPartnerToProduct with duplicate prevention, deletePartner, updatePartnerName)
  - Implement partner transaction operations (addTransactionToPartner with validation, updatePartnerTransaction, deletePartnerTransaction)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ]* 7.1 Write property test for partner duplicate prevention
  - **Property 16: Partner duplicate prevention**
  - **Validates: Requirements 6.3**

- [ ]* 7.2 Write property test for partner transaction validation
  - **Property 17: Partner transaction validation**
  - **Validates: Requirements 6.4**

- [ ]* 7.3 Write property test for partner name updates
  - **Property 18: Partner name update atomicity**
  - **Validates: Requirements 6.5**

- [ ]* 7.4 Write unit tests for usePartnerProducts
  - Test initial state structure
  - Test product CRUD operations
  - Test partner operations with duplicate prevention
  - Test partner transaction operations with validation
  - Test atomic name updates
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 8. Implement useDailyCash hook
  - Create `src/hooks/useDailyCash.js` with state management for income and expense arrays
  - Implement Firebase listeners for both dailyCashIncome and dailyCashExpense collections with debouncing
  - Implement `addDailyCashTransaction` with collection routing based on cashIn/cashOut
  - Implement `updateDailyCashTransaction` with collection migration logic
  - Implement `deleteDailyCashTransaction` with customer transaction synchronization
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]* 8.1 Write property test for collection routing
  - **Property 12: Daily cash collection routing**
  - **Validates: Requirements 5.2, 5.3**

- [ ]* 8.2 Write property test for collection migration
  - **Property 13: Daily cash collection migration**
  - **Validates: Requirements 5.4**

- [ ]* 8.3 Write property test for referential integrity
  - **Property 14: Daily cash referential integrity**
  - **Validates: Requirements 5.5**

- [ ]* 8.4 Write property test for sale synchronization
  - **Property 15: Sale deposit synchronization**
  - **Validates: Requirements 5.6**

- [ ]* 8.5 Write unit tests for useDailyCash
  - Test initial state with two arrays
  - Test transaction routing to correct collection
  - Test collection migration on update
  - Test customer transaction synchronization
  - Test referential integrity on deletion
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 9. Implement useSettings hook
  - Create `src/hooks/useSettings.js` with state management using useReducer
  - Implement Firebase listener for settings with default values fallback
  - Implement `updateSettings` function with validation (required fields: storeName, address, phone)
  - Implement atomic dual update (Firebase + local state) with error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 9.1 Write property test for settings validation
  - **Property 2: CRUD operation validation** (applies to settings)
  - **Validates: Requirements 7.2, 7.4**

- [ ]* 9.2 Write property test for dual update atomicity
  - **Property 19: Settings dual update atomicity**
  - **Validates: Requirements 7.3**

- [ ]* 9.3 Write property test for reactive updates
  - **Property 20: Settings reactive updates**
  - **Validates: Requirements 7.5**

- [ ]* 9.4 Write unit tests for useSettings
  - Test initial state with defaults
  - Test settings update with validation
  - Test validation error handling
  - Test atomic dual updates
  - Test reactive Firebase updates
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 10. Checkpoint - Ensure all hooks pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Refactor DataContext to use hooks (backward compatible)
  - Update `src/contexts/data-context.js` to instantiate all domain hooks
  - Remove old reducer logic and replace with hook composition
  - Compose context value from all hook return values using useMemo
  - Maintain existing context interface (no breaking changes)
  - Keep performance monitoring functions (getPerformanceMetrics, getPerformanceBottlenecks)
  - _Requirements: 9.1, 9.2, 9.3, 9.6_

- [ ]* 11.1 Write property test for context value completeness
  - **Property 23: Context value completeness**
  - **Validates: Requirements 9.2**

- [ ]* 11.2 Write property test for state propagation
  - **Property 24: State propagation**
  - **Validates: Requirements 9.3**

- [ ]* 11.3 Write property test for performance delegation
  - **Property 25: Performance metrics delegation**
  - **Validates: Requirements 9.6**

- [ ]* 11.4 Write integration tests for DataContext
  - Test hook composition and initialization
  - Test unified interface exposure
  - Test state propagation to consumers
  - Test performance metrics delegation
  - _Requirements: 9.1, 9.2, 9.3, 9.6_

- [ ] 12. Add error isolation tests
  - Write integration tests to verify errors in one domain don't affect others
  - Test error state independence across hooks
  - Test operation availability after errors in other domains
  - _Requirements: 10.4_

- [ ]* 12.1 Write property test for error isolation
  - **Property 27: Error isolation**
  - **Validates: Requirements 10.4**

- [ ] 13. Add hook operation completeness tests
  - Write tests to verify all operations are exposed in hook return values
  - Test public API completeness for each hook
  - _Requirements: 10.3_

- [ ]* 13.1 Write property test for operation completeness
  - **Property 26: Hook operation completeness**
  - **Validates: Requirements 10.3**

- [ ] 14. Run full test suite and verify no regressions
  - Run all existing tests to ensure backward compatibility
  - Run new hook tests to verify correctness
  - Run property-based tests (100+ iterations each)
  - Verify test coverage meets 90%+ goal for hooks
  - _Requirements: All_

- [ ] 15. Performance testing and optimization
  - Add performance metrics tracking for hook initialization
  - Test debouncing behavior with rapid Firebase updates
  - Verify memoization prevents unnecessary re-renders
  - Compare performance metrics before/after refactoring
  - Optimize any performance bottlenecks discovered
  - _Requirements: 1.6, 9.3_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Documentation and cleanup
  - Update JSDoc comments for all hooks with usage examples
  - Add README.md in `src/hooks/` explaining the architecture
  - Document migration from old DataContext to new hook-based approach
  - Remove any commented-out old code from DataContext
  - Update any inline comments to reflect new architecture
  - _Requirements: All_
