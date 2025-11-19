/**
 * Tests for enhanced error handling system
 */
import { AppError, ErrorHandler, ERROR_TYPES } from '../errors';
import * as fc from 'fast-check';

describe('AppError', () => {
  test('should create AppError with message, type, and context', () => {
    const error = new AppError(
      'Test error',
      ERROR_TYPES.VALIDATION,
      { field: 'name' }
    );

    expect(error.message).toBe('Test error');
    expect(error.type).toBe(ERROR_TYPES.VALIDATION);
    expect(error.context).toEqual({ field: 'name' });
    expect(error.timestamp).toBeDefined();
    expect(error.name).toBe('AppError');
  });

  test('should default to NETWORK type if not specified', () => {
    const error = new AppError('Test error');
    expect(error.type).toBe(ERROR_TYPES.NETWORK);
  });

  test('should convert to JSON format', () => {
    const error = new AppError(
      'Test error',
      ERROR_TYPES.VALIDATION,
      { field: 'name' }
    );

    const json = error.toJSON();
    expect(json.name).toBe('AppError');
    expect(json.message).toBe('Test error');
    expect(json.type).toBe(ERROR_TYPES.VALIDATION);
    expect(json.context).toEqual({ field: 'name' });
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
  });
});

describe('ErrorHandler', () => {
  let mockLogger;
  let errorHandler;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
    };
    errorHandler = new ErrorHandler(mockLogger);
  });

  describe('classify', () => {
    test('should classify network errors', () => {
      const error = new Error('Network connection failed');
      expect(errorHandler.classify(error)).toBe(ERROR_TYPES.NETWORK);
    });

    test('should classify permission errors', () => {
      const error = new Error('Permission denied');
      expect(errorHandler.classify(error)).toBe(ERROR_TYPES.PERMISSION);
    });

    test('should classify validation errors', () => {
      const error = new Error('Validation failed: name is required');
      expect(errorHandler.classify(error)).toBe(ERROR_TYPES.VALIDATION);
    });

    test('should classify not found errors', () => {
      const error = new Error('Resource not found');
      expect(errorHandler.classify(error)).toBe(ERROR_TYPES.NOT_FOUND);
    });

    test('should classify conflict errors', () => {
      const error = new Error('Resource already exists');
      expect(errorHandler.classify(error)).toBe(ERROR_TYPES.CONFLICT);
    });

    test('should return existing type for AppError', () => {
      const error = new AppError('Test', ERROR_TYPES.VALIDATION);
      expect(errorHandler.classify(error)).toBe(ERROR_TYPES.VALIDATION);
    });

    test('should default to NETWORK for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(errorHandler.classify(error)).toBe(ERROR_TYPES.NETWORK);
    });
  });

  describe('handle', () => {
    test('should handle regular Error and convert to AppError', () => {
      const error = new Error('Test error');
      const result = errorHandler.handle(error, { operation: 'test' });

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Test error');
      expect(result.context.operation).toBe('test');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should handle AppError without conversion', () => {
      const error = new AppError('Test', ERROR_TYPES.VALIDATION, { field: 'name' });
      const result = errorHandler.handle(error);

      expect(result).toBe(error);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should log error with context', () => {
      const error = new Error('Test error');
      errorHandler.handle(error, { operation: 'addCustomer' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          type: ERROR_TYPES.NETWORK,
          context: expect.objectContaining({
            operation: 'addCustomer',
          }),
        })
      );
    });
  });

  describe('shouldRetry', () => {
    test('should retry network errors', () => {
      const error = new AppError('Network error', ERROR_TYPES.NETWORK);
      expect(errorHandler.shouldRetry(error)).toBe(true);
    });

    test('should retry conflict errors', () => {
      const error = new AppError('Conflict', ERROR_TYPES.CONFLICT);
      expect(errorHandler.shouldRetry(error)).toBe(true);
    });

    test('should not retry validation errors', () => {
      const error = new AppError('Validation failed', ERROR_TYPES.VALIDATION);
      expect(errorHandler.shouldRetry(error)).toBe(false);
    });

    test('should not retry permission errors', () => {
      const error = new AppError('Permission denied', ERROR_TYPES.PERMISSION);
      expect(errorHandler.shouldRetry(error)).toBe(false);
    });

    test('should not retry not found errors', () => {
      const error = new AppError('Not found', ERROR_TYPES.NOT_FOUND);
      expect(errorHandler.shouldRetry(error)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    test('should calculate exponential backoff', () => {
      expect(errorHandler.getRetryDelay(0)).toBe(1000); // 1s * 2^0
      expect(errorHandler.getRetryDelay(1)).toBe(2000); // 1s * 2^1
      expect(errorHandler.getRetryDelay(2)).toBe(4000); // 1s * 2^2
      expect(errorHandler.getRetryDelay(3)).toBe(8000); // 1s * 2^3
    });
  });

  describe('executeWithRetry', () => {
    test('should execute operation successfully on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await errorHandler.executeWithRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry network errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce('success');

      const result = await errorHandler.executeWithRetry(operation, {}, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should not retry validation errors', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new Error('Validation failed: name is required'));

      await expect(
        errorHandler.executeWithRetry(operation, {}, 3)
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should throw after max retries', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new Error('Network timeout'));

      await expect(
        errorHandler.executeWithRetry(operation, {}, 2)
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('getUserMessage', () => {
    test('should return user-friendly message for network errors', () => {
      const error = new AppError('Network error', ERROR_TYPES.NETWORK);
      const message = errorHandler.getUserMessage(error);
      expect(message).toContain('Network connection');
    });

    test('should return user-friendly message for validation errors', () => {
      const error = new AppError('Validation failed', ERROR_TYPES.VALIDATION);
      const message = errorHandler.getUserMessage(error);
      // For validation errors, the actual error message is returned
      expect(message).toBe('Validation failed');
    });

    test('should return user-friendly message for permission errors', () => {
      const error = new AppError('Permission denied', ERROR_TYPES.PERMISSION);
      const message = errorHandler.getUserMessage(error);
      expect(message).toContain('permission');
    });

    test('should return user-friendly message for not found errors', () => {
      const error = new AppError('Not found', ERROR_TYPES.NOT_FOUND);
      const message = errorHandler.getUserMessage(error);
      expect(message).toContain('could not be found');
    });

    test('should return user-friendly message for conflict errors', () => {
      const error = new AppError('Conflict', ERROR_TYPES.CONFLICT);
      const message = errorHandler.getUserMessage(error);
      expect(message).toContain('conflicts');
    });
  });

  /**
   * Property-Based Test
   * Feature: codebase-improvements, Property 3: Failed operations are logged with context
   * Validates: Requirements 2.3
   */
  describe('Property 3: Failed operations are logged with context', () => {
    test('should log all failed operations with error and context', () => {
      fc.assert(
        fc.property(
          fc.record({
            errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
            errorType: fc.constantFrom(
              ERROR_TYPES.NETWORK,
              ERROR_TYPES.VALIDATION,
              ERROR_TYPES.PERMISSION,
              ERROR_TYPES.NOT_FOUND,
              ERROR_TYPES.CONFLICT
            ),
            operationContext: fc.record({
              operation: fc.string({ minLength: 1, maxLength: 50 }),
              userId: fc.option(fc.string(), { nil: undefined }),
              resourceId: fc.option(fc.string(), { nil: undefined }),
              timestamp: fc.option(
                fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()), 
                { nil: undefined }
              ),
            }),
          }),
          ({ errorMessage, errorType, operationContext }) => {
            // Create a fresh mock logger for each test
            const testLogger = {
              error: jest.fn(),
              info: jest.fn(),
            };
            const testHandler = new ErrorHandler(testLogger);

            // Create an error
            const error = new Error(errorMessage);
            if (errorType !== ERROR_TYPES.NETWORK) {
              // For non-network errors, add hints to ensure proper classification
              if (errorType === ERROR_TYPES.VALIDATION) {
                error.message = 'Validation failed: ' + errorMessage;
              } else if (errorType === ERROR_TYPES.PERMISSION) {
                error.message = 'Permission denied: ' + errorMessage;
              } else if (errorType === ERROR_TYPES.NOT_FOUND) {
                error.message = 'Not found: ' + errorMessage;
              } else if (errorType === ERROR_TYPES.CONFLICT) {
                error.message = 'Conflict: ' + errorMessage;
              }
            }

            // Handle the error with context
            testHandler.handle(error, operationContext);

            // Verify logger.error was called
            expect(testLogger.error).toHaveBeenCalledTimes(1);

            // Verify the logger was called with the error message
            const [loggedMessage, loggedContext] = testLogger.error.mock.calls[0];
            expect(loggedMessage).toBeTruthy();
            expect(typeof loggedMessage).toBe('string');

            // Verify context was logged
            expect(loggedContext).toBeDefined();
            expect(loggedContext).toHaveProperty('type');
            expect(loggedContext).toHaveProperty('timestamp');
            expect(loggedContext).toHaveProperty('context');
            expect(loggedContext).toHaveProperty('stack');

            // Verify operation context is included
            expect(loggedContext.context).toMatchObject(operationContext);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should log AppError with all required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            type: fc.constantFrom(
              ERROR_TYPES.NETWORK,
              ERROR_TYPES.VALIDATION,
              ERROR_TYPES.PERMISSION,
              ERROR_TYPES.NOT_FOUND,
              ERROR_TYPES.CONFLICT
            ),
            errorContext: fc.record({
              field: fc.option(fc.string(), { nil: undefined }),
              value: fc.option(fc.string(), { nil: undefined }),
              code: fc.option(fc.string(), { nil: undefined }),
            }),
            operationContext: fc.record({
              operation: fc.string({ minLength: 1, maxLength: 50 }),
              attempt: fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }),
            }),
          }),
          ({ message, type, errorContext, operationContext }) => {
            // Create a fresh mock logger for each test
            const testLogger = {
              error: jest.fn(),
              info: jest.fn(),
            };
            const testHandler = new ErrorHandler(testLogger);

            // Create an AppError
            const appError = new AppError(message, type, errorContext);

            // Handle the error
            testHandler.handle(appError, operationContext);

            // Verify logger.error was called
            expect(testLogger.error).toHaveBeenCalledTimes(1);

            // Verify all required fields are present in the logged context
            const [loggedMessage, loggedContext] = testLogger.error.mock.calls[0];
            
            // Check message
            expect(loggedMessage).toBe(message);

            // Check required fields
            expect(loggedContext).toHaveProperty('type', type);
            expect(loggedContext).toHaveProperty('timestamp');
            expect(loggedContext).toHaveProperty('context');
            expect(loggedContext).toHaveProperty('stack');

            // Verify timestamp is a valid ISO string
            expect(() => new Date(loggedContext.timestamp)).not.toThrow();

            // Verify context includes both error context and operation context
            expect(loggedContext.context).toMatchObject({
              ...errorContext,
              ...operationContext,
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should log stack trace for all errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.record({
            operation: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          (errorMessage, context) => {
            // Create a fresh mock logger for each test
            const testLogger = {
              error: jest.fn(),
              info: jest.fn(),
            };
            const testHandler = new ErrorHandler(testLogger);

            // Create an error
            const error = new Error(errorMessage);

            // Handle the error
            testHandler.handle(error, context);

            // Verify stack trace is logged
            const [, loggedContext] = testLogger.error.mock.calls[0];
            expect(loggedContext).toHaveProperty('stack');
            expect(typeof loggedContext.stack).toBe('string');
            expect(loggedContext.stack.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property-Based Test
   * Feature: codebase-improvements, Property 17: Error logs contain required fields
   * Validates: Requirements 8.1
   */
  describe('Property 17: Error logs contain required fields', () => {
    test('should log all errors with timestamp, context, and stack trace', () => {
      fc.assert(
        fc.property(
          fc.record({
            errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
            errorType: fc.constantFrom(
              ERROR_TYPES.NETWORK,
              ERROR_TYPES.VALIDATION,
              ERROR_TYPES.PERMISSION,
              ERROR_TYPES.NOT_FOUND,
              ERROR_TYPES.CONFLICT
            ),
            errorContext: fc.record({
              field: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
              value: fc.option(fc.oneof(fc.string(), fc.integer(), fc.boolean()), { nil: undefined }),
              code: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
            }),
            operationContext: fc.record({
              operation: fc.string({ minLength: 1, maxLength: 50 }),
              userId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
              resourceId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
              attempt: fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }),
            }),
          }),
          ({ errorMessage, errorType, errorContext, operationContext }) => {
            // Create a fresh mock logger for each test
            const testLogger = {
              error: jest.fn(),
              info: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
            };
            const testHandler = new ErrorHandler(testLogger);

            // Create an AppError
            const appError = new AppError(errorMessage, errorType, errorContext);

            // Log the error
            testHandler.logError(appError, operationContext);

            // Verify logger.error was called
            expect(testLogger.error).toHaveBeenCalledTimes(1);

            // Get the logged data
            const [loggedMessage, loggedContext] = testLogger.error.mock.calls[0];

            // Verify message is present
            expect(loggedMessage).toBeDefined();
            expect(typeof loggedMessage).toBe('string');
            expect(loggedMessage.length).toBeGreaterThan(0);

            // Verify all required fields are present
            expect(loggedContext).toBeDefined();
            expect(loggedContext).toHaveProperty('timestamp');
            expect(loggedContext).toHaveProperty('context');
            expect(loggedContext).toHaveProperty('stack');

            // Verify timestamp is a valid ISO string
            expect(typeof loggedContext.timestamp).toBe('string');
            expect(loggedContext.timestamp.length).toBeGreaterThan(0);
            expect(() => new Date(loggedContext.timestamp)).not.toThrow();
            expect(new Date(loggedContext.timestamp).toISOString()).toBe(loggedContext.timestamp);

            // Verify context is an object and contains the operation context
            expect(typeof loggedContext.context).toBe('object');
            expect(loggedContext.context).not.toBeNull();
            expect(loggedContext.context).toMatchObject(operationContext);

            // Verify stack trace is present and is a string
            expect(typeof loggedContext.stack).toBe('string');
            expect(loggedContext.stack.length).toBeGreaterThan(0);

            // Verify type is also logged (additional field for error classification)
            expect(loggedContext).toHaveProperty('type');
            expect(loggedContext.type).toBe(errorType);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should log regular errors with timestamp, context, and stack trace', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.record({
            operation: fc.string({ minLength: 1, maxLength: 50 }),
            userId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            resourceId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            metadata: fc.option(
              fc.record({
                key: fc.string({ minLength: 1, maxLength: 20 }),
                value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
              }),
              { nil: undefined }
            ),
          }),
          (errorMessage, context) => {
            // Create a fresh mock logger for each test
            const testLogger = {
              error: jest.fn(),
              info: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
            };
            const testHandler = new ErrorHandler(testLogger);

            // Create a regular Error
            const error = new Error(errorMessage);

            // Handle the error (which logs it)
            testHandler.handle(error, context);

            // Verify logger.error was called
            expect(testLogger.error).toHaveBeenCalledTimes(1);

            // Get the logged data
            const [loggedMessage, loggedContext] = testLogger.error.mock.calls[0];

            // Verify all required fields are present
            expect(loggedContext).toHaveProperty('timestamp');
            expect(loggedContext).toHaveProperty('context');
            expect(loggedContext).toHaveProperty('stack');

            // Verify timestamp is valid
            expect(typeof loggedContext.timestamp).toBe('string');
            expect(() => new Date(loggedContext.timestamp)).not.toThrow();

            // Verify context contains the operation context
            expect(typeof loggedContext.context).toBe('object');
            expect(loggedContext.context).toMatchObject(context);

            // Verify stack trace is present
            expect(typeof loggedContext.stack).toBe('string');
            expect(loggedContext.stack.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include stack trace from original error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (errorMessage) => {
            // Create a fresh mock logger for each test
            const testLogger = {
              error: jest.fn(),
              info: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
            };
            const testHandler = new ErrorHandler(testLogger);

            // Create an error with a stack trace
            const error = new Error(errorMessage);
            const originalStack = error.stack;

            // Handle the error
            testHandler.handle(error);

            // Get the logged data
            const [, loggedContext] = testLogger.error.mock.calls[0];

            // Verify stack trace is present and contains error information
            expect(loggedContext.stack).toBeDefined();
            expect(typeof loggedContext.stack).toBe('string');
            expect(loggedContext.stack.length).toBeGreaterThan(0);
            
            // Stack should contain the error message or be the original stack
            expect(
              loggedContext.stack.includes('Error') || 
              loggedContext.stack === originalStack
            ).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve nested context in error logs', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            type: fc.constantFrom(...Object.values(ERROR_TYPES)),
            errorContext: fc.record({
              field: fc.string({ minLength: 1, maxLength: 50 }),
              reason: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            operationContext: fc.record({
              operation: fc.string({ minLength: 1, maxLength: 50 }),
              layer: fc.constantFrom('service', 'controller', 'repository'),
            }),
          }),
          ({ message, type, errorContext, operationContext }) => {
            // Create a fresh mock logger for each test
            const testLogger = {
              error: jest.fn(),
              info: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
            };
            const testHandler = new ErrorHandler(testLogger);

            // Create an AppError with nested context
            const appError = new AppError(message, type, errorContext);

            // Log with additional operation context
            testHandler.logError(appError, operationContext);

            // Get the logged data
            const [, loggedContext] = testLogger.error.mock.calls[0];

            // Verify required fields
            expect(loggedContext).toHaveProperty('timestamp');
            expect(loggedContext).toHaveProperty('context');
            expect(loggedContext).toHaveProperty('stack');

            // Verify nested context is preserved
            expect(loggedContext.context).toMatchObject({
              ...errorContext,
              ...operationContext,
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property-Based Test
   * Feature: codebase-improvements, Property 2: Error classification is accurate
   * Validates: Requirements 2.2
   */
  describe('Property 2: Error classification is accurate', () => {
    test('should correctly classify network errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              message: fc.constantFrom(
                'network connection failed',
                'timeout occurred',
                'connection refused',
                'offline mode',
                'Network error'
              ),
              code: fc.constant(undefined)
            }),
            fc.record({
              message: fc.string(),
              code: fc.constantFrom('network', 'unavailable', 'NETWORK_ERROR')
            })
          ),
          (errorData) => {
            const error = new Error(errorData.message);
            if (errorData.code) {
              error.code = errorData.code;
            }
            const classified = errorHandler.classify(error);
            expect(classified).toBe(ERROR_TYPES.NETWORK);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should correctly classify permission errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              message: fc.constantFrom(
                'permission denied',
                'unauthorized access',
                'forbidden resource',
                'authentication failed'
              ),
              code: fc.constant(undefined)
            }),
            fc.record({
              message: fc.string(),
              code: fc.constantFrom('permission-denied', 'PERMISSION_ERROR', 'auth-failed')
            })
          ),
          (errorData) => {
            const error = new Error(errorData.message);
            if (errorData.code) {
              error.code = errorData.code;
            }
            const classified = errorHandler.classify(error);
            expect(classified).toBe(ERROR_TYPES.PERMISSION);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should correctly classify validation errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              message: fc.constantFrom(
                'validation failed',
                'invalid input',
                'required field missing',
                'Invalid data'
              ),
              code: fc.constant(undefined)
            }),
            fc.record({
              message: fc.string(),
              code: fc.constantFrom('invalid-argument', 'INVALID_INPUT', 'validation-error')
            })
          ),
          (errorData) => {
            const error = new Error(errorData.message);
            if (errorData.code) {
              error.code = errorData.code;
            }
            const classified = errorHandler.classify(error);
            expect(classified).toBe(ERROR_TYPES.VALIDATION);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should correctly classify not found errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              message: fc.constantFrom(
                'resource not found',
                'does not exist',
                'Not found',
                'item not found'
              ),
              code: fc.constant(undefined)
            }),
            fc.record({
              message: fc.string(),
              code: fc.constant('not-found')
            })
          ),
          (errorData) => {
            const error = new Error(errorData.message);
            if (errorData.code) {
              error.code = errorData.code;
            }
            const classified = errorHandler.classify(error);
            expect(classified).toBe(ERROR_TYPES.NOT_FOUND);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should correctly classify conflict errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              message: fc.constantFrom(
                'conflict detected',
                'already exists',
                'concurrent modification',
                'resource conflict'
              ),
              code: fc.constant(undefined)
            }),
            fc.record({
              message: fc.string(),
              code: fc.constant('already-exists')
            })
          ),
          (errorData) => {
            const error = new Error(errorData.message);
            if (errorData.code) {
              error.code = errorData.code;
            }
            const classified = errorHandler.classify(error);
            expect(classified).toBe(ERROR_TYPES.CONFLICT);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve AppError type classification', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            ERROR_TYPES.NETWORK,
            ERROR_TYPES.VALIDATION,
            ERROR_TYPES.PERMISSION,
            ERROR_TYPES.NOT_FOUND,
            ERROR_TYPES.CONFLICT
          ),
          fc.string({ minLength: 1, maxLength: 100 }),
          (errorType, message) => {
            const appError = new AppError(message, errorType);
            const classified = errorHandler.classify(appError);
            expect(classified).toBe(errorType);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should default to NETWORK for unknown errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(msg => {
            const lower = msg.toLowerCase();
            return !lower.includes('network') &&
                   !lower.includes('timeout') &&
                   !lower.includes('connection') &&
                   !lower.includes('offline') &&
                   !lower.includes('permission') &&
                   !lower.includes('unauthorized') &&
                   !lower.includes('forbidden') &&
                   !lower.includes('auth') &&
                   !lower.includes('not found') &&
                   !lower.includes('does not exist') &&
                   !lower.includes('validation') &&
                   !lower.includes('invalid') &&
                   !lower.includes('required') &&
                   !lower.includes('conflict') &&
                   !lower.includes('already exists') &&
                   !lower.includes('concurrent');
          }),
          (message) => {
            const error = new Error(message);
            const classified = errorHandler.classify(error);
            expect(classified).toBe(ERROR_TYPES.NETWORK);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
