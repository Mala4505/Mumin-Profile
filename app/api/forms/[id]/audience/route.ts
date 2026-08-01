import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedFiller } from '@/lib/forms/checkFillerAccess'
import type { FillerAccess } from '@/lib/types/forms'

/**
 * GET /api/forms/[id]/audience
 *
 * Returns the form's audience scoped to the current user's assignment:
 *   - Masool  → members in their assigned sector(s) only
 *   - Musaid  → members in their assigned subsector(s) only
 *   - HOF     → members sharing their sabeel_no
 *   - Admin/SuperAdmin/Creator → all audience members
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()

  // Load form to check access
  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('created_by, filler_access, status, umoor_category_id')
    .eq('id', id)
    .single()

  if (formErr || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  const isAdmin = ['SuperAdmin', 'Admin'].includes(session.role)
  const isCreator = Number(session.its_no) === form.created_by
  const fillerAccess = form.filler_access as FillerAccess | null
  const isFiller = fillerAccess ? isAuthorizedFiller(fillerAccess, session) : false
  // Coordinator: full audience access for forms in their assigned umoors (geo-unrestricted)
  const isUmoorScoped =
    session.role === 'UmoorCoordinator' &&
    form.umoor_category_id !== null &&
    (session.umoor_ids ?? []).includes(form.umoor_category_id)

  if (!isAdmin && !isCreator && !isFiller && !isUmoorScoped) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Load all audience members with mumin data
  const { data: audienceRows, error: audErr } = await supabase
    .from('form_audience')
    .select('its_no, mumin!inner(name, sabeel_no, subsector_id)')
    .eq('form_id', id)

  if (audErr) {
    return NextResponse.json({ error: audErr.message }, { status: 500 })
  }

  type AudienceRow = {
    its_no: number
    mumin: { name: string; sabeel_no: string; subsector_id: number }
  }
  let audience = (audienceRows ?? []) as unknown as AudienceRow[]

  // ── Scope filtering ──────────────────────────────────────────────────────────
  if (session.role === 'Masool' && !isAdmin && !isCreator) {
    const sectorIds = (session.sector_ids ?? []).map(Number)
    if (sectorIds.length > 0) {
      const { data: subs } = await supabase
        .from('subsector')
        .select('subsector_id')
        .in('sector_id', sectorIds)

      const subsectorIds = new Set((subs ?? []).map((s) => s.subsector_id))
      audience = audience.filter((a) => subsectorIds.has(a.mumin.subsector_id))
    } else {
      // Masool with no sector assignment sees nobody
      audience = []
    }
  } else if (session.role === 'Musaid' && !isAdmin && !isCreator) {
    const subsectorIds = new Set((session.subsector_ids ?? []).map(Number))
    if (subsectorIds.size > 0) {
      audience = audience.filter((a) => subsectorIds.has(a.mumin.subsector_id))
    } else {
      audience = []
    }
  } else if (session.is_hof && session.sabeel_no && !isAdmin && !isCreator && !isUmoorScoped) {
    audience = audience.filter((a) => a.mumin.sabeel_no === session.sabeel_no)
  }
  // Admin / SuperAdmin / Creator / UmoorCoordinator (own umoor) → no filter, see all

  return NextResponse.json({
    audience: audience.map((a) => ({
      its_no: a.its_no,
      name: a.mumin.name,
      sabeel_no: a.mumin.sabeel_no,
    })),
  })
}
