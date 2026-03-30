import type { Database } from './database'

export type Role = 'SuperAdmin' | 'Masool' | 'Musaid' | 'Mumin'

export type MuminStatus = 'active' | 'deceased' | 'relocated' | 'left_community' | 'inactive'

export type Mumin = Database['public']['Tables']['mumin']['Row']
export type MuminInsert = Database['public']['Tables']['mumin']['Insert']
export type MuminUpdate = Database['public']['Tables']['mumin']['Update']

export type Sector = Database['public']['Tables']['sector']['Row']
export type SubSector = Database['public']['Tables']['subsector']['Row']
export type Building = Database['public']['Tables']['building']['Row']
export type House = Database['public']['Tables']['house']['Row']
export type Family = Database['public']['Tables']['family']['Row']

export type ProfileCategory = Database['public']['Tables']['profile_category']['Row']
export type ProfileField = Database['public']['Tables']['profile_field']['Row']
export type ProfileValue = Database['public']['Tables']['profile_value']['Row']

export type ImportLog = Database['public']['Tables']['import_log']['Row']

// JWT app_metadata claims injected by the Supabase Auth Hook
export interface AppMetadata {
  its_no: number
  role: Role
  sector_ids: number[]
  subsector_ids: number[]
  must_change_password: boolean
}

// Extended user session info available in middleware and server components
export interface SessionUser {
  supabase_auth_id: string
  its_no: number
  role: Role
  sector_ids: number[]
  subsector_ids: number[]
  must_change_password: boolean
}

// Member list item (joins mumin with subsector/sector)
// Note: canonical definition lives in lib/members/getMembers.ts — this re-exports it for convenience
export interface MemberListItem {
  its_no: number
  name: string
  gender: 'M' | 'F'
  balig_status: 'Balig' | 'Ghair Balig'
  phone: string | null
  status: string
  subsector_id: number
  subsector_name: string
  sector_id: number
  sector_name: string
  sabeel_no: string
}

// Filters for member list
export interface MemberFilters {
  sector_id?: number
  subsector_id?: number
  building_id?: number
  gender?: 'M' | 'F'
  balig_status?: 'Balig' | 'Ghair Balig'
  status?: MuminStatus
  search?: string
}
