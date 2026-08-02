/**
 * Shared presentational primitives for member/mumin data.
 *
 * Every surface that shows a member — profile page, members table, dashboards,
 * reports, analytics, admin screens — renders identity through these components
 * so the design stays consistent and responsive in one place.
 *
 * Server-component safe: no hooks, no event handlers, no 'use client'.
 */

import { forwardRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  CHIP_BASE,
  CHIP_SIZE,
  HOF_STYLE,
  baligLabel,
  baligStyle,
  genderLabel,
  genderStyle,
  getInitials,
  statusDot,
  statusLabel,
  statusStyle,
  type ChipSize,
} from '@/lib/members/display'

// ── Chip ─────────────────────────────────────────────────────────────────────

export function Chip({
  size = 'sm',
  tone,
  className,
  children,
}: {
  size?: ChipSize
  tone: string
  className?: string
  children: ReactNode
}) {
  return (
    <span className={cn(CHIP_BASE, CHIP_SIZE[size], tone, className)}>{children}</span>
  )
}

// ── Status ───────────────────────────────────────────────────────────────────

export function MemberStatusBadge({
  status,
  size = 'sm',
  withDot = false,
  className,
}: {
  status: string
  size?: ChipSize
  withDot?: boolean
  className?: string
}) {
  return (
    <Chip size={size} tone={statusStyle(status)} className={className}>
      {withDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', statusDot(status))} aria-hidden />
      )}
      {statusLabel(status)}
    </Chip>
  )
}

// ── Gender ───────────────────────────────────────────────────────────────────

function MaleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="10" cy="14" r="5" />
      <line x1="19" y1="5" x2="14.14" y2="9.86" />
      <polyline points="15 5 19 5 19 9" />
    </svg>
  )
}

function FemaleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="9" r="5" />
      <line x1="12" y1="14" x2="12" y2="22" />
      <line x1="9" y1="19" x2="15" y2="19" />
    </svg>
  )
}

export function GenderPill({
  gender,
  size = 'sm',
  className,
}: {
  gender: string
  size?: ChipSize
  className?: string
}) {
  if (gender !== 'M' && gender !== 'F') return null
  const Glyph = gender === 'M' ? MaleGlyph : FemaleGlyph
  return (
    <Chip size={size} tone={genderStyle(gender)} className={className}>
      <Glyph className="h-3 w-3 shrink-0" />
      {genderLabel(gender)}
    </Chip>
  )
}

// ── Balig ────────────────────────────────────────────────────────────────────

export function BaligPill({
  status,
  size = 'sm',
  className,
}: {
  status: string
  size?: ChipSize
  className?: string
}) {
  return (
    <Chip size={size} tone={baligStyle(status)} className={className}>
      {baligLabel(status)}
    </Chip>
  )
}

// ── Head of family ───────────────────────────────────────────────────────────

export function HeadBadge({ size = 'sm' }: { size?: ChipSize }) {
  return (
    <Chip size={size} tone={HOF_STYLE} className="font-semibold">
      HoF
    </Chip>
  )
}

// ── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-base sm:h-12 sm:w-12 sm:text-lg',
  lg: 'h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl',
} as const

const AVATAR_DOT = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5 sm:h-4 sm:w-4',
} as const

export type AvatarSize = keyof typeof AVATAR_SIZE

export function MemberAvatar({
  name,
  status,
  size = 'md',
  className,
}: {
  name: string
  /** When provided, renders a presence dot in the corner. */
  status?: string
  size?: AvatarSize
  className?: string
}) {
  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary/10 font-bold text-primary select-none',
          AVATAR_SIZE[size]
        )}
        aria-hidden
      >
        {getInitials(name)}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-card',
            AVATAR_DOT[size],
            statusDot(status)
          )}
          aria-hidden
        />
      )}
    </div>
  )
}

// ── Identity block ───────────────────────────────────────────────────────────

/**
 * Name over a muted `ITS 1234 · Sabeel 56` meta line. Used in the profile hero,
 * table cells, dashboards, sheets and pickers so identity always reads the same.
 */
export function MemberIdentity({
  name,
  itsNo,
  sabeelNo,
  size = 'md',
  className,
  meta,
}: {
  name: string | null | undefined
  itsNo?: number | string | null
  sabeelNo?: number | string | null
  /** `sm` for table cells and lists, `md` for cards, `lg` for hero headers. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Extra trailing meta, appended after ITS/Sabeel. */
  meta?: ReactNode
}) {
  const nameCls = {
    sm: 'text-sm font-medium',
    md: 'text-base font-semibold',
    lg: 'text-lg font-bold leading-tight sm:text-xl',
  }[size]

  return (
    <div className={cn('min-w-0', className)}>
      <p className={cn('text-foreground break-words', nameCls)}>{name || '—'}</p>
      {(itsNo != null || sabeelNo != null || meta) && (
        <p className="mt-0.5 text-xs text-muted-foreground break-words">
          {itsNo != null && <span className="font-mono">ITS {itsNo}</span>}
          {itsNo != null && sabeelNo != null && <span className="mx-1.5">·</span>}
          {sabeelNo != null && <span className="font-mono">Sabeel {sabeelNo}</span>}
          {meta}
        </p>
      )}
    </div>
  )
}

// ── Label / value ────────────────────────────────────────────────────────────

export function InfoField({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  const isEmpty = value === null || value === undefined || value === ''
  return (
    <div className={cn('min-w-0', className)}>
      <span className="mb-0.5 block text-xs text-muted-foreground">{label}</span>
      <span className="block text-sm font-medium text-foreground break-words">
        {isEmpty ? '—' : value}
      </span>
    </div>
  )
}

/** Responsive grid for `InfoField`s: 1 col on small phones up to 4 on desktop. */
export const INFO_GRID =
  'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-3'

// ── Card chrome ──────────────────────────────────────────────────────────────

export const SectionCard = forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { className?: string; children: ReactNode }
>(function SectionCard({ className, children, ...rest }, ref) {
  return (
    <section
      ref={ref}
      className={cn('bg-card rounded-xl border border-border shadow-sm', className)}
      {...rest}
    >
      {children}
    </section>
  )
})

export function SectionHeader({
  icon,
  title,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  )
}
