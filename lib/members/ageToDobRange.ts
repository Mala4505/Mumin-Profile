/**
 * Converts an inclusive age range into a date_of_birth range.
 *
 * Semantics (extracted from the form-audience age logic in
 * lib/forms/materializeAudience.ts so both features stay consistent):
 * - age_to (max age)   → minDob = today minus age_to years:
 *   anyone born ON or AFTER this date is at most age_to years old.
 * - age_from (min age) → maxDob = today minus age_from years:
 *   anyone born ON or BEFORE this date is at least age_from years old.
 *
 * Query usage: date_of_birth >= minDob AND date_of_birth <= maxDob.
 * Rows with NULL date_of_birth are excluded automatically by these comparisons.
 */
export interface DobRange {
  /** ISO date (YYYY-MM-DD). Filter with date_of_birth >= minDob. Undefined when no max age given. */
  minDob?: string
  /** ISO date (YYYY-MM-DD). Filter with date_of_birth <= maxDob. Undefined when no min age given. */
  maxDob?: string
}

export function ageToDobRange(ageFrom?: number | null, ageTo?: number | null): DobRange {
  const now = new Date()
  const range: DobRange = {}

  if (ageTo != null) {
    range.minDob = toIsoDate(new Date(now.getFullYear() - ageTo, now.getMonth(), now.getDate()))
  }

  if (ageFrom != null) {
    range.maxDob = toIsoDate(new Date(now.getFullYear() - ageFrom, now.getMonth(), now.getDate()))
  }

  return range
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}
