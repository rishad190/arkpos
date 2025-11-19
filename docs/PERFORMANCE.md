# Performance Optimizations

This document describes the performance optimizations implemented in the POS system.

## Overview

The system includes several performance optimization strategies:

1. **Performance Tracking** - Monitor operation performance and identify bottlenecks
2. **Memoization** - Cache expensive calculations to avoid redundant work
3. **Pagination** - Handle large lists efficiently
4. **Firebase Indexing** - Optimize database queries
5. **Debouncing** - Reduce excessive updates from Firebase listeners

## Performance Tracker

### Usage

```javascript
import performanceTracker from '@/lib/performanceTracker';

// Start tracking an operation
const handle = performanceTracker.startOperation('myOperation', { 
  context: 'additional info' 
});

// ... perform operation ...

// End tracking
const metrics = performanceTracker.endOperation(handle);
```

### Getting Metrics

```javascript
// Get overall performance metrics
const metrics = performanceTracker.getMetrics();
console.log(metrics.summary);
console.log(metrics.recentOperations);
console.log(metrics.activeOperations);

// Identify bottlenecks
const bottlenecks = performanceTracker.identifyBottlenecks();
bottlenecks.forEach(bottleneck => {
  console.log(`${bottleneck.operationName}: ${bottleneck.averageDuration}ms`);
  console.log(`Recommendation: ${bottleneck.recommendation}`);
});
```

### Performance Thresholds

- **Warning**: > 1 second
- **Slow**: > 2 seconds
- **Very Slow**: > 5 seconds

Operations exceeding these thresholds are logged and tracked.

## Memoization

### Built-in Memoized Calculations

The system includes pre-configured memoized calculations for common operations:

```javascript
import { memoizedCalculations } from '@/lib/memoization';

// Calculate customer due (cached for 5 seconds)
const due = memoizedCalculations.calculateCustomerDue(transactions, customerId);

// Calculate inventory totals (cached for 10 seconds)
const stats = memoizedCalculations.calculateInventoryTotals(fabrics);

// Calculate transaction statistics (cached for 5 seconds)
const txStats = memoizedCalculations.calculateTransactionStats(transactions);

// Group transactions by memo (cached for 5 seconds)
const memoGroups = memoizedCalculations.groupTransactionsByMemo(transactions, customerId);
```

### Custom Memoization

```javascript
import { memoize, memoizeAsync } from '@/lib/memoization';

// Memoize a synchronous function
const memoizedFn = memoize(expensiveFunction, {
  maxSize: 100,        // Maximum cache size
  ttl: 5000,           // Time to live in ms
  keyGenerator: (...args) => JSON.stringify(args) // Custom key generator
});

// Memoize an async function
const memoizedAsyncFn = memoizeAsync(asyncExpensiveFunction, {
  maxSize: 50,
  ttl: 10000
});
```

### Cache Configuration

- **Customer Due**: 200 entries, 5 second TTL
- **Inventory Totals**: 10 entries, 10 second TTL
- **Transaction Stats**: 10 entries, 5 second TTL
- **Memo Grouping**: 100 entries, 5 second TTL

## Pagination

### Basic Usage

```javascript
import { paginate } from '@/lib/pagination';

const result = paginate(items, page, pageSize);

console.log(result.items);           // Current page items
console.log(result.pagination);      // Pagination metadata
```

### React Hook

```javascript
import { usePagination } from '@/lib/pagination';

function MyComponent({ items }) {
  const {
    items: paginatedItems,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    changePageSize
  } = usePagination(items, 20);

  return (
    <div>
      {paginatedItems.map(item => <Item key={item.id} {...item} />)}
      
      <button onClick={previousPage} disabled={!pagination.hasPreviousPage}>
        Previous
      </button>
      
      <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
      
      <button onClick={nextPage} disabled={!pagination.hasNextPage}>
        Next
      </button>
    </div>
  );
}
```

### Utility Functions

```javascript
import { 
  filterAndPaginate, 
  sortAndPaginate,
  getPageNumbers,
  calculateOptimalPageSize 
} from '@/lib/pagination';

// Filter and paginate
const result = filterAndPaginate(
  items, 
  item => item.status === 'active',
  page,
  pageSize
);

// Sort and paginate
const result = sortAndPaginate(
  items,
  (a, b) => a.name.localeCompare(b.name),
  page,
  pageSize
);

// Get page numbers for UI
const pages = getPageNumbers(currentPage, totalPages, 5);
// Returns: [1, '...', 8, 9, 10, '...', 20]

// Calculate optimal page size based on viewport
const pageSize = calculateOptimalPageSize(50); // 50px per item
```

## Firebase Indexing

### Configuration

Firebase indexes are defined in `firebase-indexes.json`. These indexes optimize query performance for:

- **Customers**: Indexed by name, phone, createdAt, totalDue
- **Transactions**: Indexed by customerId, memoNumber, date, createdAt, type
- **Fabrics**: Indexed by name, category, createdAt
- **Suppliers**: Indexed by name, phone, createdAt, totalDue
- **Supplier Transactions**: Indexed by supplierId, date, createdAt
- **Daily Cash**: Indexed by date, type, reference, createdAt

### Applying Indexes

To apply these indexes to your Firebase Realtime Database:

1. Copy the contents of `firebase-indexes.json`
2. Go to Firebase Console > Realtime Database > Rules
3. Merge the `.indexOn` directives into your security rules

### Query Optimization

When querying Firebase, use indexed fields for better performance:

```javascript
// Good - uses index
const query = query(
  ref(db, 'transactions'),
  orderByChild('customerId'),
  equalTo(customerId)
);

// Bad - no index, slow
const query = query(
  ref(db, 'transactions'),
  orderByChild('someUnindexedField'),
  equalTo(value)
);
```

## Debouncing

### Firebase Listener Debouncing

Firebase listeners are automatically debounced with a 300ms delay to prevent excessive re-renders:

```javascript
// In data-context.js
const DEBOUNCE_DELAY = 300; // 300ms

// Listeners automatically debounce updates
onValue(collectionRef, (snapshot) => {
  if (debounceTimers[path]) {
    clearTimeout(debounceTimers[path]);
  }

  debounceTimers[path] = setTimeout(() => {
    // Process update
    setter(snapshot.val());
  }, DEBOUNCE_DELAY);
});
```

### Custom Debouncing

```javascript
import { debounce } from '@/lib/utils';

const debouncedSearch = debounce((searchTerm) => {
  // Perform search
}, 300);

// Call multiple times, only executes once after 300ms
debouncedSearch('query1');
debouncedSearch('query2');
debouncedSearch('query3'); // Only this executes
```

## Performance Monitoring

### In DataContext

The DataContext exposes performance monitoring methods:

```javascript
import { useData } from '@/contexts/data-context';

function PerformanceMonitor() {
  const { getPerformanceMetrics, getPerformanceBottlenecks } = useData();

  const metrics = getPerformanceMetrics();
  const bottlenecks = getPerformanceBottlenecks();

  return (
    <div>
      <h2>Performance Metrics</h2>
      <p>Total Operations: {metrics.summary.totalOperations}</p>
      <p>Slow Operations: {metrics.summary.slowOperations}</p>
      <p>Average Duration: {metrics.summary.averageDuration.toFixed(2)}ms</p>
      
      <h2>Bottlenecks</h2>
      {bottlenecks.map(b => (
        <div key={b.operationName}>
          <h3>{b.operationName}</h3>
          <p>Average: {b.averageDuration.toFixed(2)}ms</p>
          <p>Severity: {b.severity}</p>
          <p>{b.recommendation}</p>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

### 1. Use Memoization for Expensive Calculations

```javascript
// Bad - recalculates every render
const total = items.reduce((sum, item) => sum + item.price, 0);

// Good - memoized
const total = useMemo(
  () => items.reduce((sum, item) => sum + item.price, 0),
  [items]
);
```

### 2. Paginate Large Lists

```javascript
// Bad - renders all 10,000 items
{items.map(item => <Item key={item.id} {...item} />)}

// Good - renders only 20 items per page
const { items: paginatedItems } = usePagination(items, 20);
{paginatedItems.map(item => <Item key={item.id} {...item} />)}
```

### 3. Use Indexed Queries

```javascript
// Bad - full table scan
const allTransactions = await get(ref(db, 'transactions'));
const customerTxns = Object.values(allTransactions.val())
  .filter(t => t.customerId === customerId);

// Good - indexed query
const customerTxns = await get(
  query(
    ref(db, 'transactions'),
    orderByChild('customerId'),
    equalTo(customerId)
  )
);
```

### 4. Track Performance for Critical Operations

```javascript
async function criticalOperation() {
  const handle = performanceTracker.startOperation('criticalOperation');
  
  try {
    // Perform operation
    const result = await expensiveTask();
    return result;
  } finally {
    performanceTracker.endOperation(handle);
  }
}
```

### 5. Monitor and Optimize

Regularly check performance metrics and bottlenecks:

```javascript
// In development, log performance metrics
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const metrics = performanceTracker.getMetrics();
    console.log('Performance:', metrics.summary);
    
    const bottlenecks = performanceTracker.identifyBottlenecks();
    if (bottlenecks.length > 0) {
      console.warn('Bottlenecks detected:', bottlenecks);
    }
  }, 60000); // Every minute
}
```

## Performance Targets

- **Page Load**: < 3 seconds
- **Transaction Creation**: < 1 second
- **Customer List Render**: < 500ms
- **Search Results**: < 300ms
- **Slow Operation Rate**: < 5%

## Troubleshooting

### High Memory Usage

- Reduce memoization cache sizes
- Implement pagination for large lists
- Clear caches periodically

### Slow Queries

- Check Firebase indexes are applied
- Use query filters to reduce data transfer
- Consider denormalization for frequently accessed data

### Excessive Re-renders

- Use React.memo for expensive components
- Implement proper dependency arrays in useMemo/useCallback
- Check for unnecessary state updates

### Slow Calculations

- Profile with performance tracker
- Implement memoization
- Consider web workers for heavy computations
