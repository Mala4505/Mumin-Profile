import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

export interface ActivityEvent {
  type: string
  label: string
  timestamp: string
}

// Consolidates: /api/analytics/overview, /api/analytics/activity, /api/analytics/groups
// Usage:
//   GET /api/analytics/dashboard?type=overview
//   GET /api/analytics/dashboard?type=activity
//   GET /api/analytics/dashboard?type=groups&groupBy=sector|subsector

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (req: NextRequest, { scopedSubsectorIds }) => {
    const type = req.nextUrl.searchParams.get('type')
    const supabase = await createClient()

    // ── overview ──────────────────────────────────────────────────────────────
    if (type === 'overview') {
      const now = new Date().toISOString()

      const { data: muminWithProfile } = await supabase
        .from('profile_value')
        .select('its_no')
        .limit(10000)

      const itsNosWithProfile = muminWithProfile
        ? [...new Set(muminWithProfile.map((r: { its_no: number }) => r.its_no))]
        : []

      let muminQuery = supabase
        .from('mumin')
        .select('its_no', { count: 'exact', head: true })

      if (scopedSubsectorIds !== null) {
        muminQuery = muminQuery.in('subsector_id', scopedSubsectorIds)
      }

      const [
        { count: activeForms },
        { count: totalMuminCount },
        { data: recentImports },
        { count: overdueForms },
      ] = await Promise.all([
        supabase.from('forms').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        muminQuery,
        supabase.from('import_log').select('*').order('created_at', { ascending: false }).limit(5),
        supabase
          .from('forms')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published')
          .lt('expires_at', now)
          .not('expires_at', 'is', null),
      ])

      const membersWithNoProfile =
        itsNosWithProfile.length === 0
          ? (totalMuminCount ?? 0)
          : Math.max(0, (totalMuminCount ?? 0) - itsNosWithProfile.length)

      return NextResponse.json({
        activeForms: activeForms ?? 0,
        membersWithNoProfile,
        recentImports: recentImports ?? [],
        overdueForms: overdueForms ?? 0,
      })
    }

    // ── activity ─────────────────────────────────────────────────────────────
    if (type === 'activity') {
      const [submissionsRes, importsRes, profilesRes] = await Promise.all([
        supabase
          .from('form_responses')
          .select('submitted_at, filled_for, form_id')
          .order('submitted_at', { ascending: false })
          .limit(20),
        supabase
          .from('import_log')
          .select('started_at, filename, status')
          .order('started_at', { ascending: false })
          .limit(10),
        supabase
          .from('profile_value')
          .select('its_no, updated_at')
          .order('updated_at', { ascending: false })
          .limit(50),
      ])

      const events: Array<{ type: string; label: string; timestamp: string }> = []

      for (const row of (submissionsRes.data ?? []) as Array<{
        submitted_at: string | null
        filled_for: number
        form_id: string
      }>) {
        if (!row.submitted_at) continue
        events.push({ type: 'submission', label: `ITS ${row.filled_for} submitted a form`, timestamp: row.submitted_at })
      }

      for (const row of (importsRes.data ?? []) as Array<{
        started_at: string
        filename: string
        status: string
      }>) {
        const file = row.filename ?? 'file'
        const status =
          row.status === 'completed'
            ? 'completed'
            : row.status === 'completed_with_errors'
            ? 'completed with errors'
            : row.status
        events.push({ type: 'import', label: `Import ${file} ${status}`, timestamp: row.started_at })
      }

      const seenIts = new Set<number>()
      for (const row of (profilesRes.data ?? []) as Array<{ its_no: number; updated_at: string }>) {
        if (seenIts.has(row.its_no)) continue
        seenIts.add(row.its_no)
        events.push({ type: 'profile', label: `Profile updated — ITS ${row.its_no}`, timestamp: row.updated_at })
      }

      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      return NextResponse.json(events.slice(0, 10))
    }

    // ── groups ────────────────────────────────────────────────────────────────
    if (type === 'groups') {
      const groupBy = req.nextUrl.searchParams.get('groupBy') ?? 'sector'

      let query = supabase
        .from('mumin')
        .select('subsector_id, subsector(subsector_name, sector_id, sector(sector_name))')
        .eq('status', 'active')

      if (scopedSubsectorIds !== null) {
        query = query.in('subsector_id', scopedSubsectorIds)
      }

      const { data: muminRows, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const counts = new Map<string, number>()
      for (const row of (muminRows ?? []) as unknown as Array<{
        subsector_id: number | null
        subsector: { subsector_name: string; sector_id: number; sector: { sector_name: string } } | null
      }>) {
        let key: string | null = null
        if (groupBy === 'subsector') {
          key = row.subsector?.subsector_name ?? null
        } else {
          key = row.subsector?.sector?.sector_name ?? null
        }
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      const result = Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'type must be overview|activity|groups' }, { status: 400 })
  }
)
