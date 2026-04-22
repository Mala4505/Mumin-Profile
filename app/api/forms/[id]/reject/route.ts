// app/api/forms/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('forms')
    .update({
      status: 'draft',
      approved_by: Number(session.its_no),        // ✅ record who rejected
      approved_at: new Date().toISOString(),      // ✅ record when rejected
    })
    .eq('id', id)
    .eq('status', 'pending_approval')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Form not in pending_approval state' }, { status: 400 })
  }

  return NextResponse.json({ form: data })
}
