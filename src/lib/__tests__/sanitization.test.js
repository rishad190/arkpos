/**
 * Tests for input sanitization utilities
 */

import {
  sanitizeString,
  sanitizeObject,
  containsSQLInjection,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizeSearchQuery,
} from '../sanitization';

describe('sanitization utilities', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should escape special characters', () => {
      const input = '< > & " \' /';
      const result = sanitizeString(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
      expect(result).toContain('&#x2F;');
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in an object', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        email: 'test@example.com',
        age: 25,
      };
      const result = sanitizeObject(input);
      expect(result.name).not.toContain('<script>');
      expect(result.email).toBe('test@example.com');
      expect(result.age).toBe(25);
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          details: {
            bio: '<i>Developer</i>',
          },
        },
      };
      const result = sanitizeObject(input);
      expect(result.user.name).not.toContain('<b>');
      expect(result.user.details.bio).not.toContain('<i>');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['<script>tag1</script>', 'tag2', '<b>tag3</b>'],
      };
      const result = sanitizeObject(input);
      expect(result.tags[0]).not.toContain('<script>');
      expect(result.tags[2]).not.toContain('<b>');
    });
  });

  describe('containsSQLInjection', () => {
    it('should detect SQL keywords', () => {
      expect(containsSQLInjection('SELECT * FROM users')).toBe(true);
      expect(containsSQLInjection('DROP TABLE users')).toBe(true);
      expect(containsSQLInjection('INSERT INTO users')).toBe(true);
      expect(containsSQLInjection('DELETE FROM users')).toBe(true);
    });

    it('should detect SQL injection patterns', () => {
      expect(containsSQLInjection("' OR 1=1 --")).toBe(true);
      expect(containsSQLInjection("admin' --")).toBe(true);
      expect(containsSQLInjection('UNION SELECT')).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(containsSQLInjection('Hello World')).toBe(false);
      expect(containsSQLInjection('user@example.com')).toBe(false);
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate and sanitize valid emails', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
      expect(sanitizeEmail('  user@domain.com  ')).toBe('user@domain.com');
    });

    it('should return null for invalid emails', () => {
      expect(sanitizeEmail('invalid')).toBe(null);
      expect(sanitizeEmail('no@domain')).toBe(null);
      expect(sanitizeEmail('@domain.com')).toBe(null);
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeEmail(123)).toBe(null);
      expect(sanitizeEmail(null)).toBe(null);
    });
  });

  describe('sanitizePhone', () => {
    it('should remove non-digit characters', () => {
      expect(sanitizePhone('(123) 456-7890')).toBe('1234567890');
      expect(sanitizePhone('+1-234-567-8900')).toBe('12345678900');
    });

    it('should return null for invalid phone numbers', () => {
      expect(sanitizePhone('123')).toBe(null); // Too short
      expect(sanitizePhone('12345678901234567890')).toBe(null); // Too long
    });

    it('should handle non-string inputs', () => {
      expect(sanitizePhone(123)).toBe(null);
      expect(sanitizePhone(null)).toBe(null);
    });
  });

  describe('sanitizeNumber', () => {
    it('should validate and round numbers', () => {
      expect(sanitizeNumber(123.456)).toBe(123.46);
      expect(sanitizeNumber('123.456')).toBe(123.46);
      expect(sanitizeNumber(100, { decimals: 0 })).toBe(100);
    });

    it('should enforce min/max constraints', () => {
      expect(sanitizeNumber(5, { min: 10 })).toBe(null);
      expect(sanitizeNumber(100, { max: 50 })).toBe(null);
      expect(sanitizeNumber(25, { min: 10, max: 50 })).toBe(25);
    });

    it('should return null for invalid numbers', () => {
      expect(sanitizeNumber('abc')).toBe(null);
      expect(sanitizeNumber(NaN)).toBe(null);
      expect(sanitizeNumber(Infinity)).toBe(null);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should trim and limit search queries', () => {
      expect(sanitizeSearchQuery('  search term  ')).toBe('search term');
      const longQuery = 'a'.repeat(150);
      expect(sanitizeSearchQuery(longQuery).length).toBe(100);
    });

    it('should reject SQL injection patterns', () => {
      expect(sanitizeSearchQuery('SELECT * FROM users')).toBe('');
      expect(sanitizeSearchQuery("' OR 1=1 --")).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeSearchQuery(123)).toBe('');
      expect(sanitizeSearchQuery(null)).toBe('');
    });
  });
});
