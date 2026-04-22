import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/members/[its_no]/submissions
// Returns submitted form IDs and recent activity for a member.
// Mumin role can only access their own data; Admin+ can access any.
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ its_no: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { its_no } = await params
  const targetItsNo = parseInt(its_no)
  if (isNaN(targetItsNo)) return NextResponse.json({ error: 'Invalid ITS No' }, { status: 400 })

  if (session.role === 'Mumin' && session.its_no !== targetItsNo) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()

  const { data: responses, error } = await supabase
    .from('form_responses')
    .select('form_id, submitted_at')
    .eq('filled_for', targetItsNo)
    .eq('submitted', true)
    .order('submitted_at', { ascending: false })
    .limit(300)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deduplicate by form_id — keep the first (latest) submitted_at per form
  const latestByForm = new Map<string, string>()
  for (const r of responses ?? []) {
    if (r.form_id && !latestByForm.has(r.form_id)) {
      latestByForm.set(r.form_id, r.submitted_at ?? '')
    }
  }

  const submittedFormIds = Array.from(latestByForm.keys())

  let recentActivity: { form_id: string; form_title: string; submitted_at: string }[] = []
  if (submittedFormIds.length > 0) {
    const { data: forms } = await supabase
      .from('forms')
      .select('id, title')
      .in('id', submittedFormIds)

    const titleMap = new Map((forms ?? []).map((f: { id: string; title: string }) => [f.id, f.title]))

    recentActivity = submittedFormIds.slice(0, 10).map((formId) => ({
      form_id: formId,
      form_title: titleMap.get(formId) ?? 'Unknown Form',
      submitted_at: latestByForm.get(formId) ?? '',
    }))
  }

  return NextResponse.json({ submittedFormIds, recentActivity })
}
