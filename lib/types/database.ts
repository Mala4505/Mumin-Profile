import type {
  AudienceFilters,
  FillerAccess,
} from "@/lib/types/forms";

export type Json =
  | string
  | number
  | boolean
  | null
  // | { [key: string]: Json }
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      role_master: {
        Row: {
          role_name: string;
          description: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          role_name: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          role_name?: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      sector: {
        Row: {
          sector_id: number;
          sector_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          sector_id?: number;
          sector_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          sector_id?: number;
          sector_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subsector: {
        Row: {
          subsector_id: number;
          sector_id: number;
          subsector_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          subsector_id?: number;
          sector_id: number;
          subsector_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subsector_id?: number;
          sector_id?: number;
          subsector_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      building: {
        Row: {
          building_id: number;
          subsector_id: number;
          building_name: string;
          street: string | null;
          landmark: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          building_id?: number;
          subsector_id: number;
          building_name: string;
          street?: string | null;
          landmark?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          building_id?: number;
          subsector_id?: number;
          building_name?: string;
          street?: string | null;
          landmark?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      house: {
        Row: {
          paci_no: string;
          building_id: number;
          floor_no: string | null;
          flat_no: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          paci_no: string;
          building_id: number;
          floor_no?: string | null;
          flat_no?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          paci_no?: string;
          building_id?: number;
          floor_no?: string | null;
          flat_no?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      family: {
        Row: {
          sabeel_no: string;
          paci_no: string | null;
          head_its_no: number | null;
          registration_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          sabeel_no: string;
          paci_no?: string | null;
          head_its_no?: number | null;
          registration_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          sabeel_no?: string;
          paci_no?: string | null;
          head_its_no?: number | null;
          registration_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mumin: {
        Row: {
          its_no: number;
          sabeel_no: string;
          subsector_id: number;
          name: string;
          gender: "M" | "F";
          date_of_birth: string | null;
          balig_status: "Balig" | "Ghair Balig";
          phone: string | null;
          alternate_phone: string | null;
          email: string | null;
          email_verified: boolean;
          phone_verified: boolean;
          status:
            | "active"
            | "deceased"
            | "relocated"
            | "left_community"
            | "inactive";
          status_changed_at: string | null;
          status_notes: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          role: "SuperAdmin" | "Admin" | "Masool" | "Musaid" | "Mumin";
          supabase_auth_id: string | null;
          is_active: boolean;
          must_change_password: boolean;
          last_login_at: string | null;
          force_relogin_at: string | null;
          family_type: "Family" | "Bachelor" | null;
        };
        Insert: {
          its_no: number;
          sabeel_no: string;
          subsector_id: number;
          name: string;
          gender: "M" | "F";
          date_of_birth?: string | null;
          balig_status: "Balig" | "Ghair Balig";
          phone?: string | null;
          alternate_phone?: string | null;
          email?: string | null;
          email_verified?: boolean;
          phone_verified?: boolean;
          status?:
            | "active"
            | "deceased"
            | "relocated"
            | "left_community"
            | "inactive";
          status_changed_at?: string | null;
          status_notes?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: "SuperAdmin" | "Admin" | "Masool" | "Musaid" | "Mumin";
          supabase_auth_id?: string | null;
          is_active?: boolean;
          must_change_password?: boolean;
          last_login_at?: string | null;
          force_relogin_at?: string | null;
          family_type?: "Family" | "Bachelor" | null;
        };
        Update: {
          its_no?: number;
          sabeel_no?: string;
          subsector_id?: number;
          name?: string;
          gender?: "M" | "F";
          date_of_birth?: string | null;
          balig_status?: "Balig" | "Ghair Balig";
          phone?: string | null;
          alternate_phone?: string | null;
          email?: string | null;
          email_verified?: boolean;
          phone_verified?: boolean;
          status?:
            | "active"
            | "deceased"
            | "relocated"
            | "left_community"
            | "inactive";
          status_changed_at?: string | null;
          status_notes?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: "SuperAdmin" | "Admin" | "Masool" | "Musaid" | "Mumin";
          supabase_auth_id?: string | null;
          is_active?: boolean;
          must_change_password?: boolean;
          last_login_at?: string | null;
          force_relogin_at?: string | null;
          family_type?: "Family" | "Bachelor" | null;
        };
        Relationships: [];
      };
      profile_category: {
        Row: {
          id: number;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // profile_field: {
      //   Row: {
      //     id: number;
      //     category_id: number;
      //     caption: string;
      //     field_type: "text" | "date" | "number" | "select";
      //     visibility_level: 1 | 2 | 3;
      //     is_data_entry: boolean;
      //     mumin_can_edit: boolean;
      //     sort_order: number;
      //     created_at: string;
      //     updated_at: string;
      //   };
      //   Insert: {
      //     id?: number;
      //     category_id: number;
      //     caption: string;
      //     field_type?: "text" | "date" | "number" | "select";
      //     visibility_level: 1 | 2 | 3;
      //     is_data_entry?: boolean;
      //     mumin_can_edit?: boolean;
      //     sort_order?: number;
      //     created_at?: string;
      //     updated_at?: string;
      //   };
      //   Update: {
      //     id?: number;
      //     category_id?: number;
      //     caption?: string;
      //     field_type?: "text" | "date" | "number" | "select";
      //     visibility_level?: 1 | 2 | 3;
      //     is_data_entry?: boolean;
      //     mumin_can_edit?: boolean;
      //     sort_order?: number;
      //     created_at?: string;
      //     updated_at?: string;
      //   };
      // Insert: {
      //   id: number;
      //   category_id: number;
      //   caption: string;
      //   field_type: "text" | "date" | "number" | "select" | "multiselect";
      //   behavior: "static" | "historical"; // THE MASTER SWITCH
      //   visibility_level: 1 | 2 | 3;
      //   is_data_entry: boolean;
      //   mumin_can_edit: boolean;
      //   sort_order: number;
      //   created_at: string;
      //   updated_at: string;
      // };
      // Update: {
      //   id: number;
      //   category_id: number;
      //   caption: string;
      //   field_type: "text" | "date" | "number" | "select" | "multiselect";
      //   behavior: "static" | "historical"; // THE MASTER SWITCH
      //   visibility_level: 1 | 2 | 3;
      //   is_data_entry: boolean;
      //   mumin_can_edit: boolean;
      //   sort_order: number;
      //   created_at: string;
      //   updated_at: string;
      // };
      profile_field: {
        Row: {
          id: number;
          category_id: number;
          caption: string;
          field_type: "text" | "date" | "number" | "select" | "multiselect";
          behavior: "static" | "historical"; // THE MASTER SWITCH
          visibility_level: number;
          is_data_entry: boolean;
          mumin_can_edit: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          category_id: number;
          caption: string;
          field_type: "text" | "date" | "number" | "select" | "multiselect";
          behavior: "static" | "historical"; // THE MASTER SWITCH
          visibility_level: number;
          is_data_entry: boolean;
          mumin_can_edit: boolean;
          sort_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          category_id?: number;
          caption?: string;
          field_type?: "text" | "date" | "number" | "select" | "multiselect";
          behavior?: "static" | "historical";
          visibility_level?: number;
          is_data_entry?: boolean;
          mumin_can_edit?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_value: {
        Row: {
          id: number; // ADD — SERIAL PRIMARY KEY
          its_no: number;
          field_id: number;
          value: string | null;
          updated_by: number | null;
          updated_at: string;
          recorded_date: string | null; // ADD
          data_active: boolean; // ADD — DEFAULT true
        };
        Insert: {
          id?: number;
          its_no: number;
          field_id: number;
          value?: string | null;
          updated_by?: number | null;
          updated_at?: string;
          recorded_date?: string | null;
          data_active?: boolean;
        };
        Update: {
          id?: number;
          its_no?: number;
          field_id?: number;
          value?: string | null;
          updated_by?: number | null;
          updated_at?: string;
          recorded_date?: string | null;
          data_active?: boolean;
        };
        Relationships: [];
      };
      // Row: {
      //   id: number;
      //   its_no: number;
      //   field_id: number;
      //   value: string | null;
      //   updated_by: number | null;
      //   updated_at: string;
      //   data_active: boolean; // <-- add here
      // };
      // Insert: {
      //   id?: number;
      //   its_no: number;
      //   field_id: number;
      //   value?: string | null;
      //   updated_by?: number | null;
      //   updated_at?: string;
      //   data_active?: boolean; // <-- add here
      // };
      // Update: {
      //   id?: number;
      //   its_no?: number;
      //   field_id?: number;
      //   value?: string | null;
      //   updated_by?: number | null;
      //   updated_at?: string;
      //   data_active?: boolean; // <-- add here
      // };
      user_sector: {
        Row: { its_no: number; sector_id: number };
        Insert: { its_no: number; sector_id: number };
        Update: { its_no?: number; sector_id?: number };
        Relationships: [];
      };
      user_subsector: {
        Row: { its_no: number; subsector_id: number };
        Insert: { its_no: number; subsector_id: number };
        Update: { its_no?: number; subsector_id?: number };
        Relationships: [];
      };
      import_log: {
        Row: {
          id: number;
          import_type: "core" | "profile";
          filename: string;
          imported_by: number;
          started_at: string;
          completed_at: string | null;
          status: "running" | "completed" | "completed_with_errors" | "failed";
          total_rows: number | null;
          inserted_rows: number | null;
          updated_rows: number | null;
          error_rows: number | null;
          error_summary: Json | null;
        };
        Insert: {
          id?: number;
          import_type: "core" | "profile";
          filename: string;
          imported_by: number;
          started_at?: string;
          completed_at?: string | null;
          status?: "running" | "completed" | "completed_with_errors" | "failed";
          total_rows?: number | null;
          inserted_rows?: number | null;
          updated_rows?: number | null;
          error_rows?: number | null;
          error_summary?: Json | null;
        };
        Update: {
          id?: number;
          import_type?: "core" | "profile";
          filename?: string;
          imported_by?: number;
          started_at?: string;
          completed_at?: string | null;
          status?: "running" | "completed" | "completed_with_errors" | "failed";
          total_rows?: number | null;
          inserted_rows?: number | null;
          updated_rows?: number | null;
          error_rows?: number | null;
          error_summary?: Json | null;
        };
        Relationships: [];
      };
      import_error_detail: {
        Row: {
          id: number;
          import_id: number;
          row_number: number;
          raw_row_data: Json;
          error_message: string;
          its_no: number | null;
        };
        Insert: {
          id?: number;
          import_id: number;
          row_number: number;
          raw_row_data: Json;
          error_message: string;
          its_no?: number | null;
        };
        Update: {
          id?: number;
          import_id?: number;
          row_number?: number;
          raw_row_data?: Json;
          error_message?: string;
          its_no?: number | null;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: number;
          performed_by_its: number | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          performed_by_its?: number | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          performed_by_its?: number | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      export_log: {
        Row: {
          id: number;
          exported_by: number;
          exported_at: string;
          filter_config: Json;
          column_config: Json;
          row_count: number;
          storage_path: string | null;
          status: "completed" | "failed";
        };
        Insert: {
          id?: number;
          exported_by: number;
          exported_at?: string;
          filter_config: Json;
          column_config: Json;
          row_count: number;
          storage_path?: string | null;
          status: "completed" | "failed";
        };
        Update: {
          id?: number;
          exported_by?: number;
          exported_at?: string;
          filter_config?: Json;
          column_config?: Json;
          row_count?: number;
          storage_path?: string | null;
          status?: "completed" | "failed";
        };
        Relationships: [];
      };
      saved_report: {
        Row: {
          id: number;
          name: string;
          created_by: number;
          is_public: boolean;
          filter_config: Json;
          column_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_by: number;
          is_public?: boolean;
          filter_config?: Json;
          column_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          created_by?: number;
          is_public?: boolean;
          filter_config?: Json;
          column_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      change_request: {
        Row: {
          id: number;
          sabeel_no: string;
          requested_by: number;
          remark: string;
          status: "pending" | "done";
          reviewed_by: number | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          sabeel_no: string;
          requested_by: number;
          remark: string;
          status?: "pending" | "done";
          reviewed_by?: number | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          sabeel_no?: string;
          requested_by?: number;
          remark?: string;
          status?: "pending" | "done";
          reviewed_by?: number | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // forms: {
      //   Row: {
      //     id: string;
      //     title: string;
      //     description: string | null;
      //     umoor_category_id: number | null;
      //     created_by: number | null; // PATCHED from string → number
      //     form_type: "simple" | "detailed" | null;
      //     questions: FormQuestion[] | null;
      //     audience_filters: AudienceFilters | null;
      //     filler_access: FillerAccess | null;
      //     status: "draft" | "pending_approval" | "published" | "closed" | null;
      //     approved_by: number | null;
      //     approved_at: string | null;
      //     expires_at: string | null;
      //     published_at: string | null;
      //     created_at: string | null;
      //   };
      forms: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          umoor_category_id: number | null;
          created_by: number | null;
          form_type: "simple" | "detailed" | null;
          status: "draft" | "pending_approval" | "published" | "closed";
          event_id: number | null;
          expires_at: string | null;
          audience_filters: AudienceFilters | null;
          filler_access: FillerAccess | null;
          approved_by: number | null;
          approved_at: string | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          umoor_category_id?: number | null;
          created_by?: number | null;
          form_type?: "simple" | "detailed" | null;
          event_id?: number | null;
          audience_filters?: AudienceFilters | null;
          filler_access?: FillerAccess | null;
          status?: "draft" | "pending_approval" | "published" | "closed";
          approved_by?: number | null;
          approved_at?: string | null;
          expires_at?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          umoor_category_id?: number | null;
          created_by?: number | null;
          form_type?: "simple" | "detailed" | null;
          event_id?: number | null;
          audience_filters?: AudienceFilters | null;
          filler_access?: FillerAccess | null;
          status?: "draft" | "pending_approval" | "published" | "closed";
          approved_by?: number | null;
          approved_at?: string | null;
          expires_at?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string; // UUID PRIMARY KEY
          its_no: number;
          type: string;
          title: string;
          read: boolean;
          body: string | null;
          related_form_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          its_no: number;
          type: string;
          title: string;
          read?: boolean;
          body?: string | null;
          related_form_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          its_no?: number;
          type?: string;
          title?: string;
          read?: boolean;
          body?: string | null;
          related_form_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // form_responses: {
      //   Row: {
      //     id: string;
      //     form_id: string;
      //     filled_for: number;
      //     submitted: boolean;
      //     submitted_at: string | null;
      //   };
      //   Insert: {
      //     id?: string;
      //     form_id: string;
      //     filled_for: number;
      //     submitted?: boolean;
      //     submitted_at?: string | null;
      //   };
      //   Update: {
      //     id?: string;
      //     form_id?: string;
      //     filled_for?: number;
      //     submitted?: boolean;
      //     submitted_at?: string | null;
      //   };
      event: {
        Row: {
          id: number;
          title: string;
          description: string | null;
          event_date: string;
          category_id: number | null;
          created_by: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          title: string;
          description?: string | null;
          event_date: string;
          category_id?: number | null;
          created_by?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          description?: string | null;
          event_date?: string;
          category_id?: number | null;
          created_by?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      form_responses: {
        Row: {
          id: string;
          form_id: string | null;
          profile_field_id: number | null;
          filled_for: number | null;
          filled_by: number | null;
          answer: string | null;
          remarks: string | null;
          event_id: number | null;
          submitted: boolean;
          submitted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id?: string | null;
          profile_field_id?: number | null;
          filled_for?: number | null;
          filled_by?: number | null;
          answer?: string | null;
          remarks?: string | null;
          event_id?: number | null;
          submitted?: boolean;
          submitted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string | null;
          profile_field_id?: number | null;
          filled_for?: number | null;
          filled_by?: number | null;
          answer?: string | null;
          remarks?: string | null;
          event_id?: number | null;
          submitted?: boolean;
          submitted_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // Row: {
      //   id: string;
      //   form_id: string;
      //   profile_field_id: number; // The "Anchor"
      //   filled_for: number;
      //   filled_by: number;
      //   answer: string | null;
      //   remarks: string | null;
      //   event_id: number | null; // Inherited from form for filtering
      //   submitted: boolean;
      //   submitted_at: string | null;
      // };
      // Insert: {
      //   id?: string;
      //   form_id: string;
      //   profile_field_id: number;
      //   filled_for: number;
      //   filled_by: number;
      //   answer?: string | null;
      //   remarks?: string | null;
      //   event_id?: number | null;
      //   submitted?: boolean;
      //   submitted_at?: string | null;
      // };
      // Update: {
      //   id?: string;
      //   form_id: string;
      //   profile_field_id: number;
      //   filled_for: number;
      //   filled_by: number;
      //   answer?: string | null;
      //   remarks?: string | null;
      //   event_id?: number | null;
      //   submitted?: boolean;
      //   submitted_at?: string | null;
      // };

      form_audience: {
        Row: {
          form_id: string;
          its_no: number;
        };
        Insert: {
          form_id: string;
          its_no: number;
        };
        Update: {
          form_id?: string;
          its_no?: number;
        };
        Relationships: [];
      };
      form_fields: {
        Row: {
          id: number;
          form_id: string;
          field_id: number;
          sort_order: number;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          form_id: string;
          field_id: number;
          sort_order?: number;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          form_id?: string;
          field_id?: number;
          sort_order?: number;
          is_required?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      form_filler_member_status: {
        Row: {
          form_id: string;
          filler_its_no: number;
          member_its_no: number;
          status: "pending" | "partial" | "complete";
          last_updated: string;
        };
        Insert: {
          form_id: string;
          filler_its_no: number;
          member_its_no: number;
          status?: "pending" | "partial" | "complete";
          last_updated?: string;
        };
        Update: {
          form_id?: string;
          filler_its_no?: number;
          member_its_no?: number;
          status?: "pending" | "partial" | "complete";
          last_updated?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    // Functions: Record<string, never>;
    Functions: {
      process_form_submission: {
        // Single entry point for all writes
        Args: {
          p_form_id: string;
          p_filled_by: number;
          p_responses: Json; // Array of {its_no, field_id, answer, remarks}
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
};
