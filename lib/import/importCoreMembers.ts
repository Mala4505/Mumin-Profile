import Papa from 'papaparse'
import { createAdminClient } from '@/lib/supabase/admin'
import { CoreRowSchema, validateHeaders, type CoreRowInput } from './validateCoreRow'

export interface ImportResult {
  importLogId: number
  totalRows: number
  insertedRows: number
  updatedRows: number
  errorRows: number
  errors: Array<{ rowNumber: number; itsNo?: string; rawData: Record<string, string>; message: string }>
  status: 'completed' | 'completed_with_errors' | 'failed'
}

export async function importCoreMembers(
  csvText: string,
  filename: string,
  importedByItsNo: number
): Promise<ImportResult> {
  const admin = createAdminClient()

  // Create import_log entry
  const { data: logRow, error: logErr } = await admin
    .from('import_log')
    .insert({
      import_type: 'core',
      filename,
      imported_by: importedByItsNo,
      status: 'running',
    })
    .select('id')
    .single()

  if (logErr || !logRow) {
    throw new Error(`Failed to create import log: ${logErr?.message}`)
  }
  const importLogId = logRow.id

  try {
    // ── Phase 1: Parse CSV ──────────────────────────────────
    const parsedCsv = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => v.trim(),
    })

    const headers = parsedCsv.meta.fields ?? []
    const missingHeaders = validateHeaders(headers)

    if (missingHeaders.length > 0) {
      await admin.from('import_log').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_summary: { missing_headers: missingHeaders },
      }).eq('id', importLogId)

      return {
        importLogId,
        totalRows: 0,
        insertedRows: 0,
        updatedRows: 0,
        errorRows: 0,
        errors: [{ rowNumber: 0, rawData: {}, message: `Missing required headers: ${missingHeaders.join(', ')}` }],
        status: 'failed',
      }
    }

    const rows = parsedCsv.data
    const totalRows = rows.length
    const errors: ImportResult['errors'] = []

    // ── Phase 2: Load reference data ─────────────────────────
    const [{ data: sectors }, { data: subsectors }, { data: buildings }] = await Promise.all([
      admin.from('sector').select('sector_id, sector_name'),
      admin.from('subsector').select('subsector_id, sector_id, subsector_name'),
      admin.from('building').select('building_id, subsector_id, building_name'),
    ])

    const sectorMap = new Map((sectors ?? []).map(s => [s.sector_name.toLowerCase(), s.sector_id]))
    const subsectorMap = new Map((subsectors ?? []).map(s => [
      `${s.sector_id}::${s.subsector_name.toLowerCase()}`, s.subsector_id
    ]))

    // building map: key = "subsector_id::building_name_lower"
    const buildingMap = new Map((buildings ?? []).map(b => [
      `${b.subsector_id}::${b.building_name.toLowerCase()}`, b.building_id
    ]))

    // ── Phase 3 + 4: Validate + upsert each row ───────────────
    let insertedRows = 0
    let updatedRows = 0

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2 // 1-based + header row
      const raw = rows[i] as Record<string, string>

      // Row validation
      const parsed_row = CoreRowSchema.safeParse(raw)
      if (!parsed_row.success) {
        const msg = parsed_row.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
        errors.push({ rowNumber: rowNum, rawData: raw, message: msg })
        await admin.from('import_error_detail').insert({
          import_id: importLogId, row_number: rowNum, raw_row_data: raw, error_message: msg, its_no: null,
        })
        continue
      }

      const row: CoreRowInput = parsed_row.data

      // Sector resolution
      const sectorId = sectorMap.get(row.Sector.toLowerCase())
      if (!sectorId) {
        const msg = `Sector not found: "${row.Sector}"`
        errors.push({ rowNumber: rowNum, itsNo: row.ITS_NO, rawData: raw, message: msg })
        await admin.from('import_error_detail').insert({
          import_id: importLogId, row_number: rowNum, raw_row_data: raw, error_message: msg, its_no: parseInt(row.ITS_NO),
        })
        continue
      }

      // SubSector resolution
      const subsectorKey = `${sectorId}::${row.SubSector.toLowerCase()}`
      const subsectorId = subsectorMap.get(subsectorKey)
      if (!subsectorId) {
        const msg = `SubSector not found: "${row.SubSector}" in Sector "${row.Sector}"`
        errors.push({ rowNumber: rowNum, itsNo: row.ITS_NO, rawData: raw, message: msg })
        await admin.from('import_error_detail').insert({
          import_id: importLogId, row_number: rowNum, raw_row_data: raw, error_message: msg, its_no: parseInt(row.ITS_NO),
        })
        continue
      }

      // Building resolution — auto-create if not found
      const buildingKey = `${subsectorId}::${row.Building.toLowerCase()}`
      let buildingId = buildingMap.get(buildingKey)
      if (!buildingId) {
        const { data: newBuilding, error: bErr } = await admin
          .from('building')
          .insert({ subsector_id: subsectorId, building_name: row.Building })
          .select('building_id')
          .single()
        if (bErr || !newBuilding) {
          const msg = `Failed to create building "${row.Building}": ${bErr?.message}`
          errors.push({ rowNumber: rowNum, itsNo: row.ITS_NO, rawData: raw, message: msg })
          continue
        }
        buildingId = newBuilding.building_id
        buildingMap.set(buildingKey, buildingId)
      }

      // Upsert family
      await admin.from('family').upsert({ sabeel_no: row.Sabeel_No }, { onConflict: 'sabeel_no', ignoreDuplicates: true })

      // Upsert house
      await admin.from('house').upsert({
        paci_no: row.PACI_NO,
        sabeel_no: row.Sabeel_No,
        building_id: buildingId,
        floor_no: row.Floor_No ?? null,
        flat_no: row.Flat_No ?? null,
      }, { onConflict: 'paci_no' })

      // Check if mumin exists (to track insert vs update)
      const { data: existing } = await admin
        .from('mumin')
        .select('its_no')
        .eq('its_no', parseInt(row.ITS_NO))
        .maybeSingle()

      const muminData = {
        its_no: parseInt(row.ITS_NO),
        sabeel_no: row.Sabeel_No,
        subsector_id: subsectorId,
        name: row.Name,
        gender: row.Gender as 'M' | 'F',
        date_of_birth: row.DOB ? row.DOB : null,
        balig_status: row.Balig as 'Balig' | 'Ghair Balig',
      }

      const { error: upsertErr } = await admin
        .from('mumin')
        .upsert(muminData, { onConflict: 'its_no' })

      if (upsertErr) {
        const msg = `Failed to upsert mumin ${row.ITS_NO}: ${upsertErr.message}`
        errors.push({ rowNumber: rowNum, itsNo: row.ITS_NO, rawData: raw, message: msg })
        await admin.from('import_error_detail').insert({
          import_id: importLogId, row_number: rowNum, raw_row_data: raw, error_message: msg, its_no: parseInt(row.ITS_NO),
        })
        continue
      }

      if (existing) {
        updatedRows++
      } else {
        insertedRows++

        // Provision Supabase Auth user for new Mumin
        // email = {its_no}@mumin.local, default password = Sabeel_No
        const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
          email: `${row.ITS_NO}@mumin.local`,
          password: row.Sabeel_No,
          email_confirm: true,
          app_metadata: {
            its_no: parseInt(row.ITS_NO),
            role: 'Mumin',
            sector_ids: [],
            subsector_ids: [],
            must_change_password: false,
          },
        })

        if (authUser?.user) {
          await admin.from('mumin').update({
            supabase_auth_id: authUser.user.id,
            role: 'Mumin',
            is_active: true,
            must_change_password: false,
          }).eq('its_no', parseInt(row.ITS_NO))
        } else if (authErr && !authErr.message.includes('already registered')) {
          // Non-fatal: log but don't fail the row
          console.warn(`Auth provision failed for ITS ${row.ITS_NO}: ${authErr.message}`)
        }
      }
    }

    const errorRows = errors.length
    const status: ImportResult['status'] = errorRows === 0
      ? 'completed'
      : errorRows === totalRows
      ? 'failed'
      : 'completed_with_errors'

    // Update import_log with final counts
    await admin.from('import_log').update({
      status,
      completed_at: new Date().toISOString(),
      total_rows: totalRows,
      inserted_rows: insertedRows,
      updated_rows: updatedRows,
      error_rows: errorRows,
      error_summary: errorRows > 0 ? { first_errors: errors.slice(0, 5) } : null,
    }).eq('id', importLogId)

    return { importLogId, totalRows, insertedRows, updatedRows, errorRows, errors, status }

  } catch (err) {
    await admin.from('import_log').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_summary: { message: String(err) },
    }).eq('id', importLogId)
    throw err
  }
}
