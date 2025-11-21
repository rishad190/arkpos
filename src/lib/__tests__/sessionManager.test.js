/**
 * Tests for session management utilities
 */

import { sessionManager, validateSession, getSessionInfo, resetSession } from '../sessionManager';
import { AppError } from '../errors';

describe('sessionManager', () => {
  beforeEach(() => {
    // Reset session manager state
    sessionManager.lastActivityTime = Date.now();
    sessionManager.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    sessionManager.stopActivityMonitoring();
  });

  afterEach(() => {
    sessionManager.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with default timeout', () => {
      sessionManager.initialize();
      expect(sessionManager.sessionTimeout).toBe(30 * 60 * 1000);
    });

    it('should initialize with custom timeout', () => {
      sessionManager.initialize({ timeout: 60 * 60 * 1000 });
      expect(sessionManager.sessionTimeout).toBe(60 * 60 * 1000);
    });

    it('should set up activity monitoring', () => {
      sessionManager.initialize();
      expect(sessionManager.activityCheckInterval).not.toBeNull();
    });
  });

  describe('activity tracking', () => {
    it('should update last activity time', () => {
      const beforeTime = sessionManager.lastActivityTime;
      // Wait a bit
      setTimeout(() => {
        sessionManager.updateLastActivity();
        expect(sessionManager.lastActivityTime).toBeGreaterThan(beforeTime);
      }, 10);
    });

    it('should reset session on activity', () => {
      const beforeTime = sessionManager.lastActivityTime;
      resetSession();
      expect(sessionManager.lastActivityTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('session timeout', () => {
    it('should detect session timeout', () => {
      // Set last activity to 31 minutes ago
      sessionManager.lastActivityTime = Date.now() - (31 * 60 * 1000);
      sessionManager.sessionTimeout = 30 * 60 * 1000;
      
      const isTimedOut = sessionManager.checkSessionTimeout();
      expect(isTimedOut).toBe(true);
    });

    it('should not timeout active session', () => {
      sessionManager.lastActivityTime = Date.now();
      sessionManager.sessionTimeout = 30 * 60 * 1000;
      
      const isTimedOut = sessionManager.checkSessionTimeout();
      expect(isTimedOut).toBe(false);
    });

    it('should throw error when validating expired session', () => {
      sessionManager.lastActivityTime = Date.now() - (31 * 60 * 1000);
      sessionManager.sessionTimeout = 30 * 60 * 1000;
      
      expect(() => validateSession()).toThrow(AppError);
      expect(() => validateSession()).toThrow('Session has expired');
    });

    it('should not throw error when validating active session', () => {
      sessionManager.lastActivityTime = Date.now();
      sessionManager.sessionTimeout = 30 * 60 * 1000;
      
      expect(() => validateSession()).not.toThrow();
    });
  });

  describe('session info', () => {
    it('should return session information', () => {
      const info = getSessionInfo();
      expect(info).toHaveProperty('lastActivityTime');
      expect(info).toHaveProperty('sessionTimeout');
      expect(info).toHaveProperty('timeUntilExpiry');
      expect(info).toHaveProperty('isActive');
    });

    it('should calculate time until expiry correctly', () => {
      sessionManager.lastActivityTime = Date.now();
      sessionManager.sessionTimeout = 30 * 60 * 1000;
      
      const timeRemaining = sessionManager.getTimeUntilExpiry();
      expect(timeRemaining).toBeGreaterThan(29 * 60 * 1000);
      expect(timeRemaining).toBeLessThanOrEqual(30 * 60 * 1000);
    });

    it('should return zero for expired session', () => {
      sessionManager.lastActivityTime = Date.now() - (31 * 60 * 1000);
      sessionManager.sessionTimeout = 30 * 60 * 1000;
      
      const timeRemaining = sessionManager.getTimeUntilExpiry();
      expect(timeRemaining).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should stop activity monitoring on cleanup', () => {
      sessionManager.initialize();
      expect(sessionManager.activityCheckInterval).not.toBeNull();
      
      sessionManager.cleanup();
      expect(sessionManager.activityCheckInterval).toBeNull();
    });
  });
});
