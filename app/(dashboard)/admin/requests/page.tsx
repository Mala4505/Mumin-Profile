import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { RequestsReview } from '@/components/admin/RequestsReview'

export default async function AdminRequestsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'SuperAdmin') redirect('/dashboard')

  const admin = createAdminClient()

  const { data: rawRequests } = await admin
    .from('change_request')
    .select(`
      id, sabeel_no, remark, status, created_at, reviewed_at,
      requester:requested_by(its_no, name, phone),
      reviewer:reviewed_by(its_no, name)
    `)
    .order('created_at', { ascending: false })

  // Enrich with HoF data via separate queries (avoids fragile nested PostgREST joins)
  let data: any[] = rawRequests ?? []

  if (data.length > 0) {
    const sabeelNos = [...new Set(data.map((r: any) => r.sabeel_no as string))]

    const { data: familyRows } = await admin
      .from('family')
      .select('sabeel_no, head_its_no')
      .in('sabeel_no', sabeelNos)

    const sabeelToHeadIts = new Map<string, number>()
    for (const f of (familyRows ?? []) as any[]) {
      if (f.head_its_no) sabeelToHeadIts.set(f.sabeel_no, f.head_its_no)
    }

    const headItsNos = [...new Set(Array.from(sabeelToHeadIts.values()))]

    const hofMuminMap = new Map<number, { its_no: number; name: string }>()
    if (headItsNos.length > 0) {
      const { data: muminRows } = await admin
        .from('mumin')
        .select('its_no, name')
        .in('its_no', headItsNos)
      for (const m of (muminRows ?? []) as any[]) {
        hofMuminMap.set(m.its_no, m)
      }
    }

    data = data.map((r: any) => {
      const headIts = sabeelToHeadIts.get(r.sabeel_no)
      const hofMumin = headIts ? hofMuminMap.get(headIts) : null
      return {
        ...r,
        hof: hofMumin ? { head_its_no: headIts, mumin: hofMumin } : null,
      }
    })
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Request Review</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review and confirm change requests submitted by Masool and Musaid
        </p>
      </div>
      <RequestsReview initialRequests={(data ?? []) as any[]} />
    </div>
  )
}
