# Requirements Document

## Introduction

The DataContext (`src/contexts/data-context.js`) has evolved into a "God Object" anti-pattern, managing over 1400 lines of code that handles Firebase listeners, state management, atomic operations, settings, and business logic across multiple domains (customers, transactions, suppliers, fabrics, partner products, and daily cash operations). This monolithic structure makes the code brittle, difficult to test, and hard to maintain. This feature will refactor the DataContext using the Composition Pattern, breaking it into smaller, focused custom hooks that each handle a single domain of responsibility.

## Glossary

- **DataContext**: The React Context Provider that currently manages all application state and Firebase operations
- **God Object**: An anti-pattern where a single object knows too much or does too much
- **Composition Pattern**: A design pattern where complex functionality is built by combining smaller, focused components
- **Custom Hook**: A reusable React hook that encapsulates specific logic and state management
- **Firebase Listener**: A real-time subscription to Firebase database changes
- **Atomic Operation**: A database operation that executes as a single, indivisible unit
- **Domain**: A specific area of business logic (e.g., customers, transactions, fabrics)
- **CRUD Operations**: Create, Read, Update, Delete operations for data entities

## Requirements

### Requirement 1

**User Story:** As a developer, I want customer-related logic separated into its own hook, so that I can test and maintain customer functionality independently.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Customer Hook SHALL manage all customer state including customers array and loading state
2. WHEN Firebase customer data changes THEN the Customer Hook SHALL update the customers state with debounced updates
3. WHEN a customer is added THEN the Customer Hook SHALL execute the addCustomer operation and return the new customer ID
4. WHEN a customer is updated THEN the Customer Hook SHALL execute the updateCustomer operation with validation
5. WHEN a customer is deleted THEN the Customer Hook SHALL execute the deleteCustomer operation and handle associated transactions
6. WHEN customer due is calculated THEN the Customer Hook SHALL use memoized calculations for performance

### Requirement 2

**User Story:** As a developer, I want transaction-related logic separated into its own hook, so that I can manage transaction complexity independently from other domains.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Transaction Hook SHALL manage all transaction state including transactions array and loading state
2. WHEN Firebase transaction data changes THEN the Transaction Hook SHALL update the transactions state with debounced updates
3. WHEN a transaction is added THEN the Transaction Hook SHALL execute the addTransaction operation with validation
4. WHEN a transaction is updated THEN the Transaction Hook SHALL execute the updateTransaction operation
5. WHEN a transaction is deleted THEN the Transaction Hook SHALL execute the deleteTransaction operation
6. WHEN memo details are requested THEN the Transaction Hook SHALL return grouped transaction data by memo number
7. WHEN payment is added to a memo THEN the Transaction Hook SHALL update the memo and recalculate dues

### Requirement 3

**User Story:** As a developer, I want supplier-related logic separated into its own hook, so that supplier operations are isolated and testable.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Supplier Hook SHALL manage suppliers and supplier transactions state
2. WHEN Firebase supplier data changes THEN the Supplier Hook SHALL update the suppliers state with debounced updates
3. WHEN a supplier is added THEN the Supplier Hook SHALL validate required fields and execute the addSupplier operation
4. WHEN a supplier is updated THEN the Supplier Hook SHALL execute the updateSupplier operation
5. WHEN a supplier is deleted THEN the Supplier Hook SHALL delete associated transactions and then delete the supplier
6. WHEN a supplier transaction is added THEN the Supplier Hook SHALL update the supplier total due atomically

### Requirement 4

**User Story:** As a developer, I want fabric inventory logic separated into its own hook, so that inventory management is decoupled from other business logic.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Fabric Hook SHALL manage fabrics state with nested batches
2. WHEN Firebase fabric data changes THEN the Fabric Hook SHALL transform the data structure and update state
3. WHEN a fabric is added THEN the Fabric Hook SHALL execute the addFabric operation via FabricService
4. WHEN a fabric batch is added THEN the Fabric Hook SHALL execute the addFabricBatch operation
5. WHEN inventory is reduced for a sale THEN the Fabric Hook SHALL acquire batch locks and reduce quantities atomically
6. WHEN a fabric is deleted THEN the Fabric Hook SHALL remove the fabric and all associated batches

### Requirement 5

**User Story:** As a developer, I want daily cash operations separated into their own hook, so that cash flow tracking is independent and maintainable.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Daily Cash Hook SHALL manage both income and expense transaction arrays
2. WHEN Firebase daily cash data changes THEN the Daily Cash Hook SHALL update income and expense states separately
3. WHEN a daily cash transaction is added THEN the Daily Cash Hook SHALL validate amounts and route to correct collection
4. WHEN a daily cash transaction is updated THEN the Daily Cash Hook SHALL move the transaction between collections if needed
5. WHEN a daily cash transaction is deleted THEN the Daily Cash Hook SHALL update related customer transactions if applicable
6. WHEN a sale transaction is recorded THEN the Daily Cash Hook SHALL synchronize with customer transaction deposits

### Requirement 6

**User Story:** As a developer, I want partner product operations separated into their own hook, so that partner accounting is isolated from core business logic.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Partner Product Hook SHALL manage partner products state
2. WHEN Firebase partner product data changes THEN the Partner Product Hook SHALL update the partner products state
3. WHEN a partner is added to a product THEN the Partner Product Hook SHALL prevent duplicate partners
4. WHEN a transaction is added to a partner THEN the Partner Product Hook SHALL validate the partner exists
5. WHEN a partner name is updated THEN the Partner Product Hook SHALL update all references atomically
6. WHEN a partner transaction is deleted THEN the Partner Product Hook SHALL remove it from the partner account

### Requirement 7

**User Story:** As a developer, I want settings management separated into its own hook, so that application configuration is decoupled from business logic.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Settings Hook SHALL load settings from Firebase with default values
2. WHEN settings are updated THEN the Settings Hook SHALL validate required fields before saving
3. WHEN settings are saved THEN the Settings Hook SHALL update both Firebase and local state atomically
4. WHEN settings fail validation THEN the Settings Hook SHALL throw an error with specific validation messages
5. WHEN Firebase settings change THEN the Settings Hook SHALL update local state reactively

### Requirement 8

**User Story:** As a developer, I want connection state monitoring separated into its own hook, so that network status handling is reusable across the application.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Connection Hook SHALL monitor Firebase connection status
2. WHEN connection is established THEN the Connection Hook SHALL update state to connected
3. WHEN connection is lost THEN the Connection Hook SHALL update state to disconnected
4. WHEN connection is restored THEN the Connection Hook SHALL trigger offline queue processing
5. WHEN operations are queued offline THEN the Connection Hook SHALL maintain the offline queue state

### Requirement 9

**User Story:** As a developer, I want the refactored DataContext to compose all domain hooks, so that the context provides a unified interface without containing implementation details.

#### Acceptance Criteria

1. WHEN DataContext initializes THEN the DataContext SHALL instantiate all domain hooks
2. WHEN DataContext provides context value THEN the DataContext SHALL expose all hook states and operations
3. WHEN a domain hook updates state THEN the DataContext SHALL propagate changes to consumers
4. WHEN DataContext is used THEN the DataContext SHALL contain no direct Firebase listener logic
5. WHEN DataContext is used THEN the DataContext SHALL contain no direct CRUD operation implementations
6. WHEN performance metrics are requested THEN the DataContext SHALL delegate to the performance tracking system

### Requirement 10

**User Story:** As a developer, I want each custom hook to be independently testable, so that I can write focused unit tests for each domain.

#### Acceptance Criteria

1. WHEN a custom hook is tested THEN the hook SHALL not require the full DataContext to be mounted
2. WHEN a custom hook is tested THEN the hook SHALL accept mocked Firebase references as parameters
3. WHEN a custom hook is tested THEN the hook SHALL expose all operations for verification
4. WHEN a custom hook is tested THEN the hook SHALL handle errors independently without affecting other domains
5. WHEN a custom hook is tested THEN the hook SHALL use dependency injection for services
