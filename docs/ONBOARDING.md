# Developer Onboarding Guide

Welcome to the BhaiyaPos development team! This guide will help you get up to speed with the codebase, development workflow, and best practices.

## Table of Contents

- [Getting Started](#getting-started)
- [Understanding the Codebase](#understanding-the-codebase)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- **Git** for version control
- **Firebase CLI**: `npm install -g firebase-tools`
- **Code Editor**: VS Code recommended

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bhaiyaPos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```
   
   Ask your team lead for the development Firebase credentials.

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) to view the app.

5. **Run tests to verify setup**
   ```bash
   npm test
   ```

### First Day Checklist

- [ ] Clone repository and install dependencies
- [ ] Set up Firebase credentials
- [ ] Run development server successfully
- [ ] Run test suite successfully
- [ ] Read through this onboarding guide
- [ ] Review [ARCHITECTURE.md](ARCHITECTURE.md)
- [ ] Review [API.md](API.md)
- [ ] Set up your development environment


## Understanding the Codebase

### Project Structure Overview

```
bhaiyaPos/
├── src/
│   ├── app/              # Next.js pages and routes
│   ├── components/       # React components
│   ├── contexts/         # React Context providers
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   ├── services/         # Business logic layer
│   ├── types/            # Type definitions
│   └── utils/            # Helper functions
├── docs/                 # Documentation
├── public/               # Static assets
└── __tests__/            # Test files
```

### Key Concepts

#### 1. Layered Architecture

The application follows a strict layered architecture:

```
UI Components → Context → Services → Firebase
```

- **UI Components**: Handle presentation and user interaction
- **Context**: Manage global state and provide data to components
- **Services**: Encapsulate business logic and Firebase operations
- **Firebase**: Data persistence layer

**Rule**: Components should never directly access Firebase. Always go through services.

#### 2. Service Layer Pattern

All business logic is encapsulated in service classes:

```javascript
// Good: Using service
const customerId = await customerService.addCustomer(data);

// Bad: Direct Firebase access
const ref = database.ref('customers').push();
await ref.set(data);
```

#### 3. Atomic Operations

Multi-step operations use the AtomicOperationService for transaction-like behavior:

```javascript
await atomicOperations.execute(
  'operationName',
  async () => {
    // Multiple operations that should succeed or fail together
  },
  async () => {
    // Rollback logic if operation fails
  }
);
```

#### 4. Memo-Based Transaction Organization

Transactions are organized by memo number:
- Each sale creates a memo
- Payments are linked to specific memos
- Customer dues are calculated per memo

#### 5. FIFO Inventory Management

Inventory reduction uses First-In-First-Out (FIFO) strategy:
- Oldest batches are used first
- Prevents negative stock levels
- Tracks which batches were used

### Important Files to Know

#### Configuration Files

- `package.json`: Dependencies and scripts
- `jest.config.js`: Test configuration
- `next.config.mjs`: Next.js configuration
- `firebase.json`: Firebase configuration
- `database.rules.json`: Firebase security rules
- `firebase-indexes.json`: Database indexes

#### Core Services

- `src/services/atomicOperations.js`: Transaction-like operations
- `src/services/customerService.js`: Customer management
- `src/services/transactionService.js`: Transaction and payment management
- `src/services/fabricService.js`: Inventory management
- `src/services/supplierService.js`: Supplier management

#### Context Providers

- `src/contexts/auth-context.js`: Authentication state
- `src/contexts/data-context.js`: Application data state

#### Utility Libraries

- `src/lib/errors.js`: Error handling
- `src/lib/validation.js`: Input validation
- `src/lib/calculations.js`: Business calculations
- `src/lib/performanceTracker.js`: Performance monitoring

### Data Flow Example

Let's trace how creating a customer works:

1. User fills out form in `AddCustomerDialog.jsx`
2. Form submission calls `handleSubmit()`
3. Component calls `addCustomer()` from `DataContext`
4. Context calls `customerService.addCustomer()`
5. Service validates input
6. Service calls Firebase to create customer
7. Firebase listener triggers in Context
8. Context updates state
9. Component re-renders with new data

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches
- `fix/*`: Bug fix branches

### Creating a Feature

1. **Create a branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Write code following our standards
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm run lint
   npm run test:ci
   npm run test:integration
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `test:` Test additions or changes
   - `refactor:` Code refactoring
   - `perf:` Performance improvements
   - `chore:` Build process or tooling changes

5. **Push and create pull request**
   ```bash
   git push origin feature/my-feature
   ```
   
   Create a pull request on GitHub with:
   - Clear description of changes
   - Link to related issues
   - Screenshots if UI changes
   - Test results

### Code Review Process

1. Submit pull request
2. Automated tests run (CI/CD)
3. Team member reviews code
4. Address feedback
5. Approval and merge

### Testing Requirements

All pull requests must include:
- Unit tests for new functions
- Property-based tests for complex logic
- Integration tests for new workflows
- Test coverage > 80%

## Code Standards

### JavaScript/JSX Style

- Use ES6+ features
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Use destructuring where appropriate

### Component Structure

```javascript
// Good component structure
import React from 'react';
import { useContext } from 'react';
import { DataContext } from '@/contexts/data-context';

/**
 * Component description
 * @param {Object} props - Component props
 * @param {string} props.customerId - Customer ID
 */
export default function CustomerDetail({ customerId }) {
  const { customers } = useContext(DataContext);
  const customer = customers.find(c => c.id === customerId);
  
  if (!customer) {
    return <div>Customer not found</div>;
  }
  
  return (
    <div>
      <h1>{customer.name}</h1>
      <p>{customer.phone}</p>
    </div>
  );
}
```

### Service Structure

```javascript
// Good service structure
const { AppError } = require('../lib/errors');
const { validateCustomer } = require('../lib/validation');

/**
 * Customer service for managing customer operations
 */
class CustomerService {
  constructor(database, logger) {
    this.db = database;
    this.logger = logger;
  }
  
  /**
   * Add a new customer
   * @param {Object} data - Customer data
   * @param {string} data.name - Customer name
   * @param {string} data.phone - Customer phone
   * @returns {Promise<string>} Customer ID
   * @throws {AppError} If validation fails
   */
  async addCustomer(data) {
    // Validate input
    const validation = validateCustomer(data);
    if (!validation.isValid) {
      throw new AppError('Validation failed', 'VALIDATION', {
        errors: validation.errors
      });
    }
    
    // Perform operation
    const ref = this.db.ref('customers').push();
    await ref.set({
      ...data,
      id: ref.key,
      createdAt: new Date().toISOString()
    });
    
    this.logger.info('Customer created', { customerId: ref.key });
    return ref.key;
  }
}

module.exports = CustomerService;
```

### JSDoc Comments

All functions must have JSDoc comments:

```javascript
/**
 * Calculate total due for a customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<number>} Total due amount
 * @throws {AppError} If customer not found
 */
async calculateCustomerDue(customerId) {
  // Implementation
}
```

### Error Handling

Always use AppError for application errors:

```javascript
const { AppError } = require('../lib/errors');

// Validation error
throw new AppError('Invalid input', 'VALIDATION', {
  errors: validationErrors
});

// Not found error
throw new AppError('Customer not found', 'NOT_FOUND', {
  customerId
});

// Network error
throw new AppError('Connection failed', 'NETWORK', {
  operation: 'fetchCustomers'
});
```

### Naming Conventions

- **Files**: camelCase for JS files, PascalCase for components
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Classes**: PascalCase
- **Functions**: camelCase, use verb prefixes (get, set, add, update, delete)
- **Components**: PascalCase
- **Hooks**: camelCase with `use` prefix

### Import Order

```javascript
// 1. External dependencies
import React from 'react';
import { useContext } from 'react';

// 2. Internal dependencies
import { DataContext } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';

// 3. Utilities
import { formatDate } from '@/lib/utils';

// 4. Styles
import styles from './MyComponent.module.css';
```


## Common Tasks

### Adding a New Service Method

1. **Define the method in the service class**
   ```javascript
   // src/services/customerService.js
   async getCustomersByCity(city) {
     const snapshot = await this.db.ref('customers')
       .orderByChild('city')
       .equalTo(city)
       .once('value');
     
     return Object.values(snapshot.val() || {});
   }
   ```

2. **Add JSDoc comments**
   ```javascript
   /**
    * Get customers by city
    * @param {string} city - City name
    * @returns {Promise<Array<Customer>>} Customers in the city
    */
   ```

3. **Write unit tests**
   ```javascript
   // src/services/__tests__/customerService.test.js
   it('should get customers by city', async () => {
     const customers = await customerService.getCustomersByCity('New York');
     expect(customers).toHaveLength(2);
   });
   ```

4. **Update API documentation**
   Add the method to `docs/API.md`

### Adding a New Component

1. **Create the component file**
   ```javascript
   // src/components/MyComponent.jsx
   export default function MyComponent({ prop1, prop2 }) {
     return <div>{/* component JSX */}</div>;
   }
   ```

2. **Add PropTypes or JSDoc**
   ```javascript
   /**
    * @param {Object} props
    * @param {string} props.prop1 - Description
    * @param {number} props.prop2 - Description
    */
   ```

3. **Write component tests**
   ```javascript
   // src/components/__tests__/MyComponent.test.jsx
   import { render, screen } from '@testing-library/react';
   import MyComponent from '../MyComponent';
   
   it('should render correctly', () => {
     render(<MyComponent prop1="test" prop2={42} />);
     expect(screen.getByText('test')).toBeInTheDocument();
   });
   ```

### Adding a New Page

1. **Create page file in app directory**
   ```javascript
   // src/app/my-page/page.js
   export default function MyPage() {
     return <div>My Page</div>;
   }
   ```

2. **Add to navigation if needed**
   Update `src/components/Navbar.js`

3. **Add loading state**
   ```javascript
   // src/app/my-page/loading.js
   export default function Loading() {
     return <div>Loading...</div>;
   }
   ```

### Adding Validation Rules

1. **Add validation function**
   ```javascript
   // src/lib/validation.js
   export function validateMyData(data) {
     const errors = [];
     
     if (!data.field1) {
       errors.push({ field: 'field1', message: 'Field1 is required' });
     }
     
     return {
       isValid: errors.length === 0,
       errors
     };
   }
   ```

2. **Write validation tests**
   ```javascript
   // src/lib/__tests__/validation.test.js
   it('should validate my data', () => {
     const result = validateMyData({ field1: 'value' });
     expect(result.isValid).toBe(true);
   });
   ```

3. **Use in service**
   ```javascript
   const validation = validateMyData(data);
   if (!validation.isValid) {
     throw new AppError('Validation failed', 'VALIDATION', {
       errors: validation.errors
     });
   }
   ```

### Running Firebase Emulator

1. **Start emulator**
   ```bash
   npm run emulator
   ```

2. **Access emulator UI**
   Open [http://localhost:4000](http://localhost:4000)

3. **Run tests against emulator**
   ```bash
   npm run test:integration
   ```

### Debugging

#### Using VS Code Debugger

1. Set breakpoints in your code
2. Press F5 or use Debug menu
3. Select "Jest Debug" configuration
4. Debug your tests

#### Using Chrome DevTools

1. Add `debugger;` statement in your code
2. Run with `--inspect` flag:
   ```bash
   node --inspect-brk node_modules/.bin/jest --runInBand
   ```
3. Open `chrome://inspect` in Chrome
4. Click "inspect" on your Node process

#### Logging

Use the logger utility:
```javascript
const logger = require('../utils/logger');

logger.info('Operation started', { customerId });
logger.warn('Slow operation detected', { duration });
logger.error('Operation failed', { error });
```

### Performance Optimization

#### Identifying Slow Operations

1. Check performance tracker logs
2. Run performance tests:
   ```bash
   npm run test:performance
   ```
3. Use Chrome DevTools Performance tab

#### Common Optimizations

- **Memoize expensive calculations**
  ```javascript
  const { memoize } = require('../lib/memoization');
  const expensiveFunction = memoize((input) => {
    // Expensive calculation
  });
  ```

- **Debounce Firebase listeners**
  Already implemented in DataContext (300ms)

- **Paginate large lists**
  ```javascript
  const { paginate } = require('../lib/pagination');
  const page = paginate(items, pageNumber, pageSize);
  ```

- **Use React.memo for expensive components**
  ```javascript
  export default React.memo(MyComponent);
  ```

## Troubleshooting

### Common Issues

#### "Firebase not initialized" Error

**Solution**: Ensure `.env.local` has all required Firebase credentials

#### Tests Failing with "Cannot find module"

**Solution**: 
```bash
npm install
npm test -- --clearCache
```

#### "Port 3000 already in use"

**Solution**:
```bash
# Kill process on port 3000
npx kill-port 3000
# Or use different port
PORT=3001 npm run dev
```

#### Firebase Emulator Won't Start

**Solution**:
```bash
# Check if ports are available
lsof -i :9000
lsof -i :4000

# Kill processes if needed
kill -9 <PID>

# Restart emulator
npm run emulator
```

#### Tests Timing Out

**Solution**:
```javascript
// Increase timeout for specific test
it('slow test', async () => {
  // Test code
}, 10000); // 10 second timeout

// Or globally in jest.config.js
module.exports = {
  testTimeout: 10000
};
```

### Getting Help

1. **Check documentation**
   - [ARCHITECTURE.md](ARCHITECTURE.md)
   - [API.md](API.md)
   - [TESTING.md](TESTING.md)

2. **Search existing issues**
   Check GitHub issues for similar problems

3. **Ask the team**
   - Slack channel: #bhaiyapos-dev
   - Team meetings: Tuesdays and Thursdays

4. **Create an issue**
   If you find a bug or have a feature request

## Resources

### Documentation

- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](API.md)
- [Testing Guide](TESTING.md)
- [Security Documentation](SECURITY.md)
- [Performance Guide](PERFORMANCE.md)

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Jest Documentation](https://jestjs.io/)
- [fast-check Documentation](https://fast-check.dev/)

### Learning Path

#### Week 1: Getting Familiar
- Set up development environment
- Read all documentation
- Run and explore the application
- Review existing code

#### Week 2: Small Contributions
- Fix a small bug
- Add a unit test
- Update documentation
- Review pull requests

#### Week 3: Feature Development
- Pick up a small feature
- Write tests
- Submit pull request
- Respond to code review

#### Week 4: Independent Work
- Work on medium-sized features
- Help onboard new developers
- Contribute to architecture discussions

### Code Review Checklist

When reviewing code, check for:

- [ ] Code follows style guidelines
- [ ] All functions have JSDoc comments
- [ ] Tests are included and passing
- [ ] No console.log statements (use logger)
- [ ] Error handling is appropriate
- [ ] No direct Firebase access (use services)
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] Documentation updated if needed

### Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm start                      # Start production server

# Testing
npm test                       # Run tests in watch mode
npm run test:ci                # Run all tests once
npm run test:coverage          # Run with coverage
npm run test:integration       # Run integration tests
npm run test:performance       # Run performance tests

# Linting
npm run lint                   # Run ESLint

# Firebase
npm run emulator               # Start Firebase emulator
firebase deploy                # Deploy to Firebase

# Analysis
npm run build:analyze          # Analyze bundle size
npm run perf:report            # Generate performance report
```

## Welcome!

Congratulations on completing the onboarding guide! You should now have a solid understanding of the BhaiyaPos codebase and development workflow.

Remember:
- Ask questions when you're unsure
- Follow the code standards
- Write tests for your code
- Keep documentation updated
- Collaborate with the team

Happy coding! 🚀
