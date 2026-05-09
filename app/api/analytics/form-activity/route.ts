import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (_req: NextRequest) => {
    const supabase = await createClient()

    const since = new Date()
    since.setDate(since.getDate() - 30)

    const { data, error } = await supabase
      .from('form_responses')
      .select('submitted_at')
      .gte('submitted_at', since.toISOString())
      .order('submitted_at', { ascending: true })

    if (error) return NextResponse.json([])

    const byDate = new Map<string, number>()
    for (const row of (data ?? []) as Array<{ submitted_at: string }>) {
      const date = row.submitted_at.slice(0, 10)
      byDate.set(date, (byDate.get(date) ?? 0) + 1)
    }

    const result: Array<{ date: string; submissions: number }> = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(since)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      result.push({ date: label, submissions: byDate.get(key) ?? 0 })
    }

    return NextResponse.json(result)
  }
)
