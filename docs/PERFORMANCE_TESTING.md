# Performance Testing Guide

This document describes the performance testing infrastructure and how to use it.

## Overview

The performance testing suite validates that all operations meet established performance budgets and identifies potential bottlenecks.

## Performance Budgets

| Operation | Budget | Description |
|-----------|--------|-------------|
| Calculation | 100ms | Customer due, inventory totals, etc. |
| Pagination | 50ms | Paginating any size dataset |
| Search | 300ms | Searching customers, transactions |
| Memoization Hit | 10ms | Cache hit performance |
| Customer Lifecycle | 2000ms | Complete customer workflow |
| Inventory Update | 1000ms | Inventory operations |
| Transaction Processing | 1000ms | Processing transactions |
| Report Generation | 1500ms | Generating reports |

## Running Performance Tests

### Run All Performance Tests

```bash
npm run test:performance
```

### Run with Verbose Output

```bash
npm run perf:report
```

### Run Specific Test File

```bash
npm test -- performance.benchmark.test.js
```

## Test Categories

### 1. Benchmark Tests (`performance.benchmark.test.js`)

Tests individual operations against performance budgets:

- **Calculation Performance**: Customer due, inventory totals, memo grouping
- **Pagination Performance**: Small/large datasets, filtering, sorting
- **Memoization Performance**: Cache hits, eviction
- **Search Performance**: Customer and transaction search
- **Large Dataset Performance**: 10,000+ records

### 2. Integration Tests (`performance.integration.test.js`)

Tests real-world scenarios:

- **Customer Lifecycle**: Complete workflow from creation to reporting
- **Inventory Management**: Batch operations, FIFO reduction
- **Transaction Processing**: Bulk processing, memo grouping
- **Report Generation**: Financial and inventory reports
- **Optimization Impact**: Memoization and pagination benefits

## Performance Monitoring

### Using the Performance Tracker

```javascript
import performanceTracker from '@/lib/performanceTracker';

// Start tracking
const handle = performanceTracker.startOperation('myOperation', {
  context: 'additional info'
});

// ... perform operation ...

// End tracking
const metrics = performanceTracker.endOperation(handle);

console.log(`Duration: ${metrics.duration}ms`);
console.log(`Is slow: ${metrics.isSlow}`);
```

### Getting Performance Metrics

```javascript
// Get overall metrics
const metrics = performanceTracker.getMetrics();
console.log(metrics.summary);
console.log(metrics.recentOperations);
console.log(metrics.activeOperations);

// Identify bottlenecks
const bottlenecks = performanceTracker.identifyBottlenecks();
bottlenecks.forEach(b => {
  console.log(`${b.operationName}: ${b.averageDuration}ms`);
  console.log(`Recommendation: ${b.recommendation}`);
});
```

### Performance Dashboard Component

Use the `PerformanceDashboard` component to monitor performance in development:

```jsx
import PerformanceDashboard from '@/components/PerformanceDashboard';

function DevTools() {
  return (
    <div>
      <PerformanceDashboard />
    </div>
  );
}
```

## Bundle Size Analysis

### Analyze Current Build

```bash
npm run build:analyze
```

This will:
1. Build the Next.js application
2. Analyze bundle sizes
3. Check against size budgets
4. Report violations and recommendations

### Bundle Size Budgets

- **Total JS**: 500 KB
- **First Load JS**: 300 KB
- **Page JS**: 100 KB per page
- **Shared Chunks**: 200 KB

## Optimization Strategies

### 1. Memoization

Use memoization for expensive calculations:

```javascript
import { memoizedCalculations } from '@/lib/memoization';

// Automatically memoized
const due = memoizedCalculations.calculateCustomerDue(transactions, customerId);
const stats = memoizedCalculations.calculateInventoryTotals(fabrics);
```

### 2. Pagination

Paginate large lists:

```javascript
import { paginate } from '@/lib/pagination';

const result = paginate(items, page, pageSize);
// Only render result.items instead of all items
```

### 3. Firebase Indexing

Apply indexes from `firebase-indexes.json`:

```bash
# Deploy to Firebase
firebase deploy --only database
```

### 4. Debouncing

Firebase listeners are automatically debounced (300ms) in DataContext.

## Performance Testing Best Practices

### 1. Test with Realistic Data

```javascript
// Generate realistic test data
const transactions = Array.from({ length: 1000 }, () => 
  generateTransaction()
);
```

### 2. Measure Multiple Iterations

```javascript
// Run operation multiple times for accurate measurement
for (let i = 0; i < 100; i++) {
  const handle = performanceTracker.startOperation('test');
  performOperation();
  performanceTracker.endOperation(handle);
}
```

### 3. Test Edge Cases

- Empty datasets
- Very large datasets (10,000+ items)
- Complex nested data structures
- Concurrent operations

### 4. Compare Optimized vs Unoptimized

```javascript
// Without optimization
const handle1 = performanceTracker.startOperation('unoptimized');
const result1 = expensiveOperation();
const metrics1 = performanceTracker.endOperation(handle1);

// With optimization
const handle2 = performanceTracker.startOperation('optimized');
const result2 = optimizedOperation();
const metrics2 = performanceTracker.endOperation(handle2);

// Compare
expect(metrics2.duration).toBeLessThan(metrics1.duration);
```

## Interpreting Results

### Slow Operations

Operations are flagged as slow if they exceed thresholds:

- **Warning**: > 1 second
- **Slow**: > 2 seconds
- **Very Slow**: > 5 seconds

### Bottleneck Identification

Bottlenecks are identified when:

1. Average duration exceeds slow threshold
2. More than 20% of operations are slow
3. Total time spent is significant (> 10 seconds)

### Recommendations

The performance tracker provides automatic recommendations:

- **Firebase/fetch operations**: Add indexes, caching, or pagination
- **Calculations**: Use memoization or web workers
- **Rendering**: Use React.memo, useMemo, or virtualization
- **High failure rate**: Investigate error handling and retry logic

## Continuous Monitoring

### Development

1. Use PerformanceDashboard component
2. Monitor console for slow operation warnings
3. Run performance tests before committing

### CI/CD

```bash
# In CI pipeline
npm run test:performance
npm run build:analyze
```

### Production

1. Implement performance monitoring service
2. Track key metrics:
   - Page load time
   - Time to interactive
   - Operation durations
   - Error rates
3. Set up alerts for performance degradation

## Troubleshooting

### Tests Failing

1. Check if operations genuinely exceed budgets
2. Review recent code changes
3. Profile with performance tracker
4. Identify bottlenecks
5. Apply optimizations

### High Memory Usage

1. Reduce memoization cache sizes
2. Implement pagination
3. Clear caches periodically
4. Check for memory leaks

### Slow Queries

1. Verify Firebase indexes are applied
2. Use query filters
3. Reduce data transfer
4. Consider denormalization

## Performance Checklist

Before deploying:

- [ ] All performance tests passing
- [ ] Bundle size within budget
- [ ] No critical bottlenecks identified
- [ ] Firebase indexes deployed
- [ ] Memoization configured appropriately
- [ ] Pagination implemented for large lists
- [ ] Performance monitoring enabled

## Resources

- [Performance Tracker API](../src/lib/performanceTracker.js)
- [Memoization Utilities](../src/lib/memoization.js)
- [Pagination Utilities](../src/lib/pagination.js)
- [Performance Documentation](./PERFORMANCE.md)
- [Firebase Indexes](../firebase-indexes.json)

## Support

For performance issues or questions:

1. Review performance dashboard
2. Check bottleneck recommendations
3. Consult this documentation
4. Profile with performance tracker
5. Optimize based on findings
