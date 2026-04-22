// POST /api/forms/import
// Accepts a CSV upload for a specific form. Maps CSV columns to profile_field IDs,
// validates ITS numbers, and calls process_form_submission RPC in batches.
//
// Expected multipart body:
//   form_id   — UUID of the target form
//   file      — CSV file with header row
//   mapping   — JSON string: { [csvColumnName]: profile_field_id }
//
// CSV format: first column must be "its_no". Other columns map to profile_field captions
// or are provided via the mapping object.
//
// Returns: { success: number, failed: number, errors: string[] }

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

interface CsvRow {
  its_no: number
  [fieldId: number]: string
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
    .filter((row) => row.some((cell) => cell !== ''))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin', 'Masool'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse multipart
  const formData = await req.formData()
  const formId = formData.get('form_id') as string | null
  const file = formData.get('file') as File | null
  const mappingRaw = formData.get('mapping') as string | null

  if (!formId) return NextResponse.json({ error: 'form_id is required' }, { status: 400 })
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })

  // mapping: { csvColumnName -> profile_field_id }
  let columnMapping: Record<string, number> = {}
  if (mappingRaw) {
    try {
      columnMapping = JSON.parse(mappingRaw)
    } catch {
      return NextResponse.json({ error: 'Invalid mapping JSON' }, { status: 400 })
    }
  }

  const supabase = await createClient()

  // Verify form exists and is accessible
  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('id, status, expires_at, questions')
    .eq('id', formId)
    .single()

  if (formErr || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }
  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Form has expired' }, { status: 400 })
  }

  // Read CSV
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 })
  }

  const headers = rows[0]
  const dataRows = rows.slice(1)

  // Find its_no column index
  const itsIdx = headers.findIndex((h) => h.toLowerCase().replace(/[\s_]/g, '') === 'itsno')
  if (itsIdx === -1) {
    return NextResponse.json({ error: 'CSV must have an "its_no" column' }, { status: 400 })
  }

  const remarksIdx = headers.findIndex((h) => h.toLowerCase().trim() === 'remarks')

  // Build fieldId map from headers (skip its_no and remarks columns)
  // If mapping is provided use it; otherwise try to auto-match by caption
  const headerToFieldId: Record<number, number> = {}
  for (let i = 0; i < headers.length; i++) {
    if (i === itsIdx || i === remarksIdx) continue
    const header = headers[i]
    if (columnMapping[header] != null) {
      headerToFieldId[i] = Number(columnMapping[header])
    }
  }

  // If no mapping provided, try to auto-resolve via profile_field captions
  const unmappedHeaders = headers.filter(
    (_h, i) => i !== itsIdx && i !== remarksIdx && headerToFieldId[i] == null
  )
  if (unmappedHeaders.length > 0) {
    const { data: fields } = await supabase
      .from('profile_field')
      .select('id, caption')
      .in('caption', unmappedHeaders)

    for (const field of fields ?? []) {
      const idx = headers.indexOf(field.caption)
      if (idx !== -1) headerToFieldId[idx] = field.id
    }
  }

  const mappedColumnIndices = Object.keys(headerToFieldId).map(Number)
  if (mappedColumnIndices.length === 0) {
    return NextResponse.json({ error: 'No columns could be mapped to profile fields. Provide a mapping.' }, { status: 400 })
  }

  // Collect all ITS numbers from CSV for bulk validation
  const csvItsNos = dataRows
    .map((row) => parseInt(row[itsIdx]))
    .filter((n) => !isNaN(n))

  if (csvItsNos.length === 0) {
    return NextResponse.json({ error: 'No valid ITS numbers found in CSV' }, { status: 400 })
  }

  // Validate ITS numbers exist in mumin table
  const { data: validMembers } = await supabase
    .from('mumin')
    .select('its_no')
    .in('its_no', csvItsNos)

  const validItsSet = new Set((validMembers ?? []).map((m) => m.its_no))

  // Build the responses payload
  const payload: Array<{ its_no: number; field_id: number; answer: string; remarks: string }> = []
  const errors: string[] = []
  let successCount = 0
  let failedCount = 0

  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const row = dataRows[rowIdx]
    const lineNum = rowIdx + 2 // 1-indexed, +1 for header row

    const itsNoRaw = parseInt(row[itsIdx])
    if (isNaN(itsNoRaw)) {
      errors.push(`Row ${lineNum}: invalid ITS number "${row[itsIdx]}"`)
      failedCount++
      continue
    }
    if (!validItsSet.has(itsNoRaw)) {
      errors.push(`Row ${lineNum}: ITS ${itsNoRaw} not found in member records`)
      failedCount++
      continue
    }

    const rowRemarks = remarksIdx !== -1 ? (row[remarksIdx]?.trim() ?? '') : ''
    let rowHasData = false
    for (const colIdx of mappedColumnIndices) {
      const answer = row[colIdx]?.trim()
      if (answer == null || answer === '') continue
      payload.push({
        its_no: itsNoRaw,
        field_id: headerToFieldId[colIdx],
        answer,
        remarks: rowRemarks,
      })
      rowHasData = true
    }

    if (rowHasData) successCount++
  }

  if (payload.length === 0) {
    return NextResponse.json({
      success: 0,
      failed: failedCount,
      errors: errors.length ? errors : ['No data rows to process'],
    }, { status: 400 })
  }

  // Call process_form_submission RPC
  const { error: rpcErr } = await (supabase.rpc as any)('process_form_submission', {
    p_form_id: formId,
    p_filled_by: Number(session.its_no),
    p_responses: payload,
  })

  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: successCount,
    failed: failedCount,
    errors,
  })
}
