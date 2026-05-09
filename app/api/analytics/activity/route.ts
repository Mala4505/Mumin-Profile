import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

export type ActivityType = 'submission' | 'import' | 'profile'

export interface ActivityEvent {
  type: ActivityType
  label: string
  timestamp: string
}

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (_req: NextRequest) => {
    const supabase = await createClient()

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

    const events: ActivityEvent[] = []

    for (const row of (submissionsRes.data ?? []) as Array<{
      submitted_at: string | null
      filled_for: number
      form_id: string
    }>) {
      if (!row.submitted_at) continue
      events.push({
        type: 'submission',
        label: `ITS ${row.filled_for} submitted a form`,
        timestamp: row.submitted_at,
      })
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
      events.push({
        type: 'profile',
        label: `Profile updated — ITS ${row.its_no}`,
        timestamp: row.updated_at,
      })
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(events.slice(0, 10))
  }
)
