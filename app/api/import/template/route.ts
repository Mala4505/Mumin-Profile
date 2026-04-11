import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { IMPORT_TABLES, ImportTableKey } from '@/lib/import/importConfig'
import Papa from 'papaparse'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const table = req.nextUrl.searchParams.get('table') as ImportTableKey
  const config = IMPORT_TABLES[table]
  if (!config) return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

  const csv = Papa.unparse([config.sampleRow], { columns: config.csvHeaders })
  const withNote = `# Unique key: ${Array.isArray(config.uniqueKey) ? config.uniqueKey.join('+') : config.uniqueKey}\n${csv}`

  return new NextResponse(withNote, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${table}_template.csv"`,
    },
  })
}
