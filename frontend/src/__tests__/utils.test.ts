import { cn, formatDate, formatCurrency } from '../lib/utils';

describe('Frontend UI & Localization Utilities', () => {
  describe('cn (Tailwind class merging)', () => {
    it('should correctly merge and de-duplicate Tailwind utility classes', () => {
      const result = cn('px-4 py-2 bg-blue-500', 'px-6', { 'text-white': true, 'text-black': false });
      expect(result).toContain('px-6');
      expect(result).not.toContain('px-4');
      expect(result).toContain('text-white');
      expect(result).not.toContain('text-black');
    });
  });

  describe('formatDate (Asia/Kolkata IST Timezone)', () => {
    it('should format UTC ISO strings into IST regional format', () => {
      const utcDate = '2026-11-10T12:00:00Z'; // 12:00 UTC = 17:30 IST
      const formatted = formatDate(utcDate);
      expect(formatted).toBeDefined();
      expect(formatted).not.toBe('-');
      expect(formatted).toContain('2026');
    });

    it('should safely return fallback dash for invalid dates', () => {
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('')).toBe('-');
      expect(formatDate('invalid-date')).toBe('-');
    });
  });

  describe('formatCurrency (Indian Rupee INR ₹)', () => {
    it('should format numbers into INR currency format', () => {
      const formatted = formatCurrency(150000);
      expect(formatted).toContain('1,50,000');
    });

    it('should handle zero, null, and undefined safely', () => {
      expect(formatCurrency(0)).toContain('0.00');
      expect(formatCurrency(null)).toBe('₹0.00');
      expect(formatCurrency(undefined)).toBe('₹0.00');
    });
  });
});

