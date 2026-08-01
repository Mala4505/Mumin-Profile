/**
 * Single source of truth for how a member/mumin is *displayed* anywhere in the app.
 *
 * Before this module every surface (profile page, members table, dashboards,
 * reports, analytics, admin) hand-rolled its own status colours, gender pills,
 * balig pills and initials logic — six competing status renderings, six gender
 * renderings and three different initials algorithms. Import from here instead.
 *
 * Labels live in `lib/constants.ts`; this file owns the visual mapping.
 */

import { MUMIN_STATUS_LABELS, GENDER_LABELS } from '@/lib/constants'

export type Gender = 'M' | 'F'
export type BaligStatus = 'Balig' | 'Ghair Balig' | string

/** Chip geometry. `sm` for dense surfaces (tables, list rows), `md` for hero cards. */
export type ChipSize = 'sm' | 'md'

export const CHIP_BASE =
  'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap'

export const CHIP_SIZE: Record<ChipSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] leading-4',
  md: 'px-2.5 py-1 text-xs leading-4',
}

// ── Member status ────────────────────────────────────────────────────────────

export const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  deceased: 'bg-gray-100 text-gray-500 border-gray-200',
  relocated: 'bg-blue-100 text-blue-700 border-blue-200',
  left_community: 'bg-red-100 text-red-700 border-red-200',
  inactive: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

export const STATUS_FALLBACK_STYLE = 'bg-gray-100 text-gray-500 border-gray-200'

/** Dot colour used on avatars and inline status dots. */
export const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500',
  deceased: 'bg-gray-400',
  relocated: 'bg-blue-500',
  left_community: 'bg-red-500',
  inactive: 'bg-yellow-500',
}

export function statusStyle(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_FALLBACK_STYLE
}

export function statusDot(status: string): string {
  return STATUS_DOT[status] ?? 'bg-gray-400'
}

export function statusLabel(status: string): string {
  return MUMIN_STATUS_LABELS[status] ?? status
}

/** Short label for filter pills and other tight spaces. */
export const STATUS_SHORT_LABELS: Record<string, string> = {
  ...MUMIN_STATUS_LABELS,
  left_community: 'Left',
}

// ── Gender ───────────────────────────────────────────────────────────────────

export const GENDER_STYLES: Record<string, string> = {
  M: 'bg-blue-100 text-blue-700 border-blue-200',
  F: 'bg-pink-100 text-pink-700 border-pink-200',
}

/** Bare text colour, for surfaces that show gender without a chip. */
export const GENDER_TEXT: Record<string, string> = {
  M: 'text-blue-700',
  F: 'text-pink-700',
}

export function genderStyle(gender: string): string {
  return GENDER_STYLES[gender] ?? STATUS_FALLBACK_STYLE
}

export function genderLabel(gender: string): string {
  return GENDER_LABELS[gender] ?? gender
}

// ── Balig status ─────────────────────────────────────────────────────────────

export const BALIG_STYLES: Record<string, string> = {
  Balig: 'bg-orange-100 text-orange-700 border-orange-200',
  'Ghair Balig': 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

export function baligStyle(status: string): string {
  return BALIG_STYLES[status] ?? BALIG_STYLES['Ghair Balig']
}

export function baligLabel(status: string): string {
  return status === 'Balig' ? 'Balig' : 'Ghair Balig'
}

// ── Head of family ───────────────────────────────────────────────────────────

export const HOF_STYLE = 'bg-orange-100 text-orange-700 border-orange-200'

// ── Initials ─────────────────────────────────────────────────────────────────

/**
 * First letter of the first two words. `MobileHeader` used to slice the joined
 * string instead, which produced different initials for 3+ word names.
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '—'
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return initials || '—'
}

// ── Shared layout tokens ─────────────────────────────────────────────────────

/** Canonical card chrome — byte-identical to `components/ui/card.tsx`. */
export const CARD_CHROME = 'bg-card rounded-xl border border-border shadow-sm'

/**
 * Minimum comfortable touch target. Applied to icon-only buttons so they hit
 * 44px on touch devices while staying compact on pointer devices.
 */
export const TOUCH_TARGET =
  'inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-9 sm:min-w-9'

/** Page shell used by every member-facing route so widths match across the app. */
export const PAGE_SHELL = 'p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full'
