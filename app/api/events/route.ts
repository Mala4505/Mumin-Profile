import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

// GET /api/events — list all events, ordered by date desc
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event')
    .select('id, title, event_date, category_id')
    .order('event_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data ?? [] })
}

// POST /api/events — create a new event (admin only)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, event_date, description, category_id } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!event_date) {
    return NextResponse.json({ error: 'event_date is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event')
    .insert({
      title: title.trim(),
      event_date,
      description: description?.trim() || null,
      category_id: category_id ? Number(category_id) : null,
      created_by: Number(session.its_no),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data }, { status: 201 })
}
