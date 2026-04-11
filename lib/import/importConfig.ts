export type ImportTableKey =
  | 'mumin'
  | 'subsector'
  | 'sector'
  | 'profile_category'
  | 'profile_field'
  | 'profile_value'

export type ImportAction = 'add' | 'update' | 'upsert' | 'delete'

export interface TableConfig {
  label: string
  uniqueKey: string | string[]          // single col or composite
  requiredFields: string[]
  optionalFields: string[]
  csvHeaders: string[]                  // in order for template
  sampleRow: Record<string, string>
  supportsProfileValueFlow?: boolean    // true only for profile_value
}

export const IMPORT_TABLES: Record<ImportTableKey, TableConfig> = {
  mumin: {
    label: 'Members',
    uniqueKey: 'its_no',
    requiredFields: ['its_no', 'name'],
    optionalFields: ['gender', 'date_of_birth', 'balig_status', 'phone', 'alternate_phone', 'email', 'status', 'sabeel_no', 'subsector_id'],
    csvHeaders: ['its_no', 'name', 'gender', 'date_of_birth', 'balig_status', 'phone', 'alternate_phone', 'email', 'status', 'sabeel_no', 'subsector_id'],
    sampleRow: { its_no: '10000001', name: 'Ali Hussain', gender: 'male', date_of_birth: '1990-01-15', balig_status: 'true', phone: '12345678', alternate_phone: '', email: 'ali@example.com', status: 'active', sabeel_no: '', subsector_id: '' },
  },
  subsector: {
    label: 'Subsectors',
    uniqueKey: 'id',
    requiredFields: ['id', 'name', 'sector_id'],
    optionalFields: [],
    csvHeaders: ['id', 'name', 'sector_id'],
    sampleRow: { id: 'uuid-here', name: 'Al Noor', sector_id: 'uuid-here' },
  },
  sector: {
    label: 'Sectors',
    uniqueKey: 'id',
    requiredFields: ['id', 'name'],
    optionalFields: [],
    csvHeaders: ['id', 'name'],
    sampleRow: { id: 'uuid-here', name: 'Sector 1' },
  },
  profile_category: {
    label: 'Profile Categories',
    uniqueKey: 'id',
    requiredFields: ['id', 'name'],
    optionalFields: ['sort_order'],
    csvHeaders: ['id', 'name', 'sort_order'],
    sampleRow: { id: 'uuid-here', name: 'Health', sort_order: '1' },
  },
  profile_field: {
    label: 'Profile Fields',
    uniqueKey: 'id',
    requiredFields: ['id', 'caption', 'category_id', 'field_type'],
    optionalFields: ['visibility_level', 'is_data_entry', 'mumin_can_edit', 'sort_order'],
    csvHeaders: ['id', 'caption', 'category_id', 'field_type', 'visibility_level', 'is_data_entry', 'mumin_can_edit', 'sort_order'],
    sampleRow: { id: 'uuid-here', caption: 'Blood Type', category_id: 'uuid-here', field_type: 'static', visibility_level: 'admin', is_data_entry: 'true', mumin_can_edit: 'false', sort_order: '1' },
  },
  profile_value: {
    label: 'Profile Values',
    uniqueKey: ['its_no', 'field_id'],               // composite; recorded_date added for time-series
    requiredFields: ['its_no', 'field_id', 'value'],
    optionalFields: ['recorded_date', 'data_active'],
    csvHeaders: ['its_no', 'field_id', 'value', 'recorded_date', 'data_active'],
    sampleRow: { its_no: '10000001', field_id: 'uuid-here', value: 'A+', recorded_date: '', data_active: 'true' },
    supportsProfileValueFlow: true,
  },
}
