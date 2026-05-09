import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'

const TIER1_FIELDS = [
  'name', 'gender', 'date_of_birth', 'balig_status',
  'phone', 'alternate_phone', 'email', 'status', 'notes',
] as const

const VALID_STATUSES = ['active', 'deceased', 'relocated', 'left_community', 'inactive']
const VALID_GENDERS = ['M', 'F']
const VALID_BALIG = ['Balig', 'Ghair Balig']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ its_no: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SuperAdmin', 'Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden — SuperAdmin/Admin only' }, { status: 403 })
  }

  const { its_no } = await params
  const targetItsNo = parseInt(its_no, 10)
  if (isNaN(targetItsNo)) {
    return NextResponse.json({ error: 'Invalid ITS No' }, { status: 400 })
  }

  const body = await req.json() as Record<string, unknown>

  // Reject Tier-2 structural fields
  const tier2Fields = ['subsector_id', 'sabeel_no', 'paci_no', 'head_its_no']
  for (const f of tier2Fields) {
    if (f in body) {
      return NextResponse.json(
        { error: `Field "${f}" requires a change request (Tier 2)` },
        { status: 422 },
      )
    }
  }

  // Build update from allowed Tier-1 fields only
  const update: Record<string, unknown> = {}
  for (const field of TIER1_FIELDS) {
    if (!(field in body)) continue
    const val = body[field]

    if (field === 'status' && val !== null && !VALID_STATUSES.includes(val as string))
      return NextResponse.json({ error: `Invalid status: ${val}` }, { status: 422 })
    if (field === 'gender' && val !== null && !VALID_GENDERS.includes(val as string))
      return NextResponse.json({ error: `Invalid gender: ${val}` }, { status: 422 })
    if (field === 'balig_status' && val !== null && !VALID_BALIG.includes(val as string))
      return NextResponse.json({ error: `Invalid balig_status: ${val}` }, { status: 422 })

    update[field] = val === '' ? null : val
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: 'No Tier-1 fields provided' }, { status: 400 })

  const admin = createAdminClient()

  // Read current values for activity log diff
  const { data: current } = await admin
    .from('mumin')
    .select(TIER1_FIELDS.join(', '))
    .eq('its_no', targetItsNo)
    .maybeSingle()

  if (!current) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { error } = await admin
    .from('mumin')
    .update(update as any)
    .eq('its_no', targetItsNo)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort activity log — don't fail the request if this errors
  const changes = Object.entries(update).map(([field, new_value]) => ({
    field,
    old_value: String((current as any)[field] ?? ''),
    new_value: String(new_value ?? ''),
  }))

  try {
    await admin.from('activity_log').insert({
      performed_by_its: session.its_no,
      action: 'edit_member_core',
      entity_type: 'mumin',
      entity_id: String(targetItsNo),
      metadata: { changes },
    } as any)
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true })
}
