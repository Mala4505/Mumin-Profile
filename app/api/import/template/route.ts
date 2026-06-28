import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { IMPORT_TABLES, ImportTableKey } from '@/lib/import/importConfig'

const CORE_HEADERS = [
  'ITS_NO', 'Name', 'Gender', 'DOB', 'Balig', 'Sabeel_No',
  'PACI_NO', 'Floor_No', 'Flat_No', 'Building', 'SubSector',
  'Sector', 'Role', 'Phone', 'Street', 'Landmark', 'Family_Type',
]

const CORE_SAMPLE = {
  ITS_NO: '20436113',
  Name: 'Aliasgar bhai Ibrahim bhai Madarwala',
  Gender: 'M',
  DOB: '01-01-1990',
  Balig: 'Balig',
  Sabeel_No: '40699',
  PACI_NO: '1898128',
  Floor_No: '2',
  Flat_No: '16',
  Building: 'SALWA(WING B)-13-G',
  SubSector: '13-G',
  Sector: '13',
  Role: 'Mumin',
  Phone: '67750625',
  Street: '0',
  Landmark: '.',
  Family_Type: 'Family',
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['SuperAdmin', 'Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const Papa = (await import('papaparse')).default
  const table = req.nextUrl.searchParams.get('table')

  if (table === 'core') {
    const csv = Papa.unparse([CORE_SAMPLE], { columns: CORE_HEADERS })
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="mumin_core_template.csv"',
      },
    })
  }

  const config = IMPORT_TABLES[table as ImportTableKey]
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
