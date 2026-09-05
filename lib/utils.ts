import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * String comparator for values like floor/flat/building numbers, which are
 * stored as text (so PACI-style values like "3A" or "G" are representable)
 * but should sort numerically, not lexicographically — plain string sort
 * puts "10" before "2". `null` sorts last regardless of direction, since a
 * missing floor/flat means "not applicable", not "comes first".
 */
export function naturalCompare(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}
