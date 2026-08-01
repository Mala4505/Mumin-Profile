import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/getSession'
import { resolveUmoorScope } from '@/lib/auth/resolveScope'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ROLES = ['SuperAdmin', 'Admin', 'UmoorCoordinator'] as const

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(ALLOWED_ROLES as readonly string[]).includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { category_id?: unknown; ordered_ids?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.category_id !== 'number' || !Number.isInteger(body.category_id)) {
    return NextResponse.json({ error: 'category_id is required and must be a number' }, { status: 400 })
  }

  if (
    !Array.isArray(body.ordered_ids) ||
    body.ordered_ids.length === 0 ||
    !body.ordered_ids.every((v) => typeof v === 'number' && Number.isInteger(v))
  ) {
    return NextResponse.json(
      { error: 'ordered_ids is required and must be a non-empty array of numbers' },
      { status: 400 }
    )
  }

  const categoryId = body.category_id
  const orderedIds = body.ordered_ids as number[]

  if (new Set(orderedIds).size !== orderedIds.length) {
    return NextResponse.json({ error: 'ordered_ids must not contain duplicates' }, { status: 400 })
  }

  // Coordinator scope: may only reorder within their own umoor categories
  const scopedCategoryIds = resolveUmoorScope(session)
  if (scopedCategoryIds && !scopedCategoryIds.includes(categoryId)) {
    return NextResponse.json({ error: 'Forbidden: category outside your umoor scope' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()

    // Every id must belong to the given category
    const { data: categoryFields, error: fetchErr } = await admin
      .from('profile_field')
      .select('id')
      .eq('category_id', categoryId)

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    const validIds = new Set((categoryFields ?? []).map((f) => f.id))
    const stranger = orderedIds.find((fid) => !validIds.has(fid))
    if (stranger !== undefined) {
      return NextResponse.json(
        { error: `Field ${stranger} does not belong to category ${categoryId}` },
        { status: 400 }
      )
    }

    // Batch-update sort_order = index (0..n)
    const results = await Promise.all(
      orderedIds.map((fieldId, index) =>
        admin
          .from('profile_field')
          .update({ sort_order: index })
          .eq('id', fieldId)
          .eq('category_id', categoryId)
      )
    )

    const failed = results.find((r) => r.error)
    if (failed?.error) {
      console.error('profile_field reorder error:', failed.error)
      return NextResponse.json(
        { error: 'Failed to reorder fields', details: failed.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/admin/profile-fields/reorder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
