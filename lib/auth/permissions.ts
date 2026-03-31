import type { SessionUser, MemberFilters } from '@/lib/types/app'

export function canViewAllMembers(user: SessionUser): boolean {
  return user.role === 'SuperAdmin' || user.role === 'Admin' || user.role === 'Masool' || user.role === 'Musaid'
}

export function canEditMember(user: SessionUser, memberSubsectorId: number): boolean {
  if (user.role === 'SuperAdmin') return true
  if (user.role === 'Admin') return true
  if (user.role === 'Masool') return true
  if (user.role === 'Musaid') {
    return user.subsector_ids.includes(memberSubsectorId)
  }
  return false
}

export function canRunCsvImport(user: SessionUser, importType: 'core' | 'profile'): boolean {
  if (user.role === 'SuperAdmin') return true
  if ((user.role === 'Admin' || user.role === 'Masool') && importType === 'profile') return true
  return false
}

export function canManageUsers(user: SessionUser): boolean {
  return user.role === 'SuperAdmin'
}

export function canAssignSubsectors(user: SessionUser): boolean {
  return user.role === 'SuperAdmin' || user.role === 'Admin' || user.role === 'Masool'
}

export function canViewProfileField(user: SessionUser, visibilityLevel: 1 | 2 | 3): boolean {
  if (user.role === 'SuperAdmin') return true
  if (user.role === 'Admin' || user.role === 'Masool' || user.role === 'Musaid') return visibilityLevel <= 2
  if (user.role === 'Mumin') return visibilityLevel === 1
  return false
}

// Build filters scoped to the user's assigned zones
export function getScopedFilters(user: SessionUser): Partial<MemberFilters> {
  // SuperAdmin sees everything — no additional filter
  if (user.role === 'SuperAdmin') return {}
  // Admin: filtered to their sectors at DB level via RLS (same as Masool)
  if (user.role === 'Admin') return {}
  // Masool: filtered to their sectors at DB level via RLS
  if (user.role === 'Masool') return {}
  // Musaid: filtered to their subsectors at DB level via RLS
  if (user.role === 'Musaid') return {}
  // Mumin: sees only their own record — enforced by RLS
  return {}
}
