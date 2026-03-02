import { type ClassValue, clsx } from 'clsx';

/**
 * Merges Tailwind class names — ready for Shadcn/ui integration.
 * Install: npm install clsx tailwind-merge
 * Then replace body with: twMerge(clsx(inputs))
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
