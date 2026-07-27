/**
 * Authentication validation utilities
 * @module lib/authValidation
 */

import { auth } from '@/lib/firebase';
import { AppError } from '@/lib/errors';

/**
 * Validate that a user is authenticated
 * @throws {AppError} If user is not authenticated
 * @returns {Object} The current user
 */
export function requireAuth() {
  if (!auth) {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem("arkpos_mock_user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          return {
            ...user,
            getIdToken: () => Promise.resolve("mock-token"),
            getIdTokenResult: () => Promise.resolve({ authTime: new Date().toISOString() }),
          };
        } catch (e) {
          // ignore
        }
      }
    }
    throw new AppError(
      'Firebase authentication is not initialized',
      'PERMISSION',
      { service: 'authValidation' }
    );
  }

  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new AppError(
      'User must be authenticated to perform this operation',
      'PERMISSION',
      { service: 'authValidation' }
    );
  }

  return currentUser;
}

/**
 * Get the current user's ID
 * @returns {string|null} The user ID
 */
export function getCurrentUserId() {
  const user = requireAuth();
  return user?.uid || null;
}

/**
 * Check if the current user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export function isAuthenticated() {
  if (!auth) {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("arkpos_mock_user") !== null;
    }
    return false;
  }
  return auth.currentUser !== null;
}

