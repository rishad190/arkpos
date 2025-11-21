/**
 * Session management utilities
 * @module lib/sessionManager
 */

import { auth } from '@/lib/firebase';
import { AppError } from '@/lib/errors';

// Default session timeout: 30 minutes
const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000;

// Activity tracking timeout: 5 minutes
const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000;

class SessionManager {
  constructor() {
    this.lastActivityTime = Date.now();
    this.sessionTimeout = DEFAULT_SESSION_TIMEOUT;
    this.activityCheckInterval = null;
    this.onSessionExpired = null;
  }

  /**
   * Initialize session manager
   * @param {Object} options - Configuration options
   * @param {number} [options.timeout] - Session timeout in milliseconds
   * @param {Function} [options.onExpired] - Callback when session expires
   */
  initialize(options = {}) {
    if (options.timeout) {
      this.sessionTimeout = options.timeout;
    }

    if (options.onExpired) {
      this.onSessionExpired = options.onExpired;
    }

    // Start activity monitoring
    this.startActivityMonitoring();

    // Track user activity
    this.setupActivityListeners();
  }

  /**
   * Start monitoring for session timeout
   */
  startActivityMonitoring() {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }

    this.activityCheckInterval = setInterval(() => {
      this.checkSessionTimeout();
    }, ACTIVITY_CHECK_INTERVAL);
  }

  /**
   * Stop monitoring for session timeout
   */
  stopActivityMonitoring() {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  /**
   * Setup listeners for user activity
   */
  setupActivityListeners() {
    if (typeof window === 'undefined') {
      return;
    }

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const updateActivity = () => {
      this.updateLastActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
  }

  /**
   * Update the last activity timestamp
   */
  updateLastActivity() {
    this.lastActivityTime = Date.now();
  }

  /**
   * Check if session has timed out
   * @returns {boolean} True if session has timed out
   */
  checkSessionTimeout() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    if (timeSinceLastActivity > this.sessionTimeout) {
      this.handleSessionExpired();
      return true;
    }

    return false;
  }

  /**
   * Handle session expiration
   */
  async handleSessionExpired() {
    this.stopActivityMonitoring();

    if (auth && auth.currentUser) {
      try {
        await auth.signOut();
      } catch (error) {
        console.error('Error signing out on session timeout:', error);
      }
    }

    if (this.onSessionExpired) {
      this.onSessionExpired();
    }
  }

  /**
   * Get time remaining until session expires
   * @returns {number} Milliseconds until session expires
   */
  getTimeUntilExpiry() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    const timeRemaining = this.sessionTimeout - timeSinceLastActivity;

    return Math.max(0, timeRemaining);
  }

  /**
   * Check if session is still valid
   * @throws {AppError} If session has expired
   * @returns {boolean} True if session is valid
   */
  validateSession() {
    if (this.checkSessionTimeout()) {
      throw new AppError(
        'Session has expired due to inactivity',
        'PERMISSION',
        { 
          lastActivity: new Date(this.lastActivityTime).toISOString(),
          timeout: this.sessionTimeout 
        }
      );
    }

    return true;
  }

  /**
   * Reset session timeout
   */
  resetSession() {
    this.updateLastActivity();
  }

  /**
   * Get session information
   * @returns {Object} Session information
   */
  getSessionInfo() {
    return {
      lastActivityTime: this.lastActivityTime,
      sessionTimeout: this.sessionTimeout,
      timeUntilExpiry: this.getTimeUntilExpiry(),
      isActive: !this.checkSessionTimeout(),
    };
  }

  /**
   * Cleanup session manager
   */
  cleanup() {
    this.stopActivityMonitoring();
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

/**
 * Initialize session management
 * @param {Object} options - Configuration options
 */
export function initializeSessionManager(options) {
  sessionManager.initialize(options);
}

/**
 * Validate current session
 * @throws {AppError} If session has expired
 */
export function validateSession() {
  return sessionManager.validateSession();
}

/**
 * Get session information
 * @returns {Object} Session information
 */
export function getSessionInfo() {
  return sessionManager.getSessionInfo();
}

/**
 * Reset session timeout
 */
export function resetSession() {
  sessionManager.resetSession();
}
