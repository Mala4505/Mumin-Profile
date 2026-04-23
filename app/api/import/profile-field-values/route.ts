import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/lib/types/database' // adjust path to your generated types

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rows } = (await req.json()) as { rows: Record<string, string>[] }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ inserted: 0, updated: 0, failed: 0 })
  }

  const admin = createAdminClient()

  // ── Step 0: Resolve or create a default "Imported" profile_category ──────
  let defaultCategoryId: number
  const { data: existingCat } = await admin
    .from('profile_category')
    .select('id')
    .eq('name', 'Imported')
    .maybeSingle()

  if (existingCat?.id) {
    defaultCategoryId = existingCat.id
  } else {
    const { data: newCat, error: catErr } = await admin
      .from('profile_category')
      .insert({ name: 'Imported' })
      .select('id')
      .single()
    if (catErr || !newCat) {
      return NextResponse.json({ error: catErr?.message ?? 'Could not create default category' }, { status: 500 })
    }
    defaultCategoryId = newCat.id
  }

  // ── Step 1: Collect unique field captions ────
  const allKeys = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key !== 'its_no') allKeys.add(key)
    }
  }
  const captions = Array.from(allKeys)

  // ── Step 2: Upsert profile_field rows ──────────────────
  const { data: existingFields } = await admin
    .from('profile_field')
    .select('id, caption')
    .in('caption', captions)

  const captionToFieldId = new Map<string, number>(
    (existingFields ?? []).map((f) => [f.caption, f.id])
  )

  const missingCaptions = captions.filter((c) => !captionToFieldId.has(c))
  if (missingCaptions.length > 0) {
    const newFields = missingCaptions.map((caption) => ({
      caption,
      category_id: defaultCategoryId,
      field_type: 'text' as const,
      behavior: 'static' as const,
      sort_order: 0,
      visibility_level: 1 as const,
      is_data_entry: true,
      mumin_can_edit: false,
    }))
    const { data: created, error: createErr } = await admin
      .from('profile_field')
      .insert(newFields)
      .select('id, caption')

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }
    for (const f of created ?? []) {
      captionToFieldId.set(f.caption, f.id)
    }
  }

  // ── Step 3: Build profile_value upserts ─────────────────
  type ProfileValueInsert = Database['public']['Tables']['profile_value']['Insert']

  const valueRows: ProfileValueInsert[] = []

  for (const row of rows) {
    const itsNo = Number(row.its_no)
    if (isNaN(itsNo)) continue
    for (const caption of captions) {
      const val = row[caption]
      if (!val) continue
      const fieldId = captionToFieldId.get(caption)
      if (!fieldId) continue
      valueRows.push({
        its_no: itsNo,
        field_id: fieldId,
        value: val,
        data_active: true, // now recognized because it's in your schema
      })
    }
  }

  if (valueRows.length === 0) {
    return NextResponse.json({ inserted: 0, updated: 0, failed: 0 })
  }

  // ── Step 4: Upsert in batches ───────────────────────────
  let inserted = 0, failed = 0
  const BATCH = 500
  for (let i = 0; i < valueRows.length; i += BATCH) {
    const batch = valueRows.slice(i, i + BATCH)
    const { error } = await admin
      .from('profile_value')
      .upsert(batch, { onConflict: 'profile_value_static_unique' })

    if (error) {
      failed += batch.length
    } else {
      inserted += batch.length
    }
  }

  return NextResponse.json({ inserted, updated: 0, failed })
}
