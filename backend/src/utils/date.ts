/**
 * Date utility helpers for safe SQL query parameter binding.
 */

export function parseDateFrom(dateStr: unknown, defaultDaysAgo = 30): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date(Date.now() - defaultDaysAgo * 24 * 60 * 60 * 1000);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(Date.now() - defaultDaysAgo * 24 * 60 * 60 * 1000) : d;
}

export function parseDateTo(dateStr: unknown): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date();
  }
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(dateStr + 'T23:59:59.999Z');
  return isNaN(d.getTime()) ? new Date() : d;
}

