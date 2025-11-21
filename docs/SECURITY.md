# Security Enhancements Documentation

This document outlines the security enhancements implemented in the POS system to protect against unauthorized access, injection attacks, and session hijacking.

## Overview

The security enhancements include:
1. **Firebase Security Rules** - Enhanced database-level access control
2. **Authentication Validation** - Mandatory authentication checks on all operations
3. **Input Sanitization** - Protection against XSS and injection attacks
4. **Session Management** - Automatic timeout for inactive sessions
5. **Credential Management** - Secure handling of authentication tokens

## Firebase Security Rules

### Location
`database.rules.json`

### Features
- **Authentication Required**: All read/write operations require authentication
- **Data Validation**: Server-side validation of data structure and types
- **Indexing**: Optimized queries with proper indexes
- **Field Validation**: Ensures required fields are present and valid

### Collections Protected
- `customers` - Customer data with name/phone validation
- `transactions` - Transaction data with type validation (sale/payment)
- `fabrics` - Inventory data with category validation
- `suppliers` - Supplier data with name validation
- `cashTransactions` - Cash flow data with amount validation
- `expenses` - Expense tracking with amount validation

### Example Rules
```json
{
  "customers": {
    "$customerId": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".validate": "newData.hasChildren(['name', 'phone', 'createdAt']) && 
                    newData.child('name').isString() && 
                    newData.child('name').val().length > 0"
    }
  }
}
```

## Authentication Validation

### Location
`src/lib/authValidation.js`

### Functions

#### `requireAuth()`
Validates that a user is authenticated before allowing operations.
```javascript
import { requireAuth } from '@/lib/authValidation';

async function someOperation() {
  requireAuth(); // Throws AppError if not authenticated
  // ... proceed with operation
}
```

#### `getCurrentUserId()`
Gets the current authenticated user's ID.
```javascript
const userId = getCurrentUserId();
```

#### `isAuthenticated()`
Checks if a user is currently authenticated.
```javascript
if (isAuthenticated()) {
  // User is logged in
}
```

#### `getAuthToken()`
Retrieves the current authentication token.
```javascript
const token = await getAuthToken();
```

#### `validateTokenFreshness(maxAgeMinutes)`
Ensures the authentication token hasn't expired.
```javascript
await validateTokenFreshness(60); // Token must be less than 60 minutes old
```

### Integration with Services

All service methods now include authentication validation:
```javascript
async addCustomer(customerData) {
  // Validate authentication
  requireAuth();
  
  // Sanitize input data
  const sanitizedData = sanitizeObject(customerData);
  
  // ... rest of the method
}
```

## Input Sanitization

### Location
`src/lib/sanitization.js`

### Functions

#### `sanitizeString(input)`
Escapes HTML and special characters to prevent XSS attacks.
```javascript
const safe = sanitizeString('<script>alert("xss")</script>');
// Result: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

#### `sanitizeObject(obj)`
Recursively sanitizes all string values in an object.
```javascript
const data = {
  name: '<b>John</b>',
  email: 'test@example.com'
};
const safe = sanitizeObject(data);
```

#### `containsSQLInjection(input)`
Detects SQL injection patterns in user input.
```javascript
if (containsSQLInjection(userInput)) {
  // Reject the input
}
```

#### `sanitizeEmail(email)`
Validates and normalizes email addresses.
```javascript
const email = sanitizeEmail('  Test@Example.COM  ');
// Result: 'test@example.com'
```

#### `sanitizePhone(phone)`
Removes non-digit characters and validates phone numbers.
```javascript
const phone = sanitizePhone('(123) 456-7890');
// Result: '1234567890'
```

#### `sanitizeNumber(value, options)`
Validates and rounds numeric input with min/max constraints.
```javascript
const amount = sanitizeNumber('123.456', { decimals: 2, min: 0, max: 10000 });
// Result: 123.46
```

#### `sanitizeSearchQuery(query)`
Sanitizes search queries to prevent injection attacks.
```javascript
const safe = sanitizeSearchQuery(userSearchInput);
```

### Usage in Services

All user input is sanitized before processing:
```javascript
async addCustomer(customerData) {
  requireAuth();
  
  // Sanitize input data
  const sanitizedData = sanitizeObject(customerData);
  
  // Validate sanitized data
  const validationResult = this.validateCustomerData(sanitizedData);
  // ...
}
```

## Session Management

### Location
`src/lib/sessionManager.js`

### Features
- **Automatic Timeout**: Sessions expire after 30 minutes of inactivity
- **Activity Tracking**: Monitors user interactions to reset timeout
- **Graceful Logout**: Automatically signs out expired sessions
- **Session Info**: Provides real-time session status

### Configuration

Initialize in `AuthProvider`:
```javascript
import { initializeSessionManager } from '@/lib/sessionManager';

initializeSessionManager({
  timeout: 30 * 60 * 1000, // 30 minutes
  onExpired: () => {
    router.push('/login');
  },
});
```

### Functions

#### `validateSession()`
Checks if the current session is still valid.
```javascript
import { validateSession } from '@/lib/sessionManager';

try {
  validateSession();
  // Session is valid
} catch (error) {
  // Session has expired
}
```

#### `getSessionInfo()`
Returns current session information.
```javascript
const info = getSessionInfo();
console.log(info.timeUntilExpiry); // Milliseconds until expiry
console.log(info.isActive); // Boolean
```

#### `resetSession()`
Resets the session timeout (called on user activity).
```javascript
resetSession();
```

### Activity Tracking

The session manager automatically tracks these events:
- Mouse movements
- Mouse clicks
- Keyboard input
- Scrolling
- Touch events

## Credential Management

### Environment Variables

All Firebase credentials are stored in environment variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Best Practices

1. **Never commit credentials** to version control
2. **Use environment-specific configs** for dev/staging/production
3. **Rotate credentials regularly**
4. **Limit API key restrictions** in Firebase console
5. **Monitor authentication logs** for suspicious activity

## Security Testing

### Test Coverage

All security features have comprehensive test coverage:
- `src/lib/__tests__/sanitization.test.js` - Input sanitization tests
- `src/lib/__tests__/authValidation.test.js` - Authentication validation tests
- `src/lib/__tests__/sessionManager.test.js` - Session management tests

### Running Security Tests

```bash
# Run all security tests
npm test -- src/lib/__tests__/sanitization.test.js --watchAll=false
npm test -- src/lib/__tests__/authValidation.test.js --watchAll=false
npm test -- src/lib/__tests__/sessionManager.test.js --watchAll=false

# Run all tests
npm test -- --watchAll=false
```

## Security Checklist

### For Developers

- [ ] All service methods include `requireAuth()` check
- [ ] All user input is sanitized with `sanitizeObject()` or specific sanitizers
- [ ] Validation errors provide specific field-level feedback
- [ ] No sensitive data is logged in production
- [ ] Environment variables are properly configured
- [ ] Firebase security rules are deployed
- [ ] Session timeout is configured appropriately

### For Deployment

- [ ] Firebase security rules are deployed to production
- [ ] Environment variables are set in production environment
- [ ] API keys have proper restrictions in Firebase console
- [ ] HTTPS is enforced for all connections
- [ ] Authentication logs are monitored
- [ ] Regular security audits are scheduled

## Common Security Patterns

### Adding a New Service Method

```javascript
async newServiceMethod(data) {
  // 1. Validate authentication
  requireAuth();
  
  // 2. Sanitize input
  const sanitizedData = sanitizeObject(data);
  
  // 3. Validate data
  const validationResult = this.validateData(sanitizedData);
  if (!validationResult.isValid) {
    throw new AppError(
      `Validation failed: ${formatValidationErrors(validationResult)}`,
      ERROR_TYPES.VALIDATION,
      { data: sanitizedData, validationErrors: validationResult.errors }
    );
  }
  
  // 4. Execute operation
  return this.atomicOperations.execute("operationName", async () => {
    // ... database operations
  });
}
```

### Handling User Input in Components

```javascript
const handleSubmit = async (formData) => {
  try {
    // Input is sanitized in the service layer
    await customerService.addCustomer(formData);
    toast.success('Customer added successfully');
  } catch (error) {
    if (error.type === 'PERMISSION') {
      // Redirect to login
      router.push('/login');
    } else if (error.type === 'VALIDATION') {
      // Show validation errors
      setErrors(error.context.validationErrors);
    } else {
      // Show generic error
      toast.error('An error occurred');
    }
  }
};
```

## Troubleshooting

### "User must be authenticated" Error

**Cause**: User session has expired or user is not logged in.

**Solution**: 
1. Check if user is logged in
2. Verify Firebase authentication is initialized
3. Check session timeout settings

### Session Expires Too Quickly

**Cause**: Session timeout is too short or activity tracking isn't working.

**Solution**:
1. Increase timeout in `initializeSessionManager()`
2. Verify activity listeners are set up correctly
3. Check browser console for errors

### Sanitization Breaking Valid Input

**Cause**: Overly aggressive sanitization rules.

**Solution**:
1. Review sanitization logic for the specific field
2. Use field-specific sanitizers (e.g., `sanitizeEmail`, `sanitizePhone`)
3. Adjust validation rules if needed

## Future Enhancements

1. **Rate Limiting**: Implement request rate limiting to prevent abuse
2. **Two-Factor Authentication**: Add 2FA support for enhanced security
3. **Audit Logging**: Comprehensive logging of all security-related events
4. **IP Whitelisting**: Restrict access to specific IP ranges
5. **Encryption at Rest**: Encrypt sensitive data in the database
6. **Security Headers**: Add security headers to HTTP responses
7. **CSRF Protection**: Implement CSRF tokens for state-changing operations

## References

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/database/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
