import ExcelJS from 'exceljs'

export interface ExportColumn {
  key: string
  header: string
  width?: number
}

export interface ExportMember {
  its_no: number
  name: string
  gender: string
  balig_status: string
  phone: string | null
  alternate_phone: string | null
  email: string | null
  status: string
  sabeel_no: string
  subsector_name: string
  sector_name: string
  date_of_birth: string | null
  // Dynamic profile fields
  [key: string]: string | number | null | undefined
}

export async function generateExcel(
  members: ExportMember[],
  columns: ExportColumn[],
  sheetName = 'Members'
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Mumin System'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetName)

  // Header row
  sheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width ?? 20,
  }))

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }, // blue-800
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
  headerRow.height = 20

  // Data rows
  members.forEach(member => {
    const rowData: Record<string, string | number | null | undefined> = {}
    columns.forEach(col => {
      rowData[col.key] = member[col.key] ?? ''
    })
    sheet.addRow(rowData)
  })

  // Freeze header row
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

  // Auto-filter
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: columns.length } }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer as ArrayBuffer)
}

export const DEFAULT_COLUMNS: ExportColumn[] = [
  { key: 'its_no', header: 'ITS No', width: 12 },
  { key: 'name', header: 'Name', width: 30 },
  { key: 'gender', header: 'Gender', width: 10 },
  { key: 'balig_status', header: 'Balig Status', width: 14 },
  { key: 'phone', header: 'Phone', width: 16 },
  { key: 'sabeel_no', header: 'Sabeel No', width: 12 },
  { key: 'sector_name', header: 'Sector', width: 20 },
  { key: 'subsector_name', header: 'SubSector', width: 20 },
  { key: 'status', header: 'Status', width: 12 },
]
