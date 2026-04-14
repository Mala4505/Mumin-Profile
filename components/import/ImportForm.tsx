// 'use client'

// import { useState, useCallback } from 'react'
// import Papa from 'papaparse'
// import { IMPORT_TABLES, ImportTableKey, ImportAction } from '@/lib/import/importConfig'
// import { validateImportRows, RowError } from '@/lib/import/validateImportRows'
// import { Button } from '@/components/ui/button'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// const BATCH_SIZE = 500

// function chunkArray<T>(arr: T[], size: number): T[][] {
//   const chunks: T[][] = []
//   for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
//   return chunks
// }

// export function ImportForm() {
//   const [table, setTable] = useState<ImportTableKey | ''>('')
//   const [action, setAction] = useState<ImportAction>('upsert')
//   const [fieldType, setFieldType] = useState<'static' | 'time-series'>('static')
//   const [rows, setRows] = useState<Record<string, string>[]>([])
//   const [errors, setErrors] = useState<RowError[]>([])
//   const [validRows, setValidRows] = useState<Record<string, string>[]>([])
//   const [validated, setValidated] = useState(false)
//   const [progress, setProgress] = useState({ current: 0, total: 0 })
//   const [stats, setStats] = useState({ inserted: 0, updated: 0, skipped: 0, failed: 0 })
//   const [failedRows, setFailedRows] = useState<Record<string, string>[]>([])
//   const [importing, setImporting] = useState(false)
//   const [done, setDone] = useState(false)

//   const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (!table) return
//     const file = e.target.files?.[0]
//     if (!file) return
//     const text = await file.text()
//     const parsed = Papa.parse<Record<string, string>>(text, {
//       header: true,
//       skipEmptyLines: true,
//       transformHeader: (h) => h.trim().replace(/^#.*\n/, ''),
//       transform: (v) => v.trim(),
//     })
//     const config = IMPORT_TABLES[table]
//     const result = validateImportRows(parsed.data, config)
//     setRows(parsed.data)
//     setErrors(result.errors)
//     setValidRows(result.validRows)
//     setValidated(true)
//     setDone(false)
//   }, [table])

//   const handleImport = async () => {
//     if (!table || !validRows.length) return
//     setImporting(true)
//     const config = IMPORT_TABLES[table]
//     const batches = chunkArray(validRows, BATCH_SIZE)
//     const onConflictColumn = Array.isArray(config.uniqueKey) ? config.uniqueKey[0] : config.uniqueKey
//     setProgress({ current: 0, total: batches.length })

//     let totalInserted = 0, totalUpdated = 0, totalFailed = 0
//     const allFailedRows: Record<string, string>[] = []

//     const endpoint = table === 'profile_value' ? '/api/import/profile-values' : '/api/import/upsert'

//     for (let i = 0; i < batches.length; i++) {
//       const res = await fetch(endpoint, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(
//           table === 'profile_value'
//             ? { rows: batches[i], fieldType }
//             : { table, rows: batches[i], action, onConflictColumn }
//         ),
//       })
//       const data = await res.json()
//       totalInserted += data.inserted ?? 0
//       totalUpdated += data.updated ?? 0
//       totalFailed += data.failed ?? 0
//       if (data.failedRows) allFailedRows.push(...data.failedRows)
//       setProgress({ current: i + 1, total: batches.length })
//     }

//     setStats({ inserted: totalInserted, updated: totalUpdated, skipped: rows.length - validRows.length, failed: totalFailed })
//     setFailedRows(allFailedRows)
//     setImporting(false)
//     setDone(true)
//   }

//   const downloadErrorReport = () => {
//     if (!failedRows.length) return
//     const csv = Papa.unparse(failedRows)
//     const blob = new Blob([csv], { type: 'text/csv' })
//     const url = URL.createObjectURL(blob)
//     const a = document.createElement('a')
//     a.href = url
//     a.download = 'import_errors.csv'
//     a.click()
//   }

//   const downloadTemplate = () => {
//     if (!table) return
//     window.open(`/api/import/template?table=${table}`, '_blank')
//   }

//   const progressPct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

//   return (
//     <div className="space-y-6 max-w-2xl">
//       {/* Selectors */}
//       <div className="flex gap-3 flex-wrap">
//         <Select value={table} onValueChange={(v) => { setTable(v as ImportTableKey); setValidated(false); setDone(false) }}>
//           <SelectTrigger className="w-52"><SelectValue placeholder="Select table" /></SelectTrigger>
//           <SelectContent>
//             {Object.entries(IMPORT_TABLES).map(([key, cfg]) => (
//               <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <Select value={action} onValueChange={(v) => setAction(v as ImportAction)}>
//           <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
//           <SelectContent>
//             <SelectItem value="add">Add new only</SelectItem>
//             <SelectItem value="update">Update existing only</SelectItem>
//             <SelectItem value="upsert">Upsert</SelectItem>
//             <SelectItem value="delete">Delete</SelectItem>
//           </SelectContent>
//         </Select>

//         <Button variant="outline" onClick={downloadTemplate} disabled={!table}>
//           Download Template
//         </Button>
//       </div>

//       {/* Profile Value Flow — only shown when table = profile_value */}
//       {table === 'profile_value' && (
//         <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
//           <span className="text-sm font-medium">Field Type:</span>
//           <Select value={fieldType} onValueChange={(v) => setFieldType(v as 'static' | 'time-series')}>
//             <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="static">Static (no date)</SelectItem>
//               <SelectItem value="time-series">Time-series (with date)</SelectItem>
//             </SelectContent>
//           </Select>
//           <span className="text-xs text-muted-foreground">
//             {fieldType === 'static' ? 'One value per member per field' : 'Multiple values per member per field, each with a date'}
//           </span>
//         </div>
//       )}

//       {/* File Upload */}
//       {table && (
//         <div>
//           <label className="block text-sm font-medium mb-1">Upload CSV</label>
//           <input
//             type="file"
//             accept=".csv"
//             onChange={handleFileChange}
//             className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-muted"
//           />
//         </div>
//       )}

//       {/* Validation Report */}
//       {validated && (
//         <div className={`rounded-lg border p-4 ${errors.length === 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
//           <p className="font-medium text-sm mb-2">
//             {errors.length === 0
//               ? `✓ ${rows.length} rows valid — ready to import`
//               : `${errors.length} error(s) found — ${validRows.length} of ${rows.length} rows will be imported`}
//           </p>
//           {errors.length > 0 && (
//             <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
//               {errors.slice(0, 50).map((e, i) => (
//                 <li key={i} className="text-red-700">Row {e.row} — {e.field}: {e.error}</li>
//               ))}
//               {errors.length > 50 && <li className="text-red-500">...and {errors.length - 50} more</li>}
//             </ul>
//           )}
//         </div>
//       )}

//       {/* Import Button */}
//       {validated && validRows.length > 0 && !done && (
//         <Button onClick={handleImport} disabled={importing}>
//           {importing ? 'Importing...' : `Import ${validRows.length} rows`}
//         </Button>
//       )}

//       {/* Progress */}
//       {importing && (
//         <div className="space-y-2">
//           <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
//             <div
//               className="h-full bg-primary rounded-full transition-all duration-300"
//               style={{ width: `${progressPct}%` }}
//             />
//           </div>
//           <p className="text-sm text-muted-foreground">Batch {progress.current} of {progress.total}</p>
//         </div>
//       )}

//       {/* Summary */}
//       {done && (
//         <div className="rounded-lg border p-4 bg-muted space-y-1">
//           <p className="font-medium">Import Complete</p>
//           <p className="text-sm">Inserted: {stats.inserted} · Updated: {stats.updated} · Skipped: {stats.skipped} · Failed: {stats.failed}</p>
//           {failedRows.length > 0 && (
//             <Button variant="outline" size="sm" onClick={downloadErrorReport}>
//               Download Error Report
//             </Button>
//           )}
//         </div>
//       )}
//     </div>
//   )
// }


'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { IMPORT_TABLES, ImportTableKey, ImportAction } from '@/lib/import/importConfig'
import { validateImportRows, RowError } from '@/lib/import/validateImportRows'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const BATCH_SIZE = 500

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

export function ImportForm() {
  const [table, setTable] = useState<ImportTableKey | ''>('')
  const [action, setAction] = useState<ImportAction>('upsert')
  const [fieldType, setFieldType] = useState<'static' | 'time-series'>('static')
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [errors, setErrors] = useState<RowError[]>([])
  const [validRows, setValidRows] = useState<Record<string, string>[]>([])
  const [validated, setValidated] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [stats, setStats] = useState({ inserted: 0, updated: 0, skipped: 0, failed: 0 })
  const [failedRows, setFailedRows] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!table) return
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().replace(/^#.*\n/, ''),
      transform: (v) => v.trim(),
    })
    const config = IMPORT_TABLES[table]
    // Skip validation for profile_field_with_values — columns are dynamic and can't be pre-defined
    const result = table === 'profile_field_with_values'
      ? { errors: [], validRows: parsed.data }
      : validateImportRows(parsed.data, config)
    setRows(parsed.data)
    setErrors(result.errors)
    setValidRows(result.validRows)
    setValidated(true)
    setDone(false)
  }, [table])

  const handleImport = async () => {
    if (!table || !validRows.length) return
    setImporting(true)
    const config = IMPORT_TABLES[table]
    const batches = chunkArray(validRows, BATCH_SIZE)
    const onConflictColumn = Array.isArray(config.uniqueKey) ? config.uniqueKey[0] : config.uniqueKey
    setProgress({ current: 0, total: batches.length })

    let totalInserted = 0, totalUpdated = 0, totalFailed = 0
    const allFailedRows: Record<string, string>[] = []

    const endpoint =
      table === 'profile_value'
        ? '/api/import/profile-values'
        : table === 'profile_field_with_values'
        ? '/api/import/profile-field-values'
        : '/api/import/upsert'

    for (let i = 0; i < batches.length; i++) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          table === 'profile_value'
            ? { rows: batches[i], fieldType }
            : table === 'profile_field_with_values'
            ? { rows: batches[i] }
            : { table, rows: batches[i], action, onConflictColumn }
        ),
      })
      const data = await res.json()
      totalInserted += data.inserted ?? 0
      totalUpdated += data.updated ?? 0
      totalFailed += data.failed ?? 0
      if (data.failedRows) allFailedRows.push(...data.failedRows)
      setProgress({ current: i + 1, total: batches.length })
    }

    setStats({ inserted: totalInserted, updated: totalUpdated, skipped: rows.length - validRows.length, failed: totalFailed })
    setFailedRows(allFailedRows)
    setImporting(false)
    setDone(true)
  }

  const downloadErrorReport = () => {
    if (!failedRows.length) return
    const csv = Papa.unparse(failedRows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import_errors.csv'
    a.click()
  }

  const downloadTemplate = () => {
    if (!table) return
    window.open(`/api/import/template?table=${table}`, '_blank')
  }

  const progressPct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Selectors */}
      <div className="flex gap-3 flex-wrap">
        <Select value={table} onValueChange={(v) => { setTable(v as ImportTableKey); setValidated(false); setDone(false) }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Select table" /></SelectTrigger>
          <SelectContent>
            {Object.entries(IMPORT_TABLES).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action} onValueChange={(v) => setAction(v as ImportAction)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Add new only</SelectItem>
            <SelectItem value="update">Update existing only</SelectItem>
            <SelectItem value="upsert">Upsert</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={downloadTemplate} disabled={!table}>
          Download Template
        </Button>
      </div>

      {/* Profile Value Flow — only shown when table = profile_value */}
      {table === 'profile_value' && (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
          <span className="text-sm font-medium">Field Type:</span>
          <Select value={fieldType} onValueChange={(v) => setFieldType(v as 'static' | 'time-series')}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="static">Static (no date)</SelectItem>
              <SelectItem value="time-series">Time-series (with date)</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {fieldType === 'static' ? 'One value per member per field' : 'Multiple values per member per field, each with a date'}
          </span>
        </div>
      )}

      {/* Combined Profile Field + Value info banner */}
      {table === 'profile_field_with_values' && (
        <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50 border-blue-200 text-sm text-blue-800">
          <span className="font-semibold shrink-0">Format:</span>
          <span>
            CSV must have an <code className="font-mono bg-blue-100 px-1 rounded">its_no</code> column.
            All other column headers become profile field captions (created automatically if they don&apos;t exist).
            Each cell value is saved as the profile value for that member and field.
          </span>
        </div>
      )}

      {/* File Upload */}
      {table && (
        <div>
          <label className="block text-sm font-medium mb-1">Upload CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-muted"
          />
        </div>
      )}

      {/* Validation Report */}
      {validated && (
        <div className={`rounded-lg border p-4 ${errors.length === 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <p className="font-medium text-sm mb-2">
            {errors.length === 0
              ? `✓ ${rows.length} rows valid — ready to import`
              : `${errors.length} error(s) found — ${validRows.length} of ${rows.length} rows will be imported`}
          </p>
          {errors.length > 0 && (
            <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
              {errors.slice(0, 50).map((e, i) => (
                <li key={i} className="text-red-700">Row {e.row} — {e.field}: {e.error}</li>
              ))}
              {errors.length > 50 && <li className="text-red-500">...and {errors.length - 50} more</li>}
            </ul>
          )}
        </div>
      )}

      {/* Import Button */}
      {validated && validRows.length > 0 && !done && (
        <Button onClick={handleImport} disabled={importing}>
          {importing ? 'Importing...' : `Import ${validRows.length} rows`}
        </Button>
      )}

      {/* Progress */}
      {importing && (
        <div className="space-y-2">
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">Batch {progress.current} of {progress.total}</p>
        </div>
      )}

      {/* Summary */}
      {done && (
        <div className="rounded-lg border p-4 bg-muted space-y-1">
          <p className="font-medium">Import Complete</p>
          <p className="text-sm">Inserted: {stats.inserted} · Updated: {stats.updated} · Skipped: {stats.skipped} · Failed: {stats.failed}</p>
          {failedRows.length > 0 && (
            <Button variant="outline" size="sm" onClick={downloadErrorReport}>
              Download Error Report
            </Button>
          )}
        </div>
      )}
    </div>
  )
}