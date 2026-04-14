import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export type ActivityType = 'submission' | 'import' | 'profile'

export interface ActivityEvent {
  type: ActivityType
  label: string
  timestamp: string
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const [submissionsRes, importsRes, profilesRes] = await Promise.all([
    // Last 20 form submissions with member name and form title
    supabase
      .from('form_response')
      .select('submitted_at, filled_for, form_id, mumin(name), forms(title)')
      .order('submitted_at', { ascending: false })
      .limit(20),

    // Last 10 imports
    supabase
      .from('import_log')
      .select('started_at, filename, status')
      .order('started_at', { ascending: false })
      .limit(10),

    // Most recent profile update per member
    supabase
      .from('profile_value')
      .select('its_no, updated_at, mumin(name)')
      .order('updated_at', { ascending: false })
      .limit(50),
  ])

  const events: ActivityEvent[] = []

  // Form submissions
  for (const row of (submissionsRes.data ?? []) as Array<{
    submitted_at: string | null
    filled_for: number
    form_id: string
    mumin: { name: string } | null
    forms: { title: string } | null
  }>) {
    if (!row.submitted_at) continue
    const memberName = row.mumin?.name ?? `ITS ${row.filled_for}`
    const formTitle = row.forms?.title ?? 'a form'
    events.push({
      type: 'submission',
      label: `${memberName} submitted ${formTitle}`,
      timestamp: row.submitted_at,
    })
  }

  // Imports
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
    events.push({
      type: 'import',
      label: `Import ${file} ${status}`,
      timestamp: row.started_at,
    })
  }

  // Profile updates — deduplicate
  const seenIts = new Set<number>()
  for (const row of (profilesRes.data ?? []) as Array<{
    its_no: number
    updated_at: string
    mumin: { name: string } | null
  }>) {
    if (seenIts.has(row.its_no)) continue
    seenIts.add(row.its_no)
    const memberName = row.mumin?.name ?? `ITS ${row.its_no}`
    events.push({
      type: 'profile',
      label: `Profile updated — ${memberName}`,
      timestamp: row.updated_at,
    })
  }

  // Sort newest first, take top 10
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json(events.slice(0, 10))
}
