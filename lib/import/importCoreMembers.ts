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

/**
 * Normalise DOB to YYYY-MM-DD regardless of input format.
 * Handles: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, YYYY/MM/DD
 * Returns null if the value cannot be parsed.
 */
function parseDob(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // Already YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) {
    return s.replace(/\//g, '-')
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const match = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
  if (match) {
    const [, dd, mm, yyyy] = match
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

interface BuildingRecord {
  building_id: number
  street: string | null
  landmark: string | null
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
      admin.from('building').select('building_id, subsector_id, building_name, street, landmark'),
    ])

    const sectorMap = new Map((sectors ?? []).map(s => [s.sector_name.toLowerCase(), s.sector_id]))
    const subsectorMap = new Map((subsectors ?? []).map(s => [
      `${s.sector_id}::${s.subsector_name.toLowerCase()}`, s.subsector_id
    ]))

    // building map: key = "subsector_id::building_name_lower", value = full record
    const buildingMap = new Map<string, BuildingRecord>(
      (buildings ?? []).map(b => [
        `${b.subsector_id}::${b.building_name.toLowerCase()}`,
        { building_id: b.building_id, street: b.street, landmark: b.landmark }
      ])
    )

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
      const csvRole = (row.Role ?? 'Mumin') as 'Mumin' | 'Masool' | 'Musaid'

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

      // Building resolution — auto-create if not found, update street/landmark if provided
      const buildingKey = `${subsectorId}::${row.Building.toLowerCase()}`
      let buildingRecord = buildingMap.get(buildingKey)

      if (!buildingRecord) {
        // New building — create with street/landmark if provided
        const { data: newBuilding, error: bErr } = await admin
          .from('building')
          .insert({
            subsector_id: subsectorId,
            building_name: row.Building,
            street: row.Street ?? null,
            landmark: row.Landmark ?? null,
          })
          .select('building_id')
          .single()
        if (bErr || !newBuilding) {
          const msg = `Failed to create building "${row.Building}": ${bErr?.message}`
          errors.push({ rowNumber: rowNum, itsNo: row.ITS_NO, rawData: raw, message: msg })
          continue
        }
        buildingRecord = { building_id: newBuilding.building_id, street: row.Street ?? null, landmark: row.Landmark ?? null }
        buildingMap.set(buildingKey, buildingRecord)
      } else {
        // Existing building — update street/landmark only if CSV provides a value that differs
        const needsStreetUpdate = row.Street && row.Street !== buildingRecord.street
        const needsLandmarkUpdate = row.Landmark && row.Landmark !== buildingRecord.landmark

        if (needsStreetUpdate || needsLandmarkUpdate) {
          const updatePayload: Record<string, string> = {}
          if (needsStreetUpdate) updatePayload.street = row.Street!
          if (needsLandmarkUpdate) updatePayload.landmark = row.Landmark!

          await admin.from('building').update(updatePayload).eq('building_id', buildingRecord.building_id)

          // Sync local cache so subsequent rows don't re-trigger the update
          buildingMap.set(buildingKey, {
            ...buildingRecord,
            street: needsStreetUpdate ? row.Street! : buildingRecord.street,
            landmark: needsLandmarkUpdate ? row.Landmark! : buildingRecord.landmark,
          })
          buildingRecord = buildingMap.get(buildingKey)!
        }
      }

      const buildingId = buildingRecord.building_id

      // Upsert house — physical unit only (no sabeel_no; multiple families can share one PACI)
      await admin.from('house').upsert({
        paci_no: row.PACI_NO,
        building_id: buildingId,
        floor_no: row.Floor_No ?? null,
        flat_no: row.Flat_No ?? null,
      }, { onConflict: 'paci_no' })

      // Upsert family — occupant record links sabeel_no to paci_no
      await admin.from('family').upsert({
        sabeel_no: row.Sabeel_No,
        paci_no: row.PACI_NO,
      }, { onConflict: 'sabeel_no' })

      // Check if mumin exists (to track insert vs update)
      const { data: existing } = await admin
        .from('mumin')
        .select('its_no')
        .eq('its_no', parseInt(row.ITS_NO))
        .maybeSingle()

      // Build mumin payload — optional fields only written when CSV provides them
      // to avoid overwriting manually-entered data on re-import
      const muminData: Record<string, unknown> = {
        its_no: parseInt(row.ITS_NO),
        sabeel_no: row.Sabeel_No,
        subsector_id: subsectorId,
        name: row.Name,
        gender: row.Gender as 'M' | 'F',
        date_of_birth: row.DOB ? parseDob(row.DOB) : null,
        balig_status: row.Balig as 'Balig' | 'Ghair Balig',
      }

      if (row.Phone) muminData.phone = row.Phone
      if (row.Family_Type) muminData.family_type = row.Family_Type

      // status and role: only set for new inserts — never overwrite on re-import
      // (prevents accidentally demoting a Masool or changing status via CSV)
      if (!existing) {
        muminData.status = 'active'
        muminData.role = csvRole
      }

      const { error: upsertErr } = await admin
        .from('mumin')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(muminData as any, { onConflict: 'its_no' })

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

        // Provision Supabase Auth user for new mumin
        // email = {its_no}@mumin.local, password validated via PACI at login (lazy provisioning)
        const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
          email: `${row.ITS_NO}@mumin.local`,
          password: row.PACI_NO,
          email_confirm: true,
          app_metadata: {
            its_no: parseInt(row.ITS_NO),
            role: csvRole,
            sector_ids: [],
            subsector_ids: [],
            must_change_password: false,
          },
        })

        if (authUser?.user) {
          await admin.from('mumin').update({
            supabase_auth_id: authUser.user.id,
            role: csvRole,
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
