// export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// export type Database = {
//   public: {
//     Tables: {
//       sector: {
//         Row: { sector_id: number; sector_name: string; created_at: string; updated_at: string }
//         Insert: { sector_id?: number; sector_name: string; created_at?: string; updated_at?: string }
//         Update: { sector_id?: number; sector_name?: string; created_at?: string; updated_at?: string }
//         Relationships: []
//       }
//       subsector: {
//         Row: { subsector_id: number; sector_id: number; subsector_name: string; created_at: string; updated_at: string }
//         Insert: { subsector_id?: number; sector_id: number; subsector_name: string; created_at?: string; updated_at?: string }
//         Update: { subsector_id?: number; sector_id?: number; subsector_name?: string; created_at?: string; updated_at?: string }
//         Relationships: []
//       }
//       building: {
//         Row: { building_id: number; subsector_id: number; building_name: string; street: string | null; landmark: string | null; created_at: string; updated_at: string }
//         Insert: { building_id?: number; subsector_id: number; building_name: string; street?: string | null; landmark?: string | null; created_at?: string; updated_at?: string }
//         Update: { building_id?: number; subsector_id?: number; building_name?: string; street?: string | null; landmark?: string | null; created_at?: string; updated_at?: string }
//         Relationships: []
//       }
//       house: {
//         Row: { paci_no: string; building_id: number; floor_no: string | null; flat_no: string | null; created_at: string; updated_at: string }
//         Insert: { paci_no: string; building_id: number; floor_no?: string | null; flat_no?: string | null; created_at?: string; updated_at?: string }
//         Update: { paci_no?: string; building_id?: number; floor_no?: string | null; flat_no?: string | null; created_at?: string; updated_at?: string }
//         Relationships: []
//       }
//       family: {
//         Row: { sabeel_no: string; paci_no: string | null; head_its_no: number | null; registration_date: string | null; notes: string | null; created_at: string; updated_at: string }
//         Insert: { sabeel_no: string; paci_no?: string | null; head_its_no?: number | null; registration_date?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
//         Update: { sabeel_no?: string; paci_no?: string | null; head_its_no?: number | null; registration_date?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
//         Relationships: []
//       }
//       mumin: {
//         Row: {
//           its_no: number; sabeel_no: string; subsector_id: number; name: string
//           gender: 'M' | 'F'; date_of_birth: string | null; balig_status: 'Balig' | 'Ghair Balig'
//           phone: string | null; alternate_phone: string | null; email: string | null
//           email_verified: boolean; phone_verified: boolean
//           status: 'active' | 'deceased' | 'relocated' | 'left_community' | 'inactive'
//           status_changed_at: string | null; status_notes: string | null; notes: string | null
//           created_at: string; updated_at: string
//           role: 'SuperAdmin' | 'Admin' | 'Masool' | 'Musaid' | 'Mumin'
//           supabase_auth_id: string | null
//           is_active: boolean
//           must_change_password: boolean
//           last_login_at: string | null
//           force_relogin_at: string | null
//           family_type: 'Family' | 'Bachelor' | null
//         }
//         Insert: {
//           its_no: number; sabeel_no: string; subsector_id: number; name: string
//           gender: 'M' | 'F'; date_of_birth?: string | null; balig_status: 'Balig' | 'Ghair Balig'
//           phone?: string | null; alternate_phone?: string | null; email?: string | null
//           email_verified?: boolean; phone_verified?: boolean
//           status?: 'active' | 'deceased' | 'relocated' | 'left_community' | 'inactive'
//           status_changed_at?: string | null; status_notes?: string | null; notes?: string | null
//           created_at?: string; updated_at?: string
//           role?: 'SuperAdmin' | 'Admin' | 'Masool' | 'Musaid' | 'Mumin'
//           supabase_auth_id?: string | null
//           is_active?: boolean
//           must_change_password?: boolean
//           last_login_at?: string | null
//           force_relogin_at?: string | null
//           family_type?: 'Family' | 'Bachelor' | null
//         }
//         Update: {
//           its_no?: number; sabeel_no?: string; subsector_id?: number; name?: string
//           gender?: 'M' | 'F'; date_of_birth?: string | null; balig_status?: 'Balig' | 'Ghair Balig'
//           phone?: string | null; alternate_phone?: string | null; email?: string | null
//           email_verified?: boolean; phone_verified?: boolean
//           status?: 'active' | 'deceased' | 'relocated' | 'left_community' | 'inactive'
//           status_changed_at?: string | null; status_notes?: string | null; notes?: string | null
//           created_at?: string; updated_at?: string
//           role?: 'SuperAdmin' | 'Admin' | 'Masool' | 'Musaid' | 'Mumin'
//           supabase_auth_id?: string | null
//           is_active?: boolean
//           must_change_password?: boolean
//           last_login_at?: string | null
//           force_relogin_at?: string | null
//           family_type?: 'Family' | 'Bachelor' | null
//         }
//         Relationships: []
//       }
//       profile_category: {
//         Row: { id: number; name: string; sort_order: number; created_at: string; updated_at: string }
//         Insert: { id?: number; name: string; sort_order?: number; created_at?: string; updated_at?: string }
//         Update: { id?: number; name?: string; sort_order?: number; created_at?: string; updated_at?: string }
//         Relationships: []
//       }
//       profile_field: {
//         Row: {
//           id: number; category_id: number; caption: string
//           field_type: 'text' | 'date' | 'number' | 'select'
//           visibility_level: 1 | 2 | 3; is_data_entry: boolean; mumin_can_edit: boolean
//           sort_order: number; created_at: string; updated_at: string
//         }
//         Insert: {
//           id?: number; category_id: number; caption: string
//           field_type?: 'text' | 'date' | 'number' | 'select'
//           visibility_level: 1 | 2 | 3; is_data_entry?: boolean; mumin_can_edit?: boolean
//           sort_order?: number; created_at?: string; updated_at?: string
//         }
//         Update: {
//           id?: number; category_id?: number; caption?: string
//           field_type?: 'text' | 'date' | 'number' | 'select'
//           visibility_level?: 1 | 2 | 3; is_data_entry?: boolean; mumin_can_edit?: boolean
//           sort_order?: number; created_at?: string; updated_at?: string
//         }
//         Relationships: []
//       }
//       profile_value: {
//         Row: { id: number; its_no: number; field_id: number; value: string | null; updated_by: number | null; updated_at: string }
//         Insert: { id?: number; its_no: number; field_id: number; value?: string | null; updated_by?: number | null; updated_at?: string }
//         Update: { id?: number; its_no?: number; field_id?: number; value?: string | null; updated_by?: number | null; updated_at?: string }
//         Relationships: []
//       }
//       user_sector: {
//         Row: { its_no: number; sector_id: number }
//         Insert: { its_no: number; sector_id: number }
//         Update: { its_no?: number; sector_id?: number }
//         Relationships: []
//       }
//       user_subsector: {
//         Row: { its_no: number; subsector_id: number }
//         Insert: { its_no: number; subsector_id: number }
//         Update: { its_no?: number; subsector_id?: number }
//         Relationships: []
//       }
//       import_log: {
//         Row: {
//           id: number; import_type: 'core' | 'profile'; filename: string; imported_by: number
//           started_at: string; completed_at: string | null
//           status: 'running' | 'completed' | 'completed_with_errors' | 'failed'
//           total_rows: number | null; inserted_rows: number | null; updated_rows: number | null
//           error_rows: number | null; error_summary: Json | null
//         }
//         Insert: {
//           id?: number; import_type: 'core' | 'profile'; filename: string; imported_by: number
//           started_at?: string; completed_at?: string | null
//           status?: 'running' | 'completed' | 'completed_with_errors' | 'failed'
//           total_rows?: number | null; inserted_rows?: number | null; updated_rows?: number | null
//           error_rows?: number | null; error_summary?: Json | null
//         }
//         Update: {
//           id?: number; import_type?: 'core' | 'profile'; filename?: string; imported_by?: number
//           started_at?: string; completed_at?: string | null
//           status?: 'running' | 'completed' | 'completed_with_errors' | 'failed'
//           total_rows?: number | null; inserted_rows?: number | null; updated_rows?: number | null
//           error_rows?: number | null; error_summary?: Json | null
//         }
//         Relationships: []
//       }
//       import_error_detail: {
//         Row: { id: number; import_id: number; row_number: number; raw_row_data: Json; error_message: string; its_no: number | null }
//         Insert: { id?: number; import_id: number; row_number: number; raw_row_data: Json; error_message: string; its_no?: number | null }
//         Update: { id?: number; import_id?: number; row_number?: number; raw_row_data?: Json; error_message?: string; its_no?: number | null }
//         Relationships: []
//       }
//       activity_log: {
//         Row: { id: number; performed_by_its: number | null; action: string; entity_type: string; entity_id: string; metadata: Json | null; created_at: string }
//         Insert: { id?: number; performed_by_its?: number | null; action: string; entity_type: string; entity_id: string; metadata?: Json | null; created_at?: string }
//         Update: { id?: number; performed_by_its?: number | null; action?: string; entity_type?: string; entity_id?: string; metadata?: Json | null; created_at?: string }
//         Relationships: []
//       }
//       export_log: {
//         Row: { id: number; exported_by: number; exported_at: string; filter_config: Json; column_config: Json; row_count: number; storage_path: string | null; status: 'completed' | 'failed' }
//         Insert: { id?: number; exported_by: number; exported_at?: string; filter_config: Json; column_config: Json; row_count: number; storage_path?: string | null; status: 'completed' | 'failed' }
//         Update: { id?: number; exported_by?: number; exported_at?: string; filter_config?: Json; column_config?: Json; row_count?: number; storage_path?: string | null; status?: 'completed' | 'failed' }
//         Relationships: []
//       }
//       saved_report: {
//         Row: { id: number; name: string; created_by: number; is_public: boolean; filter_config: Json; column_config: Json; created_at: string; updated_at: string }
//         Insert: { id?: number; name: string; created_by: number; is_public?: boolean; filter_config?: Json; column_config?: Json; created_at?: string; updated_at?: string }
//         Update: { id?: number; name?: string; created_by?: number; is_public?: boolean; filter_config?: Json; column_config?: Json; created_at?: string; updated_at?: string }
//         Relationships: []
//       }
//     }
//     Views: Record<string, never>
//     Functions: Record<string, never>
//     Enums: Record<string, never>
//   }
// }


export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      role_master: {
        Row: { role_name: string; description: string | null; sort_order: number; created_at: string }
        Insert: { role_name: string; description?: string | null; sort_order?: number; created_at?: string }
        Update: { role_name?: string; description?: string | null; sort_order?: number; created_at?: string }
        Relationships: []
      }
      sector: {
        Row: { sector_id: number; sector_name: string; created_at: string; updated_at: string }
        Insert: { sector_id?: number; sector_name: string; created_at?: string; updated_at?: string }
        Update: { sector_id?: number; sector_name?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      subsector: {
        Row: { subsector_id: number; sector_id: number; subsector_name: string; created_at: string; updated_at: string }
        Insert: { subsector_id?: number; sector_id: number; subsector_name: string; created_at?: string; updated_at?: string }
        Update: { subsector_id?: number; sector_id?: number; subsector_name?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      building: {
        Row: { building_id: number; subsector_id: number; building_name: string; street: string | null; landmark: string | null; created_at: string; updated_at: string }
        Insert: { building_id?: number; subsector_id: number; building_name: string; street?: string | null; landmark?: string | null; created_at?: string; updated_at?: string }
        Update: { building_id?: number; subsector_id?: number; building_name?: string; street?: string | null; landmark?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      house: {
        Row: { paci_no: string; building_id: number; floor_no: string | null; flat_no: string | null; created_at: string; updated_at: string }
        Insert: { paci_no: string; building_id: number; floor_no?: string | null; flat_no?: string | null; created_at?: string; updated_at?: string }
        Update: { paci_no?: string; building_id?: number; floor_no?: string | null; flat_no?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      family: {
        Row: { sabeel_no: string; paci_no: string | null; head_its_no: number | null; registration_date: string | null; notes: string | null; created_at: string; updated_at: string }
        Insert: { sabeel_no: string; paci_no?: string | null; head_its_no?: number | null; registration_date?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { sabeel_no?: string; paci_no?: string | null; head_its_no?: number | null; registration_date?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      mumin: {
        Row: {
          its_no: number; sabeel_no: string; subsector_id: number; name: string
          gender: 'M' | 'F'; date_of_birth: string | null; balig_status: 'Balig' | 'Ghair Balig'
          phone: string | null; alternate_phone: string | null; email: string | null
          email_verified: boolean; phone_verified: boolean
          status: 'active' | 'deceased' | 'relocated' | 'left_community' | 'inactive'
          status_changed_at: string | null; status_notes: string | null; notes: string | null
          created_at: string; updated_at: string
          role: string  // FK → role_master.role_name (was hardcoded union before migration 005)
          supabase_auth_id: string | null
          is_active: boolean
          must_change_password: boolean
          last_login_at: string | null
          force_relogin_at: string | null
          family_type: 'Family' | 'Bachelor' | null
        }
        Insert: {
          its_no: number; sabeel_no: string; subsector_id: number; name: string
          gender: 'M' | 'F'; date_of_birth?: string | null; balig_status: 'Balig' | 'Ghair Balig'
          phone?: string | null; alternate_phone?: string | null; email?: string | null
          email_verified?: boolean; phone_verified?: boolean
          status?: 'active' | 'deceased' | 'relocated' | 'left_community' | 'inactive'
          status_changed_at?: string | null; status_notes?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
          role?: string  // FK → role_master.role_name
          supabase_auth_id?: string | null
          is_active?: boolean
          must_change_password?: boolean
          last_login_at?: string | null
          force_relogin_at?: string | null
          family_type?: 'Family' | 'Bachelor' | null
        }
        Update: {
          its_no?: number; sabeel_no?: string; subsector_id?: number; name?: string
          gender?: 'M' | 'F'; date_of_birth?: string | null; balig_status?: 'Balig' | 'Ghair Balig'
          phone?: string | null; alternate_phone?: string | null; email?: string | null
          email_verified?: boolean; phone_verified?: boolean
          status?: 'active' | 'deceased' | 'relocated' | 'left_community' | 'inactive'
          status_changed_at?: string | null; status_notes?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
          role?: string  // FK → role_master.role_name
          supabase_auth_id?: string | null
          is_active?: boolean
          must_change_password?: boolean
          last_login_at?: string | null
          force_relogin_at?: string | null
          family_type?: 'Family' | 'Bachelor' | null
        }
        Relationships: []
      }
      profile_category: {
        Row: { id: number; name: string; sort_order: number; created_at: string; updated_at: string }
        Insert: { id?: number; name: string; sort_order?: number; created_at?: string; updated_at?: string }
        Update: { id?: number; name?: string; sort_order?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      profile_field: {
        Row: {
          id: number; category_id: number; caption: string
          field_type: 'text' | 'date' | 'number' | 'select'
          visibility_level: 1 | 2 | 3; is_data_entry: boolean; mumin_can_edit: boolean
          sort_order: number; created_at: string; updated_at: string
        }
        Insert: {
          id?: number; category_id: number; caption: string
          field_type?: 'text' | 'date' | 'number' | 'select'
          visibility_level: 1 | 2 | 3; is_data_entry?: boolean; mumin_can_edit?: boolean
          sort_order?: number; created_at?: string; updated_at?: string
        }
        Update: {
          id?: number; category_id?: number; caption?: string
          field_type?: 'text' | 'date' | 'number' | 'select'
          visibility_level?: 1 | 2 | 3; is_data_entry?: boolean; mumin_can_edit?: boolean
          sort_order?: number; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      profile_value: {
        Row: { id: number; its_no: number; field_id: number; value: string | null; updated_by: number | null; updated_at: string }
        Insert: { id?: number; its_no: number; field_id: number; value?: string | null; updated_by?: number | null; updated_at?: string }
        Update: { id?: number; its_no?: number; field_id?: number; value?: string | null; updated_by?: number | null; updated_at?: string }
        Relationships: []
      }
      user_sector: {
        Row: { its_no: number; sector_id: number }
        Insert: { its_no: number; sector_id: number }
        Update: { its_no?: number; sector_id?: number }
        Relationships: []
      }
      user_subsector: {
        Row: { its_no: number; subsector_id: number }
        Insert: { its_no: number; subsector_id: number }
        Update: { its_no?: number; subsector_id?: number }
        Relationships: []
      }
      import_log: {
        Row: {
          id: number; import_type: 'core' | 'profile'; filename: string; imported_by: number
          started_at: string; completed_at: string | null
          status: 'running' | 'completed' | 'completed_with_errors' | 'failed'
          total_rows: number | null; inserted_rows: number | null; updated_rows: number | null
          error_rows: number | null; error_summary: Json | null
        }
        Insert: {
          id?: number; import_type: 'core' | 'profile'; filename: string; imported_by: number
          started_at?: string; completed_at?: string | null
          status?: 'running' | 'completed' | 'completed_with_errors' | 'failed'
          total_rows?: number | null; inserted_rows?: number | null; updated_rows?: number | null
          error_rows?: number | null; error_summary?: Json | null
        }
        Update: {
          id?: number; import_type?: 'core' | 'profile'; filename?: string; imported_by?: number
          started_at?: string; completed_at?: string | null
          status?: 'running' | 'completed' | 'completed_with_errors' | 'failed'
          total_rows?: number | null; inserted_rows?: number | null; updated_rows?: number | null
          error_rows?: number | null; error_summary?: Json | null
        }
        Relationships: []
      }
      import_error_detail: {
        Row: { id: number; import_id: number; row_number: number; raw_row_data: Json; error_message: string; its_no: number | null }
        Insert: { id?: number; import_id: number; row_number: number; raw_row_data: Json; error_message: string; its_no?: number | null }
        Update: { id?: number; import_id?: number; row_number?: number; raw_row_data?: Json; error_message?: string; its_no?: number | null }
        Relationships: []
      }
      activity_log: {
        Row: { id: number; performed_by_its: number | null; action: string; entity_type: string; entity_id: string; metadata: Json | null; created_at: string }
        Insert: { id?: number; performed_by_its?: number | null; action: string; entity_type: string; entity_id: string; metadata?: Json | null; created_at?: string }
        Update: { id?: number; performed_by_its?: number | null; action?: string; entity_type?: string; entity_id?: string; metadata?: Json | null; created_at?: string }
        Relationships: []
      }
      export_log: {
        Row: { id: number; exported_by: number; exported_at: string; filter_config: Json; column_config: Json; row_count: number; storage_path: string | null; status: 'completed' | 'failed' }
        Insert: { id?: number; exported_by: number; exported_at?: string; filter_config: Json; column_config: Json; row_count: number; storage_path?: string | null; status: 'completed' | 'failed' }
        Update: { id?: number; exported_by?: number; exported_at?: string; filter_config?: Json; column_config?: Json; row_count?: number; storage_path?: string | null; status?: 'completed' | 'failed' }
        Relationships: []
      }
      saved_report: {
        Row: { id: number; name: string; created_by: number; is_public: boolean; filter_config: Json; column_config: Json; created_at: string; updated_at: string }
        Insert: { id?: number; name: string; created_by: number; is_public?: boolean; filter_config?: Json; column_config?: Json; created_at?: string; updated_at?: string }
        Update: { id?: number; name?: string; created_by?: number; is_public?: boolean; filter_config?: Json; column_config?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}