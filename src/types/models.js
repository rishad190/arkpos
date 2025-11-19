/**
 * @fileoverview Type definitions for all data models in the POS system
 */

/**
 * @typedef {Object} Customer
 * @property {string} id - Unique customer identifier
 * @property {string} name - Customer name
 * @property {string} phone - Customer phone number
 * @property {string} [address] - Customer address (optional)
 * @property {string} [email] - Customer email (optional)
 * @property {number} [totalDue] - Aggregated due across all memos
 * @property {number} [transactionCount] - Number of transactions
 * @property {number} [memoCount] - Number of unique memos
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} [updatedAt] - ISO timestamp of last update
 * @property {CustomerMetadata} [metadata] - Additional customer metadata
 */

/**
 * @typedef {Object} CustomerMetadata
 * @property {string} [lastTransactionDate] - Date of last transaction
 * @property {string} [lastMemoNumber] - Last memo number
 * @property {number} [averageOrderValue] - Average order value
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id - Unique transaction identifier
 * @property {string} customerId - Associated customer ID
 * @property {string} [memoNumber] - Memo number for grouping transactions
 * @property {'sale'|'payment'} [type] - Transaction type (defaults to 'sale')
 * @property {number} total - Total transaction amount
 * @property {number} deposit - Amount paid/deposited
 * @property {number} [due] - Amount due (calculated as total - deposit)
 * @property {number} [amount] - Payment amount (for payment type transactions)
 * @property {string} date - Transaction date (YYYY-MM-DD format)
 * @property {Array<Product>} [products] - Products in the transaction
 * @property {string} [paymentMethod] - Payment method (cash, card, etc.)
 * @property {string} [note] - Additional notes
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} [updatedAt] - ISO timestamp of last update
 */

/**
 * @typedef {Object} Product
 * @property {string} fabricId - Associated fabric ID
 * @property {string} name - Product name
 * @property {string} [color] - Product color
 * @property {number} quantity - Product quantity
 * @property {number} unitPrice - Price per unit
 * @property {number} total - Total price (quantity * unitPrice)
 */

/**
 * @typedef {Object} MemoGroup
 * @property {string} memoNumber - Memo number
 * @property {string} customerId - Associated customer ID
 * @property {string} [customerName] - Customer name
 * @property {string} saleDate - Date of the sale
 * @property {number} totalAmount - Total amount of the sale
 * @property {number} paidAmount - Total amount paid (including initial deposit)
 * @property {number} dueAmount - Remaining due amount
 * @property {Transaction} saleTransaction - Original sale transaction
 * @property {Array<Transaction>} paymentTransactions - All payment transactions for this memo
 * @property {'paid'|'partial'|'unpaid'} status - Payment status
 */

/**
 * @typedef {Object} MemoDetails
 * @property {string} memoNumber - Memo number
 * @property {Transaction} saleTransaction - Original sale transaction
 * @property {Array<Transaction>} paymentTransactions - All payment transactions
 * @property {number} totalAmount - Total amount of the sale
 * @property {number} totalPaid - Total amount paid
 * @property {number} remainingDue - Remaining due amount
 * @property {'paid'|'partial'|'unpaid'} status - Payment status
 */

/**
 * @typedef {Object} PaymentData
 * @property {number} amount - Payment amount
 * @property {string} [date] - Payment date (defaults to today)
 * @property {string} [paymentMethod] - Payment method (defaults to 'cash')
 * @property {string} [note] - Additional notes
 */

/**
 * @typedef {Object} Fabric
 * @property {string} id - Unique fabric identifier
 * @property {string} name - Fabric name
 * @property {string} category - Fabric category
 * @property {string} unit - Unit of measurement (meters, yards, etc.)
 * @property {Object<string, Batch>} batches - Batches object keyed by batch ID
 * @property {number} [totalQuantity] - Total quantity across all batches (calculated)
 * @property {number} [lowStockThreshold] - Low stock alert threshold
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} [updatedAt] - ISO timestamp of last update
 */

/**
 * @typedef {Object} Batch
 * @property {Array<BatchItem>} items - Items in the batch
 * @property {string} purchaseDate - Date of purchase
 * @property {number} unitCost - Cost per unit
 * @property {string} [supplier] - Supplier name
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} [updatedAt] - ISO timestamp of last update
 */

/**
 * @typedef {Object} BatchItem
 * @property {string} colorName - Color name
 * @property {number} quantity - Quantity available
 * @property {string} [colorCode] - Color code (hex or other format)
 */

/**
 * @typedef {Object} BatchData
 * @property {string} fabricId - Associated fabric ID
 * @property {Array<BatchItem>} items - Items in the batch
 * @property {string} [purchaseDate] - Date of purchase
 * @property {number} [unitCost] - Cost per unit
 * @property {string} [supplier] - Supplier name
 */

/**
 * @typedef {Object} Supplier
 * @property {string} id - Unique supplier identifier
 * @property {string} name - Supplier name
 * @property {string} phone - Supplier phone number
 * @property {string} [address] - Supplier address
 * @property {string} [email] - Supplier email
 * @property {number} totalDue - Total amount due to supplier
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} [updatedAt] - ISO timestamp of last update
 */

/**
 * @typedef {Object} SupplierTransaction
 * @property {string} id - Unique transaction identifier
 * @property {string} supplierId - Associated supplier ID
 * @property {number} totalAmount - Total transaction amount
 * @property {number} paidAmount - Amount paid
 * @property {number} due - Amount due
 * @property {string} date - Transaction date
 * @property {string} [description] - Transaction description
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} [updatedAt] - ISO timestamp of last update
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {Array<ValidationError>} errors - Array of validation errors
 * @property {Array<ValidationWarning>} [warnings] - Array of validation warnings
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} field - Field name that failed validation
 * @property {string} message - Error message
 */

/**
 * @typedef {Object} ValidationWarning
 * @property {string} field - Field name with warning
 * @property {string} message - Warning message
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} operationCount - Total number of operations
 * @property {number} slowOperations - Number of slow operations
 * @property {number} averageResponseTime - Average response time in milliseconds
 * @property {string|null} lastOperationTime - ISO timestamp of last operation
 */

/**
 * @typedef {Object} InventoryStats
 * @property {number} totalStockValue - Total value of inventory
 * @property {number} totalQuantity - Total quantity of items
 * @property {number} lowStockItems - Number of items below threshold
 * @property {number} fabricCount - Total number of fabrics
 */

/**
 * @typedef {Object} TransactionStats
 * @property {number} totalRevenue - Total revenue from transactions
 * @property {number} totalDeposits - Total deposits received
 * @property {number} totalDue - Total amount due
 * @property {number} transactionCount - Number of transactions
 */

/**
 * @typedef {Object} DailyCashTransaction
 * @property {string} id - Unique transaction identifier
 * @property {string} date - Transaction date (YYYY-MM-DD)
 * @property {string} description - Transaction description
 * @property {number} [cashIn] - Cash received
 * @property {number} [cashOut] - Cash paid out
 * @property {'sale'|'expense'|'other'} [type] - Transaction type
 * @property {string} [reference] - Reference to related transaction (e.g., memo number)
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} [updatedAt] - ISO timestamp of last update
 */

/**
 * @typedef {Object} Settings
 * @property {StoreSettings} store - Store configuration
 * @property {NotificationSettings} notifications - Notification preferences
 * @property {AppearanceSettings} appearance - Appearance preferences
 * @property {SecuritySettings} security - Security settings
 */

/**
 * @typedef {Object} StoreSettings
 * @property {string} storeName - Store name
 * @property {string} address - Store address
 * @property {string} phone - Store phone number
 * @property {string} [email] - Store email
 * @property {string} currency - Currency symbol
 * @property {string} [logo] - Logo URL or path
 */

/**
 * @typedef {Object} NotificationSettings
 * @property {boolean} lowStockAlert - Enable low stock alerts
 * @property {boolean} duePaymentAlert - Enable due payment alerts
 * @property {boolean} newOrderAlert - Enable new order alerts
 * @property {boolean} emailNotifications - Enable email notifications
 */

/**
 * @typedef {Object} AppearanceSettings
 * @property {'light'|'dark'} theme - UI theme
 * @property {boolean} compactMode - Enable compact mode
 * @property {boolean} showImages - Show product images
 */

/**
 * @typedef {Object} SecuritySettings
 * @property {boolean} requirePassword - Require password for sensitive operations
 * @property {number} sessionTimeout - Session timeout in minutes
 * @property {boolean} backupEnabled - Enable automatic backups
 */

/**
 * @typedef {Object} PartnerProduct
 * @property {string} id - Unique product identifier
 * @property {string} name - Product name
 * @property {string} [description] - Product description
 * @property {Array<PartnerAccount>} [partnerAccounts] - Partner accounts for this product
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} [updatedAt] - ISO timestamp of last update
 */

/**
 * @typedef {Object} PartnerAccount
 * @property {string} name - Partner name
 * @property {Array<PartnerTransaction>} transactions - Partner transactions
 */

/**
 * @typedef {Object} PartnerTransaction
 * @property {number} id - Transaction ID
 * @property {string} date - Transaction date
 * @property {number} amount - Transaction amount
 * @property {string} [description] - Transaction description
 * @property {'debit'|'credit'} type - Transaction type
 */

/**
 * @typedef {Object} OperationHandle
 * @property {string} id - Unique operation identifier
 * @property {string} name - Operation name
 * @property {number} startTime - Start timestamp in milliseconds
 * @property {Object} context - Additional context about the operation
 */

/**
 * @typedef {Object} PerformanceReport
 * @property {PerformanceSummary} summary - Summary of performance metrics
 * @property {Array<RecentOperation>} recentOperations - Recent operations
 * @property {Array<ActiveOperation>} activeOperations - Currently active operations
 */

/**
 * @typedef {Object} PerformanceSummary
 * @property {number} totalOperations - Total number of operations
 * @property {number} slowOperations - Number of slow operations
 * @property {number} verySlowOperations - Number of very slow operations
 * @property {number} averageDuration - Average operation duration in ms
 * @property {number} totalDuration - Total duration of all operations in ms
 * @property {number} activeOperations - Number of currently active operations
 * @property {number} slowOperationPercentage - Percentage of slow operations
 */

/**
 * @typedef {Object} RecentOperation
 * @property {string} name - Operation name
 * @property {number} duration - Duration in milliseconds
 * @property {number} timestamp - End timestamp
 * @property {boolean} isSlow - Whether operation was slow
 */

/**
 * @typedef {Object} ActiveOperation
 * @property {string} name - Operation name
 * @property {number} duration - Current duration in milliseconds
 * @property {number} startTime - Start timestamp
 */

/**
 * @typedef {Object} Bottleneck
 * @property {string} operationName - Name of the operation
 * @property {number} count - Number of times operation was executed
 * @property {number} averageDuration - Average duration in milliseconds
 * @property {number} totalDuration - Total duration in milliseconds
 * @property {number} slowCount - Number of slow executions
 * @property {number} slowPercentage - Percentage of slow executions
 * @property {'high'|'medium'|'low'} severity - Severity level
 * @property {string} recommendation - Performance recommendation
 */

export {};
