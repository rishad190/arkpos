/**
 * Property-Based Tests for Input Sanitization
 * Feature: codebase-improvements, Property 21: User input is sanitized
 * Validates: Requirements 9.4
 * 
 * Property: For any user input string, dangerous characters should be escaped
 * or the input should be rejected before being stored or processed.
 */

import * as fc from 'fast-check';
import {
  sanitizeString,
  sanitizeObject,
  containsSQLInjection,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizeSearchQuery,
} from '../sanitization';

describe('Property 21: User input is sanitized', () => {
  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any string containing dangerous HTML characters, sanitizeString should
   * escape them to prevent XSS attacks.
   */
  test('Property 21: Dangerous HTML characters are escaped', () => {
    fc.assert(
      fc.property(
        // Generate strings with dangerous characters
        fc.string(),
        (input) => {
          const result = sanitizeString(input);

          // Property: Result should not contain unescaped dangerous characters
          if (typeof input === 'string') {
            // Check that dangerous characters are escaped
            expect(result).not.toMatch(/<(?!&lt;)/); // No unescaped <
            expect(result).not.toMatch(/>(?!&gt;)/); // No unescaped >
            
            // If input contained dangerous chars, they should be escaped
            if (input.includes('<')) {
              expect(result).toContain('&lt;');
            }
            if (input.includes('>')) {
              expect(result).toContain('&gt;');
            }
            if (input.includes('&') && !input.includes('&amp;')) {
              expect(result).toContain('&amp;');
            }
            if (input.includes('"')) {
              expect(result).toContain('&quot;');
            }
            if (input.includes("'")) {
              expect(result).toContain('&#x27;');
            }
            if (input.includes('/')) {
              expect(result).toContain('&#x2F;');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any string containing script tags, sanitizeString should escape them
   * to prevent script injection.
   */
  test('Property 21: Script tags are neutralized', () => {
    fc.assert(
      fc.property(
        // Generate strings with script content
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (beforeScript, scriptContent) => {
          const input = `${beforeScript}<script>${scriptContent}</script>`;
          const result = sanitizeString(input);

          // Property: Result should not contain executable script tags
          expect(result).not.toContain('<script>');
          expect(result).not.toContain('</script>');
          expect(result).toContain('&lt;script&gt;');
          expect(result).toContain('&lt;&#x2F;script&gt;');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any object with string values, sanitizeObject should recursively
   * sanitize all string fields.
   */
  test('Property 21: Objects are recursively sanitized', () => {
    fc.assert(
      fc.property(
        // Generate objects with string values containing dangerous characters
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }).filter(key => 
            // Filter out dangerous prototype pollution keys
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null)
          ),
          { minKeys: 1, maxKeys: 10 }
        ),
        (obj) => {
          const result = sanitizeObject(obj);

          // Property: All string values should be sanitized
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
              // String values should be sanitized
              expect(result[key]).not.toContain('<script>');
              if (value.includes('<')) {
                expect(result[key]).toContain('&lt;');
              }
            } else {
              // Non-string values should be unchanged
              expect(result[key]).toBe(value);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any string containing SQL injection patterns, containsSQLInjection
   * should detect them.
   */
  test('Property 21: SQL injection patterns are detected', () => {
    fc.assert(
      fc.property(
        // Generate strings with SQL keywords
        fc.constantFrom('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE'),
        fc.string({ minLength: 1, maxLength: 50 }),
        (sqlKeyword, additionalText) => {
          const input = `${sqlKeyword} ${additionalText}`;
          const result = containsSQLInjection(input);

          // Property: SQL keywords should be detected
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any string with SQL comment patterns, containsSQLInjection should
   * detect them.
   */
  test('Property 21: SQL comment patterns are detected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('--', ';', '/*', '*/'),
        (text, sqlComment) => {
          const input = `${text}${sqlComment}`;
          const result = containsSQLInjection(input);

          // Property: SQL comment patterns should be detected
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any valid email address, sanitizeEmail should normalize it correctly.
   */
  test('Property 21: Valid emails are normalized', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const result = sanitizeEmail(email);

          // Property: Valid emails should be normalized (lowercase, trimmed)
          expect(result).not.toBe(null);
          expect(result).toBe(result.toLowerCase());
          expect(result).toBe(result.trim());
          expect(result).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any invalid email format, sanitizeEmail should reject it.
   */
  test('Property 21: Invalid emails are rejected', () => {
    fc.assert(
      fc.property(
        // Generate strings that are not valid emails
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@') || !s.includes('.')),
        (invalidEmail) => {
          const result = sanitizeEmail(invalidEmail);

          // Property: Invalid emails should be rejected (return null)
          // Only if the string doesn't accidentally match email pattern
          if (!invalidEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            expect(result).toBe(null);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any phone number string, sanitizePhone should extract only digits
   * and validate length.
   */
  test('Property 21: Phone numbers are sanitized to digits only', () => {
    fc.assert(
      fc.property(
        // Generate phone-like strings with various formats
        fc.string({ minLength: 10, maxLength: 20 }),
        (phoneInput) => {
          const result = sanitizePhone(phoneInput);

          // Property: Result should be null or contain only digits
          if (result !== null) {
            expect(result).toMatch(/^\d+$/);
            expect(result.length).toBeGreaterThanOrEqual(10);
            expect(result.length).toBeLessThanOrEqual(15);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any numeric input, sanitizeNumber should validate and round appropriately.
   */
  test('Property 21: Numbers are validated and rounded', () => {
    fc.assert(
      fc.property(
        // Use reasonable number range to avoid floating point precision issues
        fc.float({ min: Math.fround(-1e15), max: Math.fround(1e15), noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 5 }),
        (value, decimals) => {
          const result = sanitizeNumber(value, { decimals });

          // Property: Result should be null or a finite number with correct decimals
          if (result !== null) {
            expect(isFinite(result)).toBe(true);
            expect(isNaN(result)).toBe(false);
            
            // Check decimal places - use scientific notation check for very large numbers
            const resultStr = result.toString();
            if (!resultStr.includes('e')) {
              const decimalPart = resultStr.split('.')[1];
              if (decimalPart) {
                expect(decimalPart.length).toBeLessThanOrEqual(decimals);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any number with min/max constraints, sanitizeNumber should enforce them.
   */
  test('Property 21: Number constraints are enforced', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10000), max: Math.fround(20000), noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
        fc.float({ min: Math.fround(1001), max: Math.fround(10000), noNaN: true }),
        (value, min, max) => {
          // Ensure min < max with sufficient gap
          fc.pre(min < max - 1);

          const result = sanitizeNumber(value, { min, max, decimals: 2 });

          // Property: Result should be null or within constraints
          if (result !== null) {
            // Allow small floating point tolerance
            expect(result).toBeGreaterThanOrEqual(min - 0.01);
            expect(result).toBeLessThanOrEqual(max + 0.01);
          } else {
            // If null, value was outside constraints or invalid
            if (isFinite(value) && !isNaN(value)) {
              expect(value < min || value > max).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any search query with SQL injection patterns, sanitizeSearchQuery
   * should reject it.
   */
  test('Property 21: Search queries with SQL injection are rejected', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP'),
        fc.string({ minLength: 1, maxLength: 50 }),
        (sqlKeyword, additionalText) => {
          const query = `${sqlKeyword} ${additionalText}`;
          const result = sanitizeSearchQuery(query);

          // Property: Queries with SQL patterns should be rejected (empty string)
          expect(result).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any search query exceeding length limit, sanitizeSearchQuery should
   * truncate it.
   */
  test('Property 21: Long search queries are truncated', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 101, maxLength: 500 }),
        (longQuery) => {
          // Ensure it doesn't contain SQL injection patterns
          fc.pre(!containsSQLInjection(longQuery));

          const result = sanitizeSearchQuery(longQuery);

          // Property: Result should be truncated to 100 characters
          expect(result.length).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any safe search query, sanitizeSearchQuery should preserve it.
   */
  test('Property 21: Safe search queries are preserved', () => {
    fc.assert(
      fc.property(
        // Generate safe strings (alphanumeric with spaces)
        fc.array(
          fc.constantFrom(
            ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')
          ),
          { minLength: 1, maxLength: 50 }
        ).map(arr => arr.join('')),
        (safeQuery) => {
          fc.pre(safeQuery.trim().length > 0);

          const result = sanitizeSearchQuery(safeQuery);

          // Property: Safe queries should be preserved (trimmed)
          expect(result).toBe(safeQuery.trim());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any nested object structure, sanitizeObject should sanitize all
   * string values at any depth.
   */
  test('Property 21: Nested objects are fully sanitized', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (dangerousString1, dangerousString2) => {
          const input = {
            level1: `<script>${dangerousString1}</script>`,
            nested: {
              level2: `<img src=x onerror="${dangerousString2}">`,
              deepNested: {
                level3: '<div onclick="alert()">text</div>',
              },
            },
          };

          const result = sanitizeObject(input);

          // Property: All string values at all levels should be sanitized
          expect(result.level1).not.toContain('<script>');
          expect(result.level1).toContain('&lt;script&gt;');
          
          expect(result.nested.level2).not.toContain('<img');
          expect(result.nested.level2).toContain('&lt;img');
          
          expect(result.nested.deepNested.level3).not.toContain('<div');
          expect(result.nested.deepNested.level3).toContain('&lt;div');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any array of strings in an object, sanitizeObject should sanitize
   * each array element.
   */
  test('Property 21: Arrays in objects are sanitized', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
        (stringArray) => {
          const input = {
            tags: stringArray,
          };

          const result = sanitizeObject(input);

          // Property: All array elements should be sanitized
          result.tags.forEach((tag, index) => {
            if (typeof stringArray[index] === 'string') {
              if (stringArray[index].includes('<')) {
                expect(tag).toContain('&lt;');
              }
              if (stringArray[index].includes('>')) {
                expect(tag).toContain('&gt;');
              }
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any non-string input to sanitizeString, it should be returned unchanged.
   */
  test('Property 21: Non-string inputs are handled gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.object()
        ),
        (nonStringInput) => {
          const result = sanitizeString(nonStringInput);

          // Property: Non-string inputs should be returned unchanged
          expect(result).toBe(nonStringInput);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: codebase-improvements, Property 21: User input is sanitized
   * Validates: Requirements 9.4
   * 
   * For any string with dangerous characters, the sanitized output should not
   * contain the original dangerous characters in executable form.
   */
  test('Property 21: Sanitized output is safe', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const result = sanitizeString(input);

          // Property: Sanitized output should not contain dangerous patterns
          if (typeof input === 'string' && input.length > 0) {
            // No raw script tags
            expect(result).not.toMatch(/<script[^>]*>/i);
            expect(result).not.toMatch(/<\/script>/i);
            
            // No raw event handlers
            expect(result).not.toMatch(/on\w+\s*=/i);
            
            // No raw iframe tags
            expect(result).not.toMatch(/<iframe[^>]*>/i);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
