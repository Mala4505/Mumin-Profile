export type FormStatus = 'draft' | 'pending_approval' | 'published' | 'closed'
export type FormType = 'simple' | 'detailed'

export interface FormQuestion {
  profile_field_id: string
  question_text: string
  sort_order: number
}

export interface FillerAccess {
  fillers: Array<
    | { type: 'role'; value: string }
    | { type: 'specific_masool'; value: string[] }
    | { type: 'specific_musaid'; value: string[] }
    | { type: 'self' }
  >
}

export interface AudienceFilters {
  all?: boolean
  gender?: 'male' | 'female'
  age_from?: number
  age_to?: number
  balig_status?: boolean
  sector_ids?: string[]
  subsector_ids?: string[]
  masool_its_nos?: string[]
  musaid_its_nos?: string[]
  roles?: string[]
}

export interface Form {
  id: string
  title: string
  description?: string
  umoor_category_id?: string
  created_by: string
  form_type: FormType
  questions: FormQuestion[]
  audience_filters: AudienceFilters
  filler_access: FillerAccess
  status: FormStatus
  approved_by?: string
  approved_at?: string
  expires_at?: string
  published_at?: string
  created_at: string
  // computed:
  is_expired?: boolean
}
