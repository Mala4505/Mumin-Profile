import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createClient } from '@/lib/supabase/server'
import { ImportTableKey } from '@/lib/import/importConfig'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    table: ImportTableKey
    rows: Record<string, string>[]
    action: 'add' | 'update' | 'upsert' | 'delete'
    onConflictColumn: string
  }

  const { table, rows, action, onConflictColumn } = body
  if (!table || !rows?.length) {
    return NextResponse.json({ error: 'Missing table or rows' }, { status: 400 })
  }

  const supabase = await createClient()
  let inserted = 0, updated = 0, failed = 0
  const failedRows: Array<Record<string, string> & { _error: string }> = []

  try {
    if (action === 'delete') {
      const keys = rows.map((r) => r[onConflictColumn])
      const { error } = await supabase.from(table).delete().in(onConflictColumn, keys)
      if (error) throw error
      return NextResponse.json({ inserted: 0, updated: 0, deleted: keys.length, failed: 0, failedRows: [] })
    }

    if (action === 'add') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from(table).insert(rows as any)
      if (error) {
        failed = rows.length
        rows.forEach((r) => failedRows.push({ ...r, _error: error.message }))
      } else {
        inserted = rows.length
      }
    } else {
      // upsert or update
      const { error, count } = await supabase
        .from(table)
        .upsert(rows as any, { onConflict: onConflictColumn, count: 'exact' })
      if (error) {
        failed = rows.length
        rows.forEach((r) => failedRows.push({ ...r, _error: error.message }))
      } else {
        updated = count ?? rows.length
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ inserted, updated, failed, failedRows })
}
