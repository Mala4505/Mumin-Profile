import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/withAuth'
import { createAdminClient } from '@/lib/supabase/admin'

interface AddressChangePayload {
  type: string
  reported_subsector_id?: number
  [key: string]: unknown
}

interface ChangeRequestRow {
  sabeel_no: string
  requested_changes: AddressChangePayload | unknown[] | null
  status: string
}

function isAddressChangeRow(
  r: ChangeRequestRow,
): r is ChangeRequestRow & { requested_changes: AddressChangePayload } {
  return !!r.requested_changes && !Array.isArray(r.requested_changes) && r.requested_changes.type === 'address_change'
}

// GET — sabeel_nos with an open (pending | awaiting_address) address-change
// report, scoped to the caller's subsectors. Backs the "Move pending" badge
// in the member table.
//
// A request is visible if EITHER the family's CURRENT subsector OR the
// request's reported destination subsector (requested_changes
// .reported_subsector_id) is in the caller's scope — see
// PLAN-analytics-unique-counts.md:785: "an open report is visible to staff
// of both the current subsector and the reported destination, so the
// receiving team can chase the details without a single row changing."
// Requests with no reported_subsector_id (reporter didn't know the area)
// fall back to current-subsector-only visibility.
export const GET = withAuth(
  ['SuperAdmin', 'Admin', 'Masool', 'Musaid'],
  async function handler(_req, ctx) {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('change_request')
      .select('sabeel_no, requested_changes, status')
      .in('status', ['pending', 'awaiting_address'])

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []) as ChangeRequestRow[]
    const addressRequests = rows.filter(isAddressChangeRow)

    const addressSabeels = new Set(addressRequests.map((r) => r.sabeel_no))

    if (ctx.scopedSubsectorIds === null) {
      return NextResponse.json({ sabeel_nos: [...addressSabeels] })
    }

    if (addressSabeels.size === 0) return NextResponse.json({ sabeel_nos: [] })

    const scopedSubsectorIds = ctx.scopedSubsectorIds

    // Visible via the reported destination subsector, regardless of where
    // the family currently sits — the receiving team should see the badge
    // before a single row moves.
    const reportedMatches = new Set(
      addressRequests
        .filter((r) => {
          const reportedId = r.requested_changes.reported_subsector_id
          return typeof reportedId === 'number' && scopedSubsectorIds.includes(reportedId)
        })
        .map((r) => r.sabeel_no)
    )

    // Scope down to sabeel_nos with at least one member in the caller's current subsectors
    const { data: scopedMembers, error: scopedErr } = await admin
      .from('mumin')
      .select('sabeel_no')
      .in('sabeel_no', [...addressSabeels])
      .in('subsector_id', scopedSubsectorIds)

    if (scopedErr) return NextResponse.json({ error: scopedErr.message }, { status: 500 })

    const currentMatches = new Set(
      ((scopedMembers ?? []) as { sabeel_no: string }[]).map((m) => m.sabeel_no),
    )

    return NextResponse.json({
      sabeel_nos: [...addressSabeels].filter((s) => currentMatches.has(s) || reportedMatches.has(s)),
    })
  },
)
