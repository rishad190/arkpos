/**
 * Firebase collection references
 */
export const COLLECTION_REFS = {
  CUSTOMERS: "customers",
  TRANSACTIONS: "transactions",
  DAILY_CASH: "dailyCash",
  FABRIC_BATCHES: "fabricBatches",
  FABRICS: "fabrics",
  SUPPLIERS: "suppliers",
  SUPPLIER_TRANSACTIONS: "supplierTransactions",
};

/**
 * Customer constants
 */
export const CUSTOMER_CONSTANTS = {
  CUSTOMERS_PER_PAGE: 10,
  DUE_AMOUNT_THRESHOLD: 1000,
  FILTER_OPTIONS: {
    ALL: "all",
    ACTIVE: "active",
    INACTIVE: "inactive",
    HAS_DUE: "hasDue",
  },
  CURRENCY_SYMBOL: "৳",
  STORE_OPTIONS: {
    ALL: "all",
    STORE1: "STORE1",
    STORE2: "STORE2",
  },
  SORT_OPTIONS: {
    NAME_ASC: "name_asc",
    NAME_DESC: "name_desc",
    DATE_ASC: "date_asc",
    DATE_DESC: "date_desc",
    DUE_ASC: "due_asc",
    DUE_DESC: "due_desc",
  },
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  GENERIC_ERROR: "An error occurred. Please try again.",
  ADD_ERROR: "Failed to add item. Please try again.",
  UPDATE_ERROR: "Failed to update item. Please try again.",
  DELETE_ERROR: "Failed to delete item. Please try again.",
  DELETE_CONFIRMATION: "Are you sure you want to delete this item?",
  INSUFFICIENT_STOCK: "Insufficient stock available.",
  AUTHENTICATION_ERROR: "Authentication failed. Please login again.",
  INVALID_FORM: "Please fix the errors in the form before submitting.",
};

/**
 * Page titles
 */
export const PAGE_TITLES = {
  DASHBOARD: "Dashboard",
  CUSTOMERS: "Customers",
  INVENTORY: "Inventory",
  SUPPLIERS: "Suppliers",
  CASHBOOK: "Cash Book",
  SETTINGS: "Settings",
  TRANSACTIONS: "Transactions",
  CASH_MEMO: "Cash Memo",
  REPORTS: "Reports",
};

/**
 * Unit and category constants
 */
export const FABRIC_CONSTANTS = {
  UNITS: [
    { value: "METER", label: "Meter" },
    { value: "YARD", label: "Yard" },
    { value: "PIECE", label: "Piece" },
  ],
  CATEGORIES: [
    { value: "COTTON", label: "Cotton" },
    { value: "POLYESTER", label: "Polyester" },
    { value: "MIXED", label: "Mixed" },
  ],
};

export const TRANSACTION_CONSTANTS = {
  TRANSACTIONS_PER_PAGE: 10,
  STORE_OPTIONS: {
    ALL: "all",
    STORE1: "STORE1",
    STORE2: "STORE2",
  },
};
