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
 * @throws {AppError} If user is not authenticated
 * @returns {string} The user ID
 */
export function getCurrentUserId() {
  const user = requireAuth();
  return user.uid;
}

/**
 * Get the current user's authentication token
 * @throws {AppError} If user is not authenticated
 * @returns {Promise<string>} The authentication token
 */
export async function getAuthToken() {
  const user = requireAuth();
  try {
    return await user.getIdToken();
  } catch (error) {
    throw new AppError(
      'Failed to get authentication token',
      'PERMISSION',
      { originalError: error.message }
    );
  }
}

/**
 * Check if the current user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export function isAuthenticated() {
  return auth && auth.currentUser !== null;
}

/**
 * Validate authentication token freshness
 * @param {number} maxAgeMinutes - Maximum age of token in minutes
 * @throws {AppError} If token is too old
 * @returns {Promise<boolean>} True if token is fresh
 */
export async function validateTokenFreshness(maxAgeMinutes = 60) {
  const user = requireAuth();

  try {
    const tokenResult = await user.getIdTokenResult();
    const authTime = new Date(tokenResult.authTime);
    const now = new Date();
    const ageMinutes = (now - authTime) / (1000 * 60);

    if (ageMinutes > maxAgeMinutes) {
      throw new AppError(
        'Authentication token has expired',
        'PERMISSION',
        { ageMinutes, maxAgeMinutes }
      );
    }

    return true;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'Failed to validate token freshness',
      'PERMISSION',
      { originalError: error.message }
    );
  }
}

/**
 * Refresh the authentication token
 * @throws {AppError} If refresh fails
 * @returns {Promise<string>} The new token
 */
export async function refreshAuthToken() {
  const user = requireAuth();

  try {
    return await user.getIdToken(true); // Force refresh
  } catch (error) {
    throw new AppError(
      'Failed to refresh authentication token',
      'PERMISSION',
      { originalError: error.message }
    );
  }
}
