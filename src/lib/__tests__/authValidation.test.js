/**
 * Tests for authentication validation utilities
 */

import {
  requireAuth,
  getCurrentUserId,
  isAuthenticated,
} from '../authValidation';
import { AppError } from '../errors';
import { auth } from '../firebase';

// Mock Firebase auth
jest.mock('../firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

describe('authValidation utilities', () => {
  beforeEach(() => {
    // Reset auth state before each test
    auth.currentUser = null;
  });

  describe('requireAuth', () => {
    it('should throw error when user is not authenticated', () => {
      auth.currentUser = null;
      expect(() => requireAuth()).toThrow(AppError);
      expect(() => requireAuth()).toThrow('User must be authenticated');
    });

    it('should return user when authenticated', () => {
      const mockUser = { uid: 'test-user-123', email: 'test@example.com' };
      auth.currentUser = mockUser;
      const result = requireAuth();
      expect(result).toBe(mockUser);
    });
  });

  describe('getCurrentUserId', () => {
    it('should throw error when user is not authenticated', () => {
      auth.currentUser = null;
      expect(() => getCurrentUserId()).toThrow(AppError);
    });

    it('should return user ID when authenticated', () => {
      const mockUser = { uid: 'test-user-123', email: 'test@example.com' };
      auth.currentUser = mockUser;
      const result = getCurrentUserId();
      expect(result).toBe('test-user-123');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when user is not authenticated', () => {
      auth.currentUser = null;
      expect(isAuthenticated()).toBe(false);
    });

    it('should return true when user is authenticated', () => {
      const mockUser = { uid: 'test-user-123', email: 'test@example.com' };
      auth.currentUser = mockUser;
      expect(isAuthenticated()).toBe(true);
    });

    it('should handle null auth gracefully', () => {
      // When auth is null, isAuthenticated should handle it gracefully
      // This test verifies the function doesn't crash
      auth.currentUser = null;
      expect(isAuthenticated()).toBe(false);
    });
  });
});
