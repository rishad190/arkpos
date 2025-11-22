/**
 * Property-Based Tests for Session Timeout
 * Feature: codebase-improvements, Property 20: Sessions timeout appropriately
 * Validates: Requirements 9.3
 * 
 * Property: For any user session, if the session duration exceeds the configured
 * timeout period, the session should be invalidated.
 */

import * as fc from 'fast-check';
import { sessionManager } from '../sessionManager';
import { AppError } from '../errors';

describe('Property 20: Sessions timeout appropriately', () => {
  beforeEach(() => {
    // Reset session manager state before each test
    sessionManager.lastActivityTime = Date.now();
    sessionManager.sessionTimeout = 30 * 60 * 1000; // 30 minutes default
    sessionManager.stopActivityMonitoring();
    sessionManager.onSessionExpired = null;
  });

  afterEach(() => {
    sessionManager.cleanup();
  });

  /**
   * Feature: codebase-improvements, Property 20: Sessions timeout appropriately
   * Validates: Requirements 9.3
   * 
   * For any user session, if the session duration exceeds the configured timeout
   * period, the session should be invalidated.
   */
  test('Property 20: Sessions timeout when duration exceeds configured timeout', () => {
    fc.assert(
      fc.property(
        // Generate timeout duration (1 minute to 2 hours)
        fc.integer({ min: 60 * 1000, max: 120 * 60 * 1000 }),
        // Generate time since last activity (relative to timeout)
        fc.float({ min: Math.fround(1.01), max: Math.fround(3.0), noNaN: true }),
        (timeoutDuration, activityMultiplier) => {
          // Setup: Configure session with specific timeout
          sessionManager.sessionTimeout = timeoutDuration;
          
          // Setup: Set last activity to exceed timeout
          const timeSinceActivity = Math.floor(timeoutDuration * activityMultiplier);
          sessionManager.lastActivityTime = Date.now() - timeSinceActivity;

          // Property: Session should be detected as timed out
          const isTimedOut = sessionManager.checkSessionTimeout();
          expect(isTimedOut).toBe(true);

          // Property: validateSession should throw PERMISSION error
          expect(() => sessionManager.validateSession()).toThrow(AppError);
          
          try {
            sessionManager.validateSession();
            fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.type).toBe('PERMISSION');
            expect(error.message).toMatch(/Session has expired/i);
          }

          // Property: Time until expiry should be zero
          const timeRemaining = sessionManager.getTimeUntilExpiry();
          expect(timeRemaining).toBe(0);

          // Property: Session info should show inactive status
          const sessionInfo = sessionManager.getSessionInfo();
          expect(sessionInfo.isActive).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 20: Sessions remain valid when duration is within timeout', () => {
    fc.assert(
      fc.property(
        // Generate timeout duration (1 minute to 2 hours)
        fc.integer({ min: 60 * 1000, max: 120 * 60 * 1000 }),
        // Generate time since last activity (less than timeout)
        fc.float({ min: Math.fround(0), max: Math.fround(0.99), noNaN: true }),
        (timeoutDuration, activityMultiplier) => {
          // Setup: Configure session with specific timeout
          sessionManager.sessionTimeout = timeoutDuration;
          
          // Setup: Set last activity within timeout period
          const timeSinceActivity = Math.floor(timeoutDuration * activityMultiplier);
          sessionManager.lastActivityTime = Date.now() - timeSinceActivity;

          // Property: Session should NOT be detected as timed out
          const isTimedOut = sessionManager.checkSessionTimeout();
          expect(isTimedOut).toBe(false);

          // Property: validateSession should NOT throw error
          expect(() => sessionManager.validateSession()).not.toThrow();

          // Property: Time until expiry should be positive
          const timeRemaining = sessionManager.getTimeUntilExpiry();
          expect(timeRemaining).toBeGreaterThan(0);

          // Property: Session info should show active status
          const sessionInfo = sessionManager.getSessionInfo();
          expect(sessionInfo.isActive).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 20: Session timeout boundary is exact', () => {
    fc.assert(
      fc.property(
        // Generate timeout duration
        fc.integer({ min: 60 * 1000, max: 120 * 60 * 1000 }),
        (timeoutDuration) => {
          // Setup: Configure session with specific timeout
          sessionManager.sessionTimeout = timeoutDuration;
          
          // Test exactly at timeout boundary (just before)
          const now = Date.now();
          sessionManager.lastActivityTime = now - timeoutDuration + 100; // 100ms before timeout
          expect(sessionManager.checkSessionTimeout()).toBe(false);
          expect(() => sessionManager.validateSession()).not.toThrow();

          // Test exactly at timeout boundary (just after)
          sessionManager.lastActivityTime = now - timeoutDuration - 100; // 100ms after timeout
          expect(sessionManager.checkSessionTimeout()).toBe(true);
          expect(() => sessionManager.validateSession()).toThrow(AppError);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 20: Activity update resets timeout', () => {
    fc.assert(
      fc.property(
        // Generate timeout duration
        fc.integer({ min: 60 * 1000, max: 120 * 60 * 1000 }),
        // Generate initial time past timeout
        fc.float({ min: Math.fround(1.1), max: Math.fround(2.0), noNaN: true }),
        (timeoutDuration, initialMultiplier) => {
          // Setup: Configure session with specific timeout
          sessionManager.sessionTimeout = timeoutDuration;
          
          // Setup: Set last activity to exceed timeout
          const initialTimeSinceActivity = Math.floor(timeoutDuration * initialMultiplier);
          sessionManager.lastActivityTime = Date.now() - initialTimeSinceActivity;

          // Verify session is initially timed out
          expect(sessionManager.checkSessionTimeout()).toBe(true);

          // Action: Update activity (simulate user interaction)
          sessionManager.updateLastActivity();

          // Property: After activity update, session should be valid again
          expect(sessionManager.checkSessionTimeout()).toBe(false);
          expect(() => sessionManager.validateSession()).not.toThrow();

          // Property: Time until expiry should be approximately equal to timeout
          const timeRemaining = sessionManager.getTimeUntilExpiry();
          expect(timeRemaining).toBeGreaterThan(timeoutDuration * 0.99);
          expect(timeRemaining).toBeLessThanOrEqual(timeoutDuration);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 20: Different timeout durations are respected', () => {
    fc.assert(
      fc.property(
        // Generate two different timeout durations with sufficient gap
        fc.integer({ min: 60 * 1000, max: 60 * 60 * 1000 }),
        fc.integer({ min: 60 * 60 * 1000 + 10000, max: 120 * 60 * 1000 }),
        (shortTimeout, longTimeout) => {
          // Ensure they are different with sufficient margin
          fc.pre(shortTimeout < longTimeout - 5000);

          const now = Date.now();
          const elapsedTime = shortTimeout + 1000; // Time that exceeds short timeout

          // Test with short timeout
          sessionManager.sessionTimeout = shortTimeout;
          sessionManager.lastActivityTime = now - elapsedTime;
          expect(sessionManager.checkSessionTimeout()).toBe(true);

          // Test with long timeout - same elapsed time should now be valid
          sessionManager.sessionTimeout = longTimeout;
          sessionManager.lastActivityTime = now - elapsedTime;
          expect(sessionManager.checkSessionTimeout()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 20: Session expiration callback is invoked', () => {
    fc.assert(
      fc.asyncProperty(
        // Generate timeout duration
        fc.integer({ min: 60 * 1000, max: 120 * 60 * 1000 }),
        async (timeoutDuration) => {
          // Setup: Configure session with callback
          let callbackInvoked = false;
          sessionManager.sessionTimeout = timeoutDuration;
          sessionManager.onSessionExpired = () => {
            callbackInvoked = true;
          };
          
          // Setup: Set last activity to exceed timeout
          sessionManager.lastActivityTime = Date.now() - timeoutDuration - 1000;

          // Action: Handle session expiration
          await sessionManager.handleSessionExpired();

          // Property: Callback should be invoked when session expires
          expect(callbackInvoked).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 20: Time until expiry calculation is accurate', () => {
    fc.assert(
      fc.property(
        // Generate timeout duration
        fc.integer({ min: 60 * 1000, max: 120 * 60 * 1000 }),
        // Generate time since activity (within timeout)
        fc.float({ min: Math.fround(0), max: Math.fround(0.99), noNaN: true }),
        (timeoutDuration, activityMultiplier) => {
          // Setup: Configure session
          sessionManager.sessionTimeout = timeoutDuration;
          const timeSinceActivity = Math.floor(timeoutDuration * activityMultiplier);
          sessionManager.lastActivityTime = Date.now() - timeSinceActivity;

          // Property: Time until expiry should equal timeout minus time since activity
          const timeRemaining = sessionManager.getTimeUntilExpiry();
          const expectedRemaining = timeoutDuration - timeSinceActivity;

          // Allow small tolerance for timing differences (100ms)
          expect(timeRemaining).toBeGreaterThanOrEqual(expectedRemaining - 100);
          expect(timeRemaining).toBeLessThanOrEqual(expectedRemaining + 100);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 20: Session info reflects timeout state accurately', () => {
    fc.assert(
      fc.property(
        // Generate timeout duration
        fc.integer({ min: 60 * 1000, max: 120 * 60 * 1000 }),
        // Generate activity multiplier (can be before or after timeout)
        fc.float({ min: Math.fround(0), max: Math.fround(2.0), noNaN: true }),
        (timeoutDuration, activityMultiplier) => {
          // Setup: Configure session
          sessionManager.sessionTimeout = timeoutDuration;
          const timeSinceActivity = Math.floor(timeoutDuration * activityMultiplier);
          sessionManager.lastActivityTime = Date.now() - timeSinceActivity;

          // Get session info
          const sessionInfo = sessionManager.getSessionInfo();

          // Property: Session info should have all required fields
          expect(sessionInfo).toHaveProperty('lastActivityTime');
          expect(sessionInfo).toHaveProperty('sessionTimeout');
          expect(sessionInfo).toHaveProperty('timeUntilExpiry');
          expect(sessionInfo).toHaveProperty('isActive');

          // Property: isActive should match timeout state
          const expectedActive = timeSinceActivity <= timeoutDuration;
          expect(sessionInfo.isActive).toBe(expectedActive);

          // Property: sessionTimeout should match configured value
          expect(sessionInfo.sessionTimeout).toBe(timeoutDuration);

          // Property: lastActivityTime should match set value
          expect(sessionInfo.lastActivityTime).toBe(sessionManager.lastActivityTime);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 20: Multiple timeout checks are consistent', () => {
    fc.assert(
      fc.property(
        // Generate timeout duration
        fc.integer({ min: 60 * 1000, max: 120 * 60 * 1000 }),
        // Generate time since activity
        fc.float({ min: Math.fround(0), max: Math.fround(2.0), noNaN: true }),
        (timeoutDuration, activityMultiplier) => {
          // Setup: Configure session
          sessionManager.sessionTimeout = timeoutDuration;
          const timeSinceActivity = Math.floor(timeoutDuration * activityMultiplier);
          sessionManager.lastActivityTime = Date.now() - timeSinceActivity;

          // Property: Multiple checks should return same result
          const firstCheck = sessionManager.checkSessionTimeout();
          const secondCheck = sessionManager.checkSessionTimeout();
          const thirdCheck = sessionManager.checkSessionTimeout();

          expect(firstCheck).toBe(secondCheck);
          expect(secondCheck).toBe(thirdCheck);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 20: Zero or negative timeout is handled', () => {
    fc.assert(
      fc.property(
        // Generate very small or zero timeout
        fc.integer({ min: 0, max: 1000 }),
        (timeoutDuration) => {
          // Setup: Configure session with very short timeout
          sessionManager.sessionTimeout = timeoutDuration;
          // Set last activity to well past the timeout (2 seconds ago)
          sessionManager.lastActivityTime = Date.now() - 2000;

          // Property: Session should be timed out
          expect(sessionManager.checkSessionTimeout()).toBe(true);
          expect(() => sessionManager.validateSession()).toThrow(AppError);
        }
      ),
      { numRuns: 50 }
    );
  });
});
