import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getJwtMeta(accessToken: string): { role?: string; its_no?: number } {
  try {
    const b64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    return payload.app_metadata ?? {}
  } catch { return {} }
}

// PATCH — SuperAdmin toggles status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = getJwtMeta(session.access_token)
  if (meta.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const requestId = parseInt(id)
  if (isNaN(requestId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  interface RequestedChange {
    its_no: number
    field: string
    label: string
    old_value: string
    new_value: string
  }

  const ALLOWED_MUMIN_FIELDS = new Set([
    'name', 'gender', 'date_of_birth', 'balig_status',
    'phone', 'alternate_phone', 'email', 'status', 'notes',
  ])

  const body = await request.json() as
    | { action: 'approve' }
    | { action: 'reject'; reviewer_note?: string }
    | { status: 'pending' | 'done' }

  const admin = createAdminClient()

  // --- approve ---
  if ('action' in body && body.action === 'approve') {
    // 1. Fetch the change request with requested_changes
    const { data: cr, error: fetchErr } = await admin
      .from('change_request')
      .select('id, status, requested_changes')
      .eq('id', requestId)
      .single()

    if (fetchErr || !cr) {
      return NextResponse.json({ error: fetchErr?.message ?? 'Not found' }, { status: 404 })
    }

    if (cr.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 409 })
    }

    const changes: RequestedChange[] = Array.isArray(cr.requested_changes)
      ? (cr.requested_changes as RequestedChange[]).filter(c => ALLOWED_MUMIN_FIELDS.has(c.field))
      : []

    // 2. Group changes by its_no and apply per-member in one UPDATE each
    const byMember = new Map<number, Record<string, string>>()
    for (const c of changes) {
      if (!byMember.has(c.its_no)) byMember.set(c.its_no, {})
      byMember.get(c.its_no)![c.field] = c.new_value
    }

    const now = new Date().toISOString()

    for (const [itsNo, fields] of byMember.entries()) {
      const { error: updateErr } = await admin
        .from('mumin')
        .update({ ...fields, updated_at: now } as any)
        .eq('its_no', itsNo)

      if (updateErr) {
        return NextResponse.json({ error: `Failed to update mumin ${itsNo}: ${updateErr.message}` }, { status: 500 })
      }

      // 3. Log each member's changes to activity_log
      const memberChanges = changes.filter(c => c.its_no === itsNo)
      const { error: logErr } = await admin.from('activity_log').insert({
        performed_by_its: meta.its_no!,
        action: 'approve_change_request',
        entity_type: 'mumin',
        entity_id: String(itsNo),
        metadata: { change_request_id: requestId, changes: memberChanges },
      })
      if (logErr) console.error(`activity_log insert failed for its_no=${itsNo}:`, logErr.message)
    }

    // 4. Set status='done', reviewed_by, reviewed_at
    const { data, error: doneErr } = await admin
      .from('change_request')
      .update({ status: 'done', reviewed_by: meta.its_no!, reviewed_at: now })
      .eq('id', requestId)
      .select('id, status, reviewed_by, reviewed_at, requested_changes')
      .single()

    if (doneErr) return NextResponse.json({ error: doneErr.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // --- reject ---
  if ('action' in body && body.action === 'reject') {
    const { data: crReject, error: fetchRejectErr } = await admin
      .from('change_request')
      .select('id, status')
      .eq('id', requestId)
      .single()

    if (fetchRejectErr || !crReject) {
      return NextResponse.json({ error: fetchRejectErr?.message ?? 'Not found' }, { status: 404 })
    }

    if (crReject.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 409 })
    }

    const { data, error } = await admin
      .from('change_request')
      .update({
        status: 'rejected',
        reviewer_note: (body as { action: 'reject'; reviewer_note?: string }).reviewer_note ?? null,
        reviewed_by: meta.its_no!,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('id, status, reviewer_note, reviewed_by, reviewed_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // --- legacy: { status: 'pending' | 'done' } toggle ---
  const legacyBody = body as { status: 'pending' | 'done' }
  if (!['pending', 'done'].includes(legacyBody.status)) {
    return NextResponse.json({ error: 'status must be pending or done, or provide action: approve|reject' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('change_request')
    .update({
      status: legacyBody.status,
      reviewed_by: meta.its_no!,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('id, status, reviewed_by, reviewed_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// DELETE — requester deletes their own request (SuperAdmin can delete any)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = getJwtMeta(session.access_token)
  if (!['SuperAdmin', 'Admin', 'Masool', 'Musaid'].includes(meta.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const requestId = parseInt(id)
  if (isNaN(requestId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const admin = createAdminClient()

  let query = admin.from('change_request').delete().eq('id', requestId)

  // Non-SuperAdmin can only delete their own requests
  if (meta.role !== 'SuperAdmin') {
    query = query.eq('requested_by', meta.its_no!)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
