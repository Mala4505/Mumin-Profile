import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Last 30 days of form responses
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data, error } = await supabase
    .from('form_response')
    .select('submitted_at')
    .gte('submitted_at', since.toISOString())
    .order('submitted_at', { ascending: true })

  if (error) return NextResponse.json([])

  // Group by date
  const byDate = new Map<string, number>()
  for (const row of (data ?? []) as Array<{ submitted_at: string }>) {
    const date = row.submitted_at.slice(0, 10) // YYYY-MM-DD
    byDate.set(date, (byDate.get(date) ?? 0) + 1)
  }

  // Fill in all days (even zero-count days) for a continuous line
  const result: Array<{ date: string; submissions: number }> = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    // Shorten to MM/DD for display
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    result.push({ date: label, submissions: byDate.get(key) ?? 0 })
  }

  return NextResponse.json(result)
}
