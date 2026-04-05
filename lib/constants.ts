export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  MASOOL: 'Masool',
  MUSAID: 'Musaid',
  MUMIN: 'Mumin',
} as const

export const MUMIN_STATUS = {
  ACTIVE: 'active',
  DECEASED: 'deceased',
  RELOCATED: 'relocated',
  LEFT_COMMUNITY: 'left_community',
  INACTIVE: 'inactive',
} as const

export const MUMIN_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  deceased: 'Deceased',
  relocated: 'Relocated',
  left_community: 'Left Community',
  inactive: 'Inactive',
}

export const GENDER_LABELS: Record<string, string> = {
  M: 'Male',
  F: 'Female',
}

export const ROUTES = {
  LOGIN: '/login',
  MEMBERS: '/members',
  IMPORT: '/import',
  REPORTS: '/reports',
  ADMIN_USERS: '/admin/users',
  REQUESTS: '/requests',
  ADMIN_REQUESTS: '/admin/requests',
  CHANGE_PASSWORD: '/change-password',
} as const

// Profile visibility
export const VISIBILITY = {
  ALL: 1,       // all roles including Mumin
  STAFF: 2,     // Masool + Musaid
  ADMIN: 3,     // SuperAdmin only
} as const
