# BhaiyaPos - Point of Sale System

A modern, feature-rich Point of Sale (POS) system built with Next.js and Firebase Realtime Database. This application helps businesses manage customers, inventory (fabrics), transactions, suppliers, and cash operations with a focus on reliability, performance, and data consistency.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Features

### Core Functionality
- **Customer Management**: Track customers with detailed transaction history organized by memo
- **Inventory Management**: Manage fabric inventory with FIFO batch tracking
- **Transaction Processing**: Create sales transactions with memo-based organization
- **Payment Tracking**: Link payments to specific memos with automatic due calculation
- **Supplier Management**: Track suppliers and manage purchase transactions
- **Cash Book**: Monitor cash flow with detailed transaction records
- **Expense Tracking**: Record and categorize business expenses

### Technical Features
- **Offline Support**: Queue operations when offline and sync when connection restored
- **Real-time Updates**: Live data synchronization using Firebase Realtime Database
- **Error Handling**: Comprehensive error classification and user-friendly messages
- **Performance Optimization**: Memoization, pagination, and debounced updates
- **Type Safety**: JSDoc annotations throughout the codebase
- **Comprehensive Testing**: Unit tests, property-based tests, and integration tests
- **Security**: Input sanitization, authentication validation, session management, and Firebase security rules
- **Security Monitoring**: Automated security checks and vulnerability scanning

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Firebase Realtime Database, Firebase Authentication
- **UI Components**: Radix UI, Lucide Icons
- **Testing**: Jest, React Testing Library, fast-check (property-based testing)
- **State Management**: React Context API
- **Date Handling**: date-fns
- **PDF Generation**: jsPDF

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase account and project
- Firebase CLI (for emulator)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bhaiyaPos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   
   Create a `.env.local` file in the root directory with your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Deploy Firebase security rules**
   ```bash
   firebase deploy --only database
   ```

5. **Deploy Firebase indexes**
   ```bash
   firebase deploy --only database:indexes
   ```

### Development

1. **Start the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

2. **Run tests**
   ```bash
   # Run tests in watch mode
   npm test

   # Run tests with coverage
   npm run test:coverage

   # Run integration tests
   npm run test:integration

   # Run performance tests
   npm run test:performance
   ```

3. **Start Firebase emulator** (for testing)
   ```bash
   npm run emulator
   ```

4. **Lint code**
   ```bash
   npm run lint
   ```

### Security Checks

```bash
# Run comprehensive security check
node scripts/security-check.js

# Run security tests only
npm test -- --testPathPatterns="(authValidation|sanitization|sessionManager|sessionTimeout|authenticationValidation)" --watchAll=false

# Check for dependency vulnerabilities
npm audit

# Fix dependency vulnerabilities
npm audit fix
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start

# Build and analyze bundle size
npm run build:analyze
```

### Deployment

```bash
# Run pre-deployment checks
npm run predeploy

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Run health check
npm run health-check:production

# Rollback if needed
npm run rollback:production
```

For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Project Structure

```
bhaiyaPos/
├── src/
│   ├── app/                    # Next.js app directory (pages and routes)
│   │   ├── cashbook/          # Cash book page
│   │   ├── cashmemo/          # Cash memo page
│   │   ├── customers/         # Customer management pages
│   │   ├── inventory/         # Inventory management pages
│   │   ├── login/             # Authentication page
│   │   ├── partners/          # Partner management pages
│   │   ├── reports/           # Report pages
│   │   ├── settings/          # Settings page
│   │   └── suppliers/         # Supplier management pages
│   ├── components/            # React components
│   │   ├── common/            # Reusable common components
│   │   └── ui/                # UI component library (Radix-based)
│   ├── contexts/              # React Context providers
│   │   ├── auth-context.js    # Authentication state
│   │   └── data-context.js    # Application data state
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   │   ├── calculations.js    # Business calculation functions
│   │   ├── errors.js          # Error handling utilities
│   │   ├── firebase.js        # Firebase initialization
│   │   ├── validation.js      # Input validation
│   │   ├── sanitization.js    # Input sanitization
│   │   ├── sessionManager.js  # Session management
│   │   ├── performanceTracker.js # Performance monitoring
│   │   ├── memoization.js     # Memoization utilities
│   │   └── pagination.js      # Pagination utilities
│   ├── services/              # Business logic layer
│   │   ├── atomicOperations.js      # Atomic transaction service
│   │   ├── customerService.js       # Customer operations
│   │   ├── fabricService.js         # Inventory operations
│   │   ├── transactionService.js    # Transaction operations
│   │   ├── supplierService.js       # Supplier operations
│   │   ├── cashTransactionService.js # Cash operations
│   │   └── backupService.js         # Data backup
│   ├── types/                 # Type definitions
│   │   └── models.js          # JSDoc type definitions
│   ├── utils/                 # Utility functions
│   │   ├── export.js          # Data export utilities
│   │   └── logger.js          # Logging utilities
│   └── __tests__/             # Test files
│       ├── integration/       # Integration tests
│       ├── performance/       # Performance tests
│       └── utils/             # Test utilities and generators
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # Architecture documentation
│   ├── API.md                 # API documentation
│   ├── TESTING.md             # Testing guide
│   ├── ONBOARDING.md          # Developer onboarding guide
│   ├── SECURITY.md            # Security documentation
│   └── PERFORMANCE.md         # Performance documentation
├── scripts/                   # Build and utility scripts
├── public/                    # Static assets
├── .env.local                 # Environment variables (not in git)
├── firebase.json              # Firebase configuration
├── database.rules.json        # Firebase security rules
├── firebase-indexes.json      # Firebase database indexes
├── jest.config.js             # Jest configuration
└── package.json               # Project dependencies
```

## Architecture

The application follows a layered architecture pattern:

### Layers

1. **Presentation Layer** (React Components)
   - UI components in `src/components/`
   - Page components in `src/app/`
   - Handles user interactions and displays data

2. **State Management Layer** (React Context)
   - `AuthContext`: Authentication state and user management
   - `DataContext`: Application data and Firebase listeners
   - Provides global state to components

3. **Service Layer** (Business Logic)
   - Encapsulates all Firebase operations
   - Implements business rules and validation
   - Provides clean API for data operations
   - Located in `src/services/`

4. **Data Access Layer** (Firebase)
   - Firebase Realtime Database for data persistence
   - Firebase Authentication for user management
   - Real-time synchronization

5. **Utility Layer**
   - Helper functions for calculations, formatting, validation
   - Error handling and logging
   - Performance tracking

### Key Design Patterns

- **Service Pattern**: Business logic encapsulated in service classes
- **Context Pattern**: Global state management with React Context
- **Atomic Operations**: Transaction-like behavior for multi-step operations
- **Repository Pattern**: Data access abstraction through services
- **Error Boundary Pattern**: Graceful error handling in UI

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Testing

The project uses a comprehensive testing strategy:

### Test Types

1. **Unit Tests**: Test individual functions and components in isolation
2. **Property-Based Tests**: Verify universal properties across many inputs using fast-check
3. **Integration Tests**: Test complete workflows with Firebase emulator
4. **Performance Tests**: Benchmark critical operations

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run integration tests only
npm run test:integration

# Run performance tests
npm run test:performance

# Run tests in CI mode
npm run test:ci
```

### Test Coverage

Current test coverage targets:
- Overall coverage: > 80%
- Service layer: > 90%
- Critical business logic: 100%

For detailed testing documentation, see [docs/TESTING.md](docs/TESTING.md).

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: System architecture and design patterns
- **[API.md](docs/API.md)**: Service layer API documentation
- **[TESTING.md](docs/TESTING.md)**: Testing strategy and guidelines
- **[ONBOARDING.md](docs/ONBOARDING.md)**: Developer onboarding guide
- **[SECURITY.md](docs/SECURITY.md)**: Security practices and guidelines
- **[SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)**: Comprehensive security audit report
- **[SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)**: Security maintenance checklist
- **[PERFORMANCE.md](docs/PERFORMANCE.md)**: Performance optimization guide
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Deployment guide and procedures
- **[DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)**: Pre-deployment checklist
- **[ROLLBACK_PLAN.md](docs/ROLLBACK_PLAN.md)**: Rollback procedures and recovery steps

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes with appropriate tests
3. Ensure all tests pass: `npm run test:ci`
4. Lint your code: `npm run lint`
5. Submit a pull request

### Code Standards

- Use JSDoc comments for all functions
- Follow existing code style and patterns
- Write tests for new functionality
- Update documentation as needed
- Keep components focused and single-purpose

### Commit Messages

Follow conventional commit format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions or changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Build process or tooling changes

## License

[Add your license information here]

## Support

For questions or issues, please [open an issue](link-to-issues) on GitHub.
