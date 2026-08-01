export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
          metadata: Json | null
          performed_by_its: number | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          metadata?: Json | null
          performed_by_its?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          metadata?: Json | null
          performed_by_its?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_performed_by_fkey"
            columns: ["performed_by_its"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "activity_log_performed_by_fkey"
            columns: ["performed_by_its"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "activity_log_performed_by_fkey"
            columns: ["performed_by_its"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "activity_log_performed_by_fkey"
            columns: ["performed_by_its"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
        ]
      }
      building: {
        Row: {
          building_id: number
          building_name: string
          created_at: string
          landmark: string | null
          street: string | null
          subsector_id: number
          updated_at: string
        }
        Insert: {
          building_id?: number
          building_name: string
          created_at?: string
          landmark?: string | null
          street?: string | null
          subsector_id: number
          updated_at?: string
        }
        Update: {
          building_id?: number
          building_name?: string
          created_at?: string
          landmark?: string | null
          street?: string | null
          subsector_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_subsector_id_fkey"
            columns: ["subsector_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["subsector_id"]
          },
          {
            foreignKeyName: "building_subsector_id_fkey"
            columns: ["subsector_id"]
            isOneToOne: false
            referencedRelation: "subsector"
            referencedColumns: ["subsector_id"]
          },
        ]
      }
      change_request: {
        Row: {
          created_at: string
          id: number
          remark: string
          requested_by: number
          requested_changes: Json | null
          reviewed_at: string | null
          reviewed_by: number | null
          reviewer_note: string | null
          sabeel_no: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: number
          remark: string
          requested_by: number
          requested_changes?: Json | null
          reviewed_at?: string | null
          reviewed_by?: number | null
          reviewer_note?: string | null
          sabeel_no: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: number
          remark?: string
          requested_by?: number
          requested_changes?: Json | null
          reviewed_at?: string | null
          reviewed_by?: number | null
          reviewer_note?: string | null
          sabeel_no?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_request_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "change_request_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "change_request_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "change_request_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "change_request_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "change_request_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "change_request_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "change_request_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "change_request_sabeel_no_fkey"
            columns: ["sabeel_no"]
            isOneToOne: false
            referencedRelation: "family"
            referencedColumns: ["sabeel_no"]
          },
        ]
      }
      event: {
        Row: {
          category_id: number | null
          created_at: string
          created_by: number | null
          description: string | null
          end_date: string | null
          event_date: string
          id: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          created_by?: number | null
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: number | null
          created_at?: string
          created_by?: number | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "profile_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "event_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "event_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "event_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
        ]
      }
      export_log: {
        Row: {
          column_config: Json
          exported_at: string
          exported_by: number
          filter_config: Json
          id: number
          row_count: number
          status: string
          storage_path: string | null
        }
        Insert: {
          column_config?: Json
          exported_at?: string
          exported_by: number
          filter_config?: Json
          id?: number
          row_count?: number
          status?: string
          storage_path?: string | null
        }
        Update: {
          column_config?: Json
          exported_at?: string
          exported_by?: number
          filter_config?: Json
          id?: number
          row_count?: number
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_log_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "export_log_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "export_log_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "export_log_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
        ]
      }
      family: {
        Row: {
          created_at: string
          head_its_no: number | null
          notes: string | null
          paci_no: string | null
          registration_date: string | null
          sabeel_no: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          head_its_no?: number | null
          notes?: string | null
          paci_no?: string | null
          registration_date?: string | null
          sabeel_no: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          head_its_no?: number | null
          notes?: string | null
          paci_no?: string | null
          registration_date?: string | null
          sabeel_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_paci_no_fkey"
            columns: ["paci_no"]
            isOneToOne: false
            referencedRelation: "house"
            referencedColumns: ["paci_no"]
          },
        ]
      }
      form_audience: {
        Row: {
          form_id: string
          its_no: number
        }
        Insert: {
          form_id: string
          its_no: number
        }
        Update: {
          form_id?: string
          its_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_audience_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_audience_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_audience_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_audience_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_audience_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          field_id: number
          field_type_override: string | null
          form_id: string
          hidden_from_roles: Json
          id: number
          is_required: boolean
          options_override: Json | null
          question_text: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          field_id: number
          field_type_override?: string | null
          form_id: string
          hidden_from_roles?: Json
          id?: number
          is_required?: boolean
          options_override?: Json | null
          question_text?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          field_id?: number
          field_type_override?: string | null
          form_id?: string
          hidden_from_roles?: Json
          id?: number
          is_required?: boolean
          options_override?: Json | null
          question_text?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "profile_field"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_filler_member_status: {
        Row: {
          filler_its_no: number
          form_id: string
          last_updated: string
          member_its_no: number
          status: string
        }
        Insert: {
          filler_its_no: number
          form_id: string
          last_updated?: string
          member_its_no: number
          status?: string
        }
        Update: {
          filler_its_no?: number
          form_id?: string
          last_updated?: string
          member_its_no?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_filler_member_status_filler_its_no_fkey"
            columns: ["filler_its_no"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_filler_member_status_filler_its_no_fkey"
            columns: ["filler_its_no"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_filler_member_status_filler_its_no_fkey"
            columns: ["filler_its_no"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_filler_member_status_filler_its_no_fkey"
            columns: ["filler_its_no"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_filler_member_status_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_filler_member_status_member_its_no_fkey"
            columns: ["member_its_no"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_filler_member_status_member_its_no_fkey"
            columns: ["member_its_no"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_filler_member_status_member_its_no_fkey"
            columns: ["member_its_no"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_filler_member_status_member_its_no_fkey"
            columns: ["member_its_no"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
        ]
      }
      form_responses: {
        Row: {
          answer: string | null
          created_at: string | null
          event_id: number | null
          filled_by: number | null
          filled_for: number | null
          form_id: string | null
          id: string
          profile_field_id: number | null
          remarks: string | null
          submitted: boolean | null
          submitted_at: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string | null
          event_id?: number | null
          filled_by?: number | null
          filled_for?: number | null
          form_id?: string | null
          id?: string
          profile_field_id?: number | null
          remarks?: string | null
          submitted?: boolean | null
          submitted_at?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string | null
          event_id?: number | null
          filled_by?: number | null
          filled_for?: number | null
          form_id?: string | null
          id?: string
          profile_field_id?: number | null
          remarks?: string | null
          submitted?: boolean | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_responses_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_responses_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_responses_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_its_no_fkey"
            columns: ["filled_for"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_responses_its_no_fkey"
            columns: ["filled_for"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_responses_its_no_fkey"
            columns: ["filled_for"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_responses_its_no_fkey"
            columns: ["filled_for"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "form_responses_profile_field_id_fkey"
            columns: ["profile_field_id"]
            isOneToOne: false
            referencedRelation: "profile_field"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          approved_at: string | null
          approved_by: number | null
          audience_filters: Json | null
          created_at: string | null
          created_by: number | null
          description: string | null
          event_id: number | null
          expires_at: string | null
          filler_access: Json | null
          form_type: string | null
          id: string
          published_at: string | null
          response_viewer_roles: Json | null
          status: string | null
          title: string
          umoor_category_id: number | null
          viewable_by_roles: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: number | null
          audience_filters?: Json | null
          created_at?: string | null
          created_by?: number | null
          description?: string | null
          event_id?: number | null
          expires_at?: string | null
          filler_access?: Json | null
          form_type?: string | null
          id?: string
          published_at?: string | null
          response_viewer_roles?: Json | null
          status?: string | null
          title: string
          umoor_category_id?: number | null
          viewable_by_roles?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: number | null
          audience_filters?: Json | null
          created_at?: string | null
          created_by?: number | null
          description?: string | null
          event_id?: number | null
          expires_at?: string | null
          filler_access?: Json | null
          form_type?: string | null
          id?: string
          published_at?: string | null
          response_viewer_roles?: Json | null
          status?: string | null
          title?: string
          umoor_category_id?: number | null
          viewable_by_roles?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "forms_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "forms_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "forms_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_umoor_category_id_fkey"
            columns: ["umoor_category_id"]
            isOneToOne: false
            referencedRelation: "profile_category"
            referencedColumns: ["id"]
          },
        ]
      }
      house: {
        Row: {
          building_id: number
          created_at: string
          flat_no: string | null
          floor_no: string | null
          paci_no: string
          updated_at: string
        }
        Insert: {
          building_id: number
          created_at?: string
          flat_no?: string | null
          floor_no?: string | null
          paci_no: string
          updated_at?: string
        }
        Update: {
          building_id?: number
          created_at?: string
          flat_no?: string | null
          floor_no?: string | null
          paci_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "building"
            referencedColumns: ["building_id"]
          },
          {
            foreignKeyName: "house_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["building_id"]
          },
        ]
      }
      import_error_detail: {
        Row: {
          error_message: string
          id: number
          import_id: number
          its_no: number | null
          raw_row_data: Json
          row_number: number
        }
        Insert: {
          error_message: string
          id?: number
          import_id: number
          its_no?: number | null
          raw_row_data: Json
          row_number: number
        }
        Update: {
          error_message?: string
          id?: number
          import_id?: number
          its_no?: number | null
          raw_row_data?: Json
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_error_detail_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "import_log"
            referencedColumns: ["id"]
          },
        ]
      }
      import_log: {
        Row: {
          completed_at: string | null
          error_rows: number | null
          error_summary: Json | null
          filename: string
          id: number
          import_type: string
          imported_by: number
          inserted_rows: number | null
          started_at: string
          status: string
          total_rows: number | null
          updated_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          error_rows?: number | null
          error_summary?: Json | null
          filename: string
          id?: number
          import_type: string
          imported_by: number
          inserted_rows?: number | null
          started_at?: string
          status?: string
          total_rows?: number | null
          updated_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          error_rows?: number | null
          error_summary?: Json | null
          filename?: string
          id?: number
          import_type?: string
          imported_by?: number
          inserted_rows?: number | null
          started_at?: string
          status?: string
          total_rows?: number | null
          updated_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_log_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "import_log_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "import_log_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "import_log_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      mumin: {
        Row: {
          alternate_phone: string | null
          balig_status: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          email_verified: boolean
          family_type: string | null
          force_relogin_at: string | null
          gender: string
          is_active: boolean
          is_hof: boolean
          its_no: number
          last_login_at: string | null
          must_change_password: boolean
          name: string
          notes: string | null
          phone: string | null
          phone_verified: boolean
          role: string
          sabeel_no: string
          status: string
          status_changed_at: string | null
          status_notes: string | null
          subsector_id: number
          supabase_auth_id: string | null
          updated_at: string
        }
        Insert: {
          alternate_phone?: string | null
          balig_status: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean
          family_type?: string | null
          force_relogin_at?: string | null
          gender: string
          is_active?: boolean
          is_hof?: boolean
          its_no: number
          last_login_at?: string | null
          must_change_password?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          phone_verified?: boolean
          role?: string
          sabeel_no: string
          status?: string
          status_changed_at?: string | null
          status_notes?: string | null
          subsector_id: number
          supabase_auth_id?: string | null
          updated_at?: string
        }
        Update: {
          alternate_phone?: string | null
          balig_status?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean
          family_type?: string | null
          force_relogin_at?: string | null
          gender?: string
          is_active?: boolean
          is_hof?: boolean
          its_no?: number
          last_login_at?: string | null
          must_change_password?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          phone_verified?: boolean
          role?: string
          sabeel_no?: string
          status?: string
          status_changed_at?: string | null
          status_notes?: string | null
          subsector_id?: number
          supabase_auth_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mumin_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "role_master"
            referencedColumns: ["role_name"]
          },
          {
            foreignKeyName: "mumin_sabeel_no_fkey"
            columns: ["sabeel_no"]
            isOneToOne: false
            referencedRelation: "family"
            referencedColumns: ["sabeel_no"]
          },
          {
            foreignKeyName: "mumin_subsector_id_fkey"
            columns: ["subsector_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["subsector_id"]
          },
          {
            foreignKeyName: "mumin_subsector_id_fkey"
            columns: ["subsector_id"]
            isOneToOne: false
            referencedRelation: "subsector"
            referencedColumns: ["subsector_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          its_no: number | null
          read: boolean
          related_form_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          its_no?: number | null
          read?: boolean
          related_form_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          its_no?: number | null
          read?: boolean
          related_form_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "notifications_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "notifications_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "notifications_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "notifications_related_form_id_fkey"
            columns: ["related_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_category: {
        Row: {
          created_at: string
          id: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profile_field: {
        Row: {
          behavior: string
          caption: string
          category_id: number
          created_at: string
          field_type: string
          id: number
          is_active: boolean
          is_data_entry: boolean
          mumin_can_edit: boolean
          options: Json | null
          sort_order: number
          updated_at: string
          visibility_level: number
        }
        Insert: {
          behavior?: string
          caption: string
          category_id: number
          created_at?: string
          field_type?: string
          id?: number
          is_active?: boolean
          is_data_entry?: boolean
          mumin_can_edit?: boolean
          options?: Json | null
          sort_order?: number
          updated_at?: string
          visibility_level: number
        }
        Update: {
          behavior?: string
          caption?: string
          category_id?: number
          created_at?: string
          field_type?: string
          id?: number
          is_active?: boolean
          is_data_entry?: boolean
          mumin_can_edit?: boolean
          options?: Json | null
          sort_order?: number
          updated_at?: string
          visibility_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_field_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "profile_category"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_value: {
        Row: {
          data_active: boolean
          field_id: number
          id: number
          its_no: number
          recorded_date: string | null
          updated_at: string
          updated_by: number | null
          value: string | null
        }
        Insert: {
          data_active?: boolean
          field_id: number
          id?: number
          its_no: number
          recorded_date?: string | null
          updated_at?: string
          updated_by?: number | null
          value?: string | null
        }
        Update: {
          data_active?: boolean
          field_id?: number
          id?: number
          its_no?: number
          recorded_date?: string | null
          updated_at?: string
          updated_by?: number | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profile_value_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "fk_profile_value_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "fk_profile_value_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "fk_profile_value_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "profile_value_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "profile_field"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_value_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "profile_value_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "profile_value_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "profile_value_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
        ]
      }
      role_master: {
        Row: {
          created_at: string
          description: string | null
          role_name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          role_name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          role_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      saved_report: {
        Row: {
          column_config: Json
          created_at: string
          created_by: number
          filter_config: Json
          id: number
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          column_config?: Json
          created_at?: string
          created_by: number
          filter_config?: Json
          id?: number
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          column_config?: Json
          created_at?: string
          created_by?: number
          filter_config?: Json
          id?: number
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_report_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "saved_report_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "saved_report_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "saved_report_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
        ]
      }
      sector: {
        Row: {
          created_at: string
          sector_id: number
          sector_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          sector_id?: number
          sector_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          sector_id?: number
          sector_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subsector: {
        Row: {
          created_at: string
          sector_id: number
          subsector_id: number
          subsector_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          sector_id: number
          subsector_id?: number
          subsector_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          sector_id?: number
          subsector_id?: number
          subsector_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subsector_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["sector_id"]
          },
          {
            foreignKeyName: "subsector_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector"
            referencedColumns: ["sector_id"]
          },
        ]
      }
      user_sector: {
        Row: {
          its_no: number
          sector_id: number
        }
        Insert: {
          its_no: number
          sector_id: number
        }
        Update: {
          its_no?: number
          sector_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_sector_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["sector_id"]
          },
          {
            foreignKeyName: "user_sector_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector"
            referencedColumns: ["sector_id"]
          },
        ]
      }
      user_subsector: {
        Row: {
          its_no: number
          subsector_id: number
        }
        Insert: {
          its_no: number
          subsector_id: number
        }
        Update: {
          its_no?: number
          subsector_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_subsector_subsector_id_fkey"
            columns: ["subsector_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["subsector_id"]
          },
          {
            foreignKeyName: "user_subsector_subsector_id_fkey"
            columns: ["subsector_id"]
            isOneToOne: false
            referencedRelation: "subsector"
            referencedColumns: ["subsector_id"]
          },
        ]
      }
      user_umoor: {
        Row: {
          category_id: number
          its_no: number
        }
        Insert: {
          category_id: number
          its_no: number
        }
        Update: {
          category_id?: number
          its_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_umoor_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "profile_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_umoor_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "user_umoor_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "mumin"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "user_umoor_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "mumin_auth"
            referencedColumns: ["its_no"]
          },
          {
            foreignKeyName: "user_umoor_its_no_fkey"
            columns: ["its_no"]
            isOneToOne: false
            referencedRelation: "v_member_profile"
            referencedColumns: ["its_no"]
          },
        ]
      }
    }
    Views: {
      member_directory: {
        Row: {
          balig_status: string | null
          building_id: number | null
          building_name: string | null
          date_of_birth: string | null
          flat_no: string | null
          floor_no: string | null
          gender: string | null
          head_its_no: number | null
          hof_name: string | null
          its_no: number | null
          landmark: string | null
          masool_name: string | null
          musaid_names: string | null
          name: string | null
          paci_no: string | null
          phone: string | null
          sabeel_no: string | null
          sector_id: number | null
          sector_name: string | null
          status: string | null
          subsector_id: number | null
          subsector_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_paci_no_fkey"
            columns: ["paci_no"]
            isOneToOne: false
            referencedRelation: "house"
            referencedColumns: ["paci_no"]
          },
          {
            foreignKeyName: "mumin_sabeel_no_fkey"
            columns: ["sabeel_no"]
            isOneToOne: false
            referencedRelation: "family"
            referencedColumns: ["sabeel_no"]
          },
        ]
      }
      mumin_auth: {
        Row: {
          is_active: boolean | null
          its_no: number | null
          paci_no: string | null
          sabeel_no: string | null
          supabase_auth_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_paci_no_fkey"
            columns: ["paci_no"]
            isOneToOne: false
            referencedRelation: "house"
            referencedColumns: ["paci_no"]
          },
          {
            foreignKeyName: "mumin_sabeel_no_fkey"
            columns: ["sabeel_no"]
            isOneToOne: false
            referencedRelation: "family"
            referencedColumns: ["sabeel_no"]
          },
        ]
      }
      v_member_profile: {
        Row: {
          alternate_phone: string | null
          balig_status: string | null
          building_name: string | null
          date_of_birth: string | null
          email: string | null
          flat_no: string | null
          floor_no: string | null
          gender: string | null
          its_no: number | null
          landmark: string | null
          name: string | null
          paci_no: string | null
          phone: string | null
          sabeel_no: string | null
          sector_id: number | null
          sector_name: string | null
          status: string | null
          subsector_id: number | null
          subsector_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_paci_no_fkey"
            columns: ["paci_no"]
            isOneToOne: false
            referencedRelation: "house"
            referencedColumns: ["paci_no"]
          },
          {
            foreignKeyName: "mumin_sabeel_no_fkey"
            columns: ["sabeel_no"]
            isOneToOne: false
            referencedRelation: "family"
            referencedColumns: ["sabeel_no"]
          },
          {
            foreignKeyName: "mumin_subsector_id_fkey"
            columns: ["subsector_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["subsector_id"]
          },
          {
            foreignKeyName: "mumin_subsector_id_fkey"
            columns: ["subsector_id"]
            isOneToOne: false
            referencedRelation: "subsector"
            referencedColumns: ["subsector_id"]
          },
          {
            foreignKeyName: "subsector_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["sector_id"]
          },
          {
            foreignKeyName: "subsector_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector"
            referencedColumns: ["sector_id"]
          },
        ]
      }
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_admin_dashboard_stats: {
        Args: { p_sector_ids: number[] }
        Returns: Json
      }
      get_jwt_its_no: { Args: never; Returns: number }
      get_jwt_role: { Args: never; Returns: string }
      get_jwt_sector_ids: { Args: never; Returns: number[] }
      get_jwt_subsector_ids: { Args: never; Returns: number[] }
      get_jwt_umoor_ids: { Args: never; Returns: number[] }
      get_masool_dashboard_stats: {
        Args: { p_sector_ids: number[] }
        Returns: Json
      }
      get_masool_subsector_ids: { Args: never; Returns: number[] }
      get_missing_auth_ids: {
        Args: never
        Returns: {
          its_no: number
          paci_no: string
        }[]
      }
      get_mumin_dashboard_stats: { Args: { p_its_no: number }; Returns: Json }
      get_mumin_name: { Args: { p_its_no: number }; Returns: string }
      get_musaid_dashboard_stats: {
        Args: { p_subsector_ids: number[] }
        Returns: Json
      }
      get_subsectors_with_musaid: {
        Args: never
        Returns: {
          musaid_names: string
          sector_id: number
          subsector_id: number
          subsector_name: string
        }[]
      }
      get_superadmin_dashboard_stats: { Args: never; Returns: Json }
      process_form_submission: {
        Args: { p_filled_by: number; p_form_id: string; p_responses: Json }
        Returns: undefined
      }
      resolve_form_audience: { Args: { p_form_id: string }; Returns: undefined }
      submit_form_responses:
        | {
            Args: { filled_by: number; form_id: string; responses: Json }
            Returns: undefined
          }
        | { Args: { payload: Json }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
