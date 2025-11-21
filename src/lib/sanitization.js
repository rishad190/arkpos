/**
 * Input sanitization utilities for security
 * @module lib/sanitization
 */

/**
 * Sanitize a string by removing HTML tags and dangerous characters
 * @param {string} input - The input string to sanitize
 * @returns {string} The sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Escape special characters that could be used in injection attacks
  let sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Sanitize an object by sanitizing all string values
 * @param {Object} obj - The object to sanitize
 * @returns {Object} The sanitized object
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : 
        typeof item === 'object' ? sanitizeObject(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Check if a string contains SQL injection patterns
 * @param {string} input - The input string to check
 * @returns {boolean} True if suspicious patterns are found
 */
export function containsSQLInjection(input) {
  if (typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\;|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(UNION.*SELECT)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate and sanitize email input
 * @param {string} email - The email to validate and sanitize
 * @returns {string|null} The sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }

  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize phone number
 * @param {string} phone - The phone number to validate and sanitize
 * @returns {string|null} The sanitized phone or null if invalid
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters
  const sanitized = phone.replace(/\D/g, '');

  // Check if it's a valid length (between 10 and 15 digits)
  if (sanitized.length < 10 || sanitized.length > 15) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize numeric input
 * @param {any} value - The value to validate and sanitize
 * @param {Object} options - Validation options
 * @param {number} [options.min] - Minimum allowed value
 * @param {number} [options.max] - Maximum allowed value
 * @param {number} [options.decimals=2] - Maximum decimal places
 * @returns {number|null} The sanitized number or null if invalid
 */
export function sanitizeNumber(value, options = {}) {
  const { min, max, decimals = 2 } = options;

  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  if (min !== undefined && num < min) {
    return null;
  }

  if (max !== undefined && num > max) {
    return null;
  }

  // Round to specified decimal places
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Sanitize search query to prevent injection attacks
 * @param {string} query - The search query to sanitize
 * @returns {string} The sanitized query
 */
export function sanitizeSearchQuery(query) {
  if (typeof query !== 'string') {
    return '';
  }

  // Remove dangerous patterns
  let sanitized = query.trim();

  // Check for SQL injection patterns
  if (containsSQLInjection(sanitized)) {
    return '';
  }

  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return sanitized;
}
