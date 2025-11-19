/**
 * Validation utilities for the POS system
 * Provides structured validation results with field-level error tracking
 */

/**
 * @typedef {Object} FieldError
 * @property {string} field - The field name that failed validation
 * @property {string} message - The error message for this field
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the validation passed
 * @property {Array<FieldError>} errors - Array of field-level errors
 * @property {Array<FieldError>} warnings - Array of field-level warnings
 */

/**
 * Create a successful validation result
 * @returns {ValidationResult}
 */
export function createValidResult() {
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
}

/**
 * Create a validation result with errors
 * @param {Array<FieldError>} errors - Array of field errors
 * @param {Array<FieldError>} warnings - Array of field warnings
 * @returns {ValidationResult}
 */
export function createInvalidResult(errors = [], warnings = []) {
  return {
    isValid: false,
    errors,
    warnings,
  };
}

/**
 * Add an error to a validation result
 * @param {ValidationResult} result - The validation result to modify
 * @param {string} field - The field name
 * @param {string} message - The error message
 * @returns {ValidationResult} - The modified result
 */
export function addError(result, field, message) {
  result.errors.push({ field, message });
  result.isValid = false;
  return result;
}

/**
 * Add a warning to a validation result
 * @param {ValidationResult} result - The validation result to modify
 * @param {string} field - The field name
 * @param {string} message - The warning message
 * @returns {ValidationResult} - The modified result
 */
export function addWarning(result, field, message) {
  result.warnings.push({ field, message });
  return result;
}

/**
 * Merge multiple validation results
 * @param {...ValidationResult} results - Validation results to merge
 * @returns {ValidationResult} - Combined result
 */
export function mergeResults(...results) {
  const merged = createValidResult();
  
  for (const result of results) {
    merged.errors.push(...result.errors);
    merged.warnings.push(...result.warnings);
    if (!result.isValid) {
      merged.isValid = false;
    }
  }
  
  return merged;
}

/**
 * Convert validation result to error message string
 * @param {ValidationResult} result - The validation result
 * @returns {string} - Formatted error message
 */
export function formatValidationErrors(result) {
  if (result.isValid) {
    return '';
  }
  
  return result.errors
    .map(error => `${error.field}: ${error.message}`)
    .join('; ');
}

/**
 * Validate required field
 * @param {any} value - The value to validate
 * @param {string} fieldName - The field name
 * @returns {FieldError|null} - Error if validation fails, null otherwise
 */
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  
  if (typeof value === 'string' && !value.trim()) {
    return { field: fieldName, message: `${fieldName} cannot be empty` };
  }
  
  return null;
}

/**
 * Validate string length
 * @param {string} value - The string to validate
 * @param {string} fieldName - The field name
 * @param {number} minLength - Minimum length (optional)
 * @param {number} maxLength - Maximum length (optional)
 * @returns {FieldError|null} - Error if validation fails, null otherwise
 */
export function validateStringLength(value, fieldName, minLength = null, maxLength = null) {
  if (!value) return null; // Skip if empty (use validateRequired separately)
  
  const length = value.length;
  
  if (minLength !== null && length < minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${minLength} characters`,
    };
  }
  
  if (maxLength !== null && length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }
  
  return null;
}

/**
 * Validate positive number
 * @param {number} value - The number to validate
 * @param {string} fieldName - The field name
 * @param {boolean} allowZero - Whether zero is allowed
 * @returns {FieldError|null} - Error if validation fails, null otherwise
 */
export function validatePositiveNumber(value, fieldName, allowZero = false) {
  if (value === null || value === undefined) {
    return null; // Skip if empty (use validateRequired separately)
  }
  
  if (typeof value !== 'number' || isNaN(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid number` };
  }
  
  if (allowZero && value < 0) {
    return { field: fieldName, message: `${fieldName} must be zero or positive` };
  }
  
  if (!allowZero && value <= 0) {
    return { field: fieldName, message: `${fieldName} must be positive` };
  }
  
  return null;
}

/**
 * Validate phone number format
 * @param {string} value - The phone number to validate
 * @param {string} fieldName - The field name
 * @returns {FieldError|null} - Error if validation fails, null otherwise
 */
export function validatePhoneNumber(value, fieldName) {
  if (!value) return null; // Skip if empty (use validateRequired separately)
  
  // Basic phone validation - at least 10 digits
  const digitsOnly = value.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    return {
      field: fieldName,
      message: `${fieldName} must contain at least 10 digits`,
    };
  }
  
  return null;
}

/**
 * Validate email format
 * @param {string} value - The email to validate
 * @param {string} fieldName - The field name
 * @returns {FieldError|null} - Error if validation fails, null otherwise
 */
export function validateEmail(value, fieldName) {
  if (!value) return null; // Skip if empty (use validateRequired separately)
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid email address` };
  }
  
  return null;
}

/**
 * Validate array is not empty
 * @param {Array} value - The array to validate
 * @param {string} fieldName - The field name
 * @returns {FieldError|null} - Error if validation fails, null otherwise
 */
export function validateNonEmptyArray(value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) {
    return { field: fieldName, message: `${fieldName} must contain at least one item` };
  }
  
  return null;
}
