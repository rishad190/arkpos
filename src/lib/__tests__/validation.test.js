/**
 * Tests for validation utilities
 */

import {
  createValidResult,
  createInvalidResult,
  addError,
  addWarning,
  mergeResults,
  formatValidationErrors,
  validateRequired,
  validateStringLength,
  validatePositiveNumber,
  validatePhoneNumber,
  validateEmail,
  validateNonEmptyArray,
} from '../validation';

describe('Validation Utilities', () => {
  describe('createValidResult', () => {
    it('should create a valid result', () => {
      const result = createValidResult();
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('createInvalidResult', () => {
    it('should create an invalid result with errors', () => {
      const errors = [{ field: 'name', message: 'Name is required' }];
      const result = createInvalidResult(errors);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(errors);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('addError', () => {
    it('should add error to result and mark as invalid', () => {
      const result = createValidResult();
      addError(result, 'email', 'Invalid email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ field: 'email', message: 'Invalid email' });
    });
  });

  describe('addWarning', () => {
    it('should add warning to result without marking as invalid', () => {
      const result = createValidResult();
      addWarning(result, 'phone', 'Phone format unusual');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toEqual({ field: 'phone', message: 'Phone format unusual' });
    });
  });

  describe('mergeResults', () => {
    it('should merge multiple validation results', () => {
      const result1 = createValidResult();
      addError(result1, 'name', 'Name required');
      
      const result2 = createValidResult();
      addError(result2, 'email', 'Email required');
      
      const merged = mergeResults(result1, result2);
      expect(merged.isValid).toBe(false);
      expect(merged.errors).toHaveLength(2);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors as string', () => {
      const result = createValidResult();
      addError(result, 'name', 'Name is required');
      addError(result, 'email', 'Email is invalid');
      
      const formatted = formatValidationErrors(result);
      expect(formatted).toBe('name: Name is required; email: Email is invalid');
    });

    it('should return empty string for valid result', () => {
      const result = createValidResult();
      expect(formatValidationErrors(result)).toBe('');
    });
  });

  describe('validateRequired', () => {
    it('should return error for null value', () => {
      const error = validateRequired(null, 'name');
      expect(error).toEqual({ field: 'name', message: 'name is required' });
    });

    it('should return error for undefined value', () => {
      const error = validateRequired(undefined, 'name');
      expect(error).toEqual({ field: 'name', message: 'name is required' });
    });

    it('should return error for empty string', () => {
      const error = validateRequired('', 'name');
      expect(error).toEqual({ field: 'name', message: 'name is required' });
    });

    it('should return error for whitespace-only string', () => {
      const error = validateRequired('   ', 'name');
      expect(error).toEqual({ field: 'name', message: 'name cannot be empty' });
    });

    it('should return null for valid value', () => {
      const error = validateRequired('John', 'name');
      expect(error).toBeNull();
    });
  });

  describe('validateStringLength', () => {
    it('should return error if string is too short', () => {
      const error = validateStringLength('ab', 'name', 3, 10);
      expect(error).toEqual({ field: 'name', message: 'name must be at least 3 characters' });
    });

    it('should return error if string is too long', () => {
      const error = validateStringLength('abcdefghijk', 'name', 3, 10);
      expect(error).toEqual({ field: 'name', message: 'name must not exceed 10 characters' });
    });

    it('should return null for valid length', () => {
      const error = validateStringLength('abcde', 'name', 3, 10);
      expect(error).toBeNull();
    });

    it('should return null for empty value', () => {
      const error = validateStringLength('', 'name', 3, 10);
      expect(error).toBeNull();
    });
  });

  describe('validatePositiveNumber', () => {
    it('should return error for negative number', () => {
      const error = validatePositiveNumber(-5, 'amount', false);
      expect(error).toEqual({ field: 'amount', message: 'amount must be positive' });
    });

    it('should return error for zero when not allowed', () => {
      const error = validatePositiveNumber(0, 'amount', false);
      expect(error).toEqual({ field: 'amount', message: 'amount must be positive' });
    });

    it('should return null for zero when allowed', () => {
      const error = validatePositiveNumber(0, 'amount', true);
      expect(error).toBeNull();
    });

    it('should return null for positive number', () => {
      const error = validatePositiveNumber(10, 'amount', false);
      expect(error).toBeNull();
    });

    it('should return error for non-number', () => {
      const error = validatePositiveNumber('abc', 'amount', false);
      expect(error).toEqual({ field: 'amount', message: 'amount must be a valid number' });
    });
  });

  describe('validatePhoneNumber', () => {
    it('should return error for phone with less than 10 digits', () => {
      const error = validatePhoneNumber('123456789', 'phone');
      expect(error).toEqual({ field: 'phone', message: 'phone must contain at least 10 digits' });
    });

    it('should return null for valid phone', () => {
      const error = validatePhoneNumber('1234567890', 'phone');
      expect(error).toBeNull();
    });

    it('should return null for phone with formatting', () => {
      const error = validatePhoneNumber('(123) 456-7890', 'phone');
      expect(error).toBeNull();
    });

    it('should return null for empty value', () => {
      const error = validatePhoneNumber('', 'phone');
      expect(error).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('should return error for invalid email', () => {
      const error = validateEmail('notanemail', 'email');
      expect(error).toEqual({ field: 'email', message: 'email must be a valid email address' });
    });

    it('should return null for valid email', () => {
      const error = validateEmail('test@example.com', 'email');
      expect(error).toBeNull();
    });

    it('should return null for empty value', () => {
      const error = validateEmail('', 'email');
      expect(error).toBeNull();
    });
  });

  describe('validateNonEmptyArray', () => {
    it('should return error for empty array', () => {
      const error = validateNonEmptyArray([], 'items');
      expect(error).toEqual({ field: 'items', message: 'items must contain at least one item' });
    });

    it('should return error for non-array', () => {
      const error = validateNonEmptyArray('not an array', 'items');
      expect(error).toEqual({ field: 'items', message: 'items must contain at least one item' });
    });

    it('should return null for non-empty array', () => {
      const error = validateNonEmptyArray([1, 2, 3], 'items');
      expect(error).toBeNull();
    });
  });
});
