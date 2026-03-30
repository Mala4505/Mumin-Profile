import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { importCoreMembers } from '@/lib/import/importCoreMembers'

export const maxDuration = 60 // seconds (Vercel limit)

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Only SuperAdmin can run core imports' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  if (!file.name.endsWith('.csv')) return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })

  const admin = createAdminClient()
  const csvText = await file.text()
  const result = await importCoreMembers(csvText, file.name, session.its_no)

  // Log activity
  await admin.from('activity_log').insert({
    performed_by_its: session.its_no,
    action: 'csv_import',
    entity_type: 'import_log',
    entity_id: String(result.importLogId),
    metadata: { filename: file.name, status: result.status, total: result.totalRows },
  })

  return NextResponse.json(result)
}
