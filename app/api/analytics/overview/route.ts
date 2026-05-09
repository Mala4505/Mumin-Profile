import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createClient } from '@/lib/supabase/server'

export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async (_req: NextRequest, { scopedSubsectorIds }) => {
    const supabase = await createClient()
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
)
