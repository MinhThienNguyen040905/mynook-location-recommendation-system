import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx.
 * Required by shadcn/ui components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to Vietnamese locale.
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
}

/**
 * Format currency to VND.
 */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

// ── Venue address helpers ────────────────────────────────────────

/**
 * Compose the full address string from structured venue fields.
 * Handles both shapes: a `Venue` (with `city_ref`/`district_ref` eager-loaded)
 * and a `SearchResult` (with pre-resolved `city`/`district` name strings).
 * Parts are joined by ", " and empty parts are dropped.
 */
export function formatAddress(source: {
  address_line?: string | null;
  ward?: string | null;
  // Venue shape
  district_ref?: { name: string } | null;
  city_ref?: { name: string } | null;
  // SearchResult shape
  district?: string | null;
  city?: string | null;
}): string {
  const district =
    source.district_ref?.name ?? (source.district ?? null);
  const city = source.city_ref?.name ?? (source.city ?? null);
  return [source.address_line, source.ward, district, city]
    .filter((s): s is string => !!s && s.length > 0)
    .join(', ');
}

/** Short address for cards — "<district>, <city>" (fallbacks to whatever exists) */
export function formatShortAddress(source: {
  district_ref?: { name: string } | null;
  city_ref?: { name: string } | null;
  district?: string | null;
  city?: string | null;
}): string {
  const district = source.district_ref?.name ?? source.district ?? null;
  const city = source.city_ref?.name ?? source.city ?? null;
  return [district, city].filter((s): s is string => !!s).join(', ');
}
