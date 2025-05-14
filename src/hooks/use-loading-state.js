"use client";
import { useState, useCallback } from "react";

/**
 * Custom hook for managing loading states
 *
 * @param {Object} initialState - Initial loading state object
 * @returns {Array} Loading state and helpers
 */
export function useLoadingState(initialState = {}) {
  const defaultState = {
    initial: true,
    actions: false,
    ...initialState,
  };

  const [loadingState, setLoadingState] = useState(defaultState);

  /**
   * Start loading for a specific key
   * @param {string} key - Loading state key
   */
  const startLoading = useCallback((key) => {
    setLoadingState((prev) => ({
      ...prev,
      [key]: true,
    }));
  }, []);

  /**
   * Stop loading for a specific key
   * @param {string} key - Loading state key
   */
  const stopLoading = useCallback((key) => {
    setLoadingState((prev) => ({
      ...prev,
      [key]: false,
    }));
  }, []);

  /**
   * Reset loading state to initial values
   */
  const resetLoading = useCallback(() => {
    setLoadingState(defaultState);
  }, [defaultState]);

  /**
   * Check if any loading state is active
   */
  const isLoading = useCallback(() => {
    return Object.values(loadingState).some(Boolean);
  }, [loadingState]);

  /**
   * Run an async function with loading state management
   * @param {string} key - Loading state key
   * @param {Function} asyncFn - Async function to execute
   * @param {Array} args - Arguments for the async function
   */
  const withLoading = useCallback(
    async (key, asyncFn, ...args) => {
      startLoading(key);
      try {
        return await asyncFn(...args);
      } finally {
        stopLoading(key);
      }
    },
    [startLoading, stopLoading]
  );

  return {
    loadingState,
    setLoadingState,
    startLoading,
    stopLoading,
    resetLoading,
    isLoading,
    withLoading,
  };
}
