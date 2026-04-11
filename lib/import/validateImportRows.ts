import { TableConfig } from './importConfig'

export interface RowError {
  row: number
  field: string
  error: string
}

export interface ValidationResult {
  valid: boolean
  errors: RowError[]
  validRows: Record<string, string>[]
}

export function validateImportRows(
  rows: Record<string, string>[],
  config: TableConfig,
  existingItsNos?: Set<string>    // for profile_value: skip rows whose its_no is missing
): ValidationResult {
  const errors: RowError[] = []
  const seenKeys = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    // Required fields
    for (const field of config.requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        errors.push({ row: rowNum, field, error: 'Required field is empty' })
      }
    }

    // Duplicate key check
    const keyVal = Array.isArray(config.uniqueKey)
      ? config.uniqueKey.map((k) => row[k] ?? '').join('|')
      : row[config.uniqueKey] ?? ''

    if (seenKeys.has(keyVal)) {
      errors.push({ row: rowNum, field: Array.isArray(config.uniqueKey) ? config.uniqueKey.join('+') : config.uniqueKey, error: 'Duplicate key in file' })
    }
    seenKeys.add(keyVal)

    // profile_value: its_no must exist in mumin
    if (existingItsNos && row['its_no'] && !existingItsNos.has(row['its_no'])) {
      errors.push({ row: rowNum, field: 'its_no', error: `ITS ${row['its_no']} not found in members — row will be skipped` })
    }
  }

  const errorRows = new Set(errors.map((e) => e.row))
  const validRows = rows.filter((_, i) => !errorRows.has(i + 1))

  return { valid: errors.length === 0, errors, validRows }
}
