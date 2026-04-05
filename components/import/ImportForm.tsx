'use client'

import { useState, useRef } from 'react'
import {
  UploadCloud,
  Upload,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileDown,
} from 'lucide-react'
import type { Role } from '@/lib/types/app'

interface ImportFormProps {
  role: Role
}

interface ImportResult {
  importLogId: number
  totalRows: number
  insertedRows: number
  updatedRows: number
  errorRows: number
  status: string
  errors: Array<{ rowNumber: number; itsNo?: string; message: string }>
}

interface ProgressState {
  phase: string
  processed: number
  total: number
  inserted: number
  updated: number
  errors: number
}

interface LiveError {
  row: number
  its_no?: string
  message: string
}

const CORE_COLUMNS_REQUIRED = ['ITS_NO', 'Name', 'Gender', 'Balig', 'Sabeel_No', 'PACI_NO', 'Building', 'SubSector', 'Sector']
const CORE_COLUMNS_OPTIONAL = ['DOB', 'Floor_No', 'Flat_No', 'Role', 'Phone', 'Street', 'Landmark', 'Family_Type']
const CORE_COLUMNS = [...CORE_COLUMNS_REQUIRED, ...CORE_COLUMNS_OPTIONAL]
const PROFILE_COLUMNS = ['ITS_NO', 'Field_Caption', 'Value']

function downloadTemplate(isCore: boolean) {
  let csv: string
  let filename: string
  if (isCore) {
    csv = [
      'ITS_NO,Name,Gender,DOB,Balig,Sabeel_No,PACI_NO,Floor_No,Flat_No,Building,SubSector,Sector,Role,Phone,Street,Landmark,Family_Type',
      '10000001,Mohammed Ali,M,1990-01-15,Balig,SBL-0001,PAC-001,2,5A,Block A,A-1,Sector A,Mumin,+96512345678,Street 12,Near Park,Family',
      '10000002,Fatima Hussain,F,,Ghair Balig,SBL-0002,PAC-002,,,Block B,A-2,Sector A,,,,, ',
      '10000003,Ahmed Hussain,M,1985-06-20,Balig,SBL-0001,PAC-001,2,5A,Block A,A-1,Sector A,Masool,+96598765432,,,Bachelor',
    ].join('\n')
    filename = 'core-members-template.csv'
  } else {
    csv = [
      'ITS_NO,Field_Caption,Value',
      '10000001,Blood Group,O+',
      '10000001,Occupation,Engineer',
      '10000001,Qualification,B.Eng',
    ].join('\n')
    filename = 'profile-data-template.csv'
  }
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ImportForm({ role }: ImportFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [colRefOpen, setColRefOpen] = useState(false)
  const [progressState, setProgressState] = useState<ProgressState | null>(null)
  const [liveErrors, setLiveErrors] = useState<LiveError[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const canRunCore = role === 'SuperAdmin'
  const columns = canRunCore ? CORE_COLUMNS : PROFILE_COLUMNS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError('')
    setResult(null)
    setProgressState(null)
    setLiveErrors([])
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    const endpoint = canRunCore ? '/api/import/core' : '/api/import/profile'

    let res: Response
    try {
      res = await fetch(endpoint, { method: 'POST', body: formData })
    } catch {
      setError('Network error — could not reach the server.')
      setLoading(false)
      return
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Import failed')
      setLoading(false)
      return
    }

    // Profile import returns plain JSON
    if (!res.headers.get('content-type')?.includes('text/event-stream')) {
      const data = await res.json()
      setResult(data)
      setLoading(false)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    // Core import returns SSE stream — read incrementally
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Split on SSE event boundaries
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'start') {
              setProgressState({
                phase: 'Starting…',
                processed: 0,
                total: event.total,
                inserted: 0,
                updated: 0,
                errors: 0,
              })
            } else if (event.type === 'progress') {
              setProgressState({
                phase: event.phase,
                processed: event.processed,
                total: event.total,
                inserted: event.inserted,
                updated: event.updated,
                errors: event.errors,
              })
            } else if (event.type === 'error' && event.row) {
              setLiveErrors(prev => [...prev, {
                row: event.row,
                its_no: event.its_no,
                message: event.message,
              }])
            } else if (event.type === 'done') {
              setResult(event.result)
              setLoading(false)
              setFile(null)
              if (fileRef.current) fileRef.current.value = ''
            } else if (event.type === 'error' && !event.row) {
              setError(event.message ?? 'Import failed')
              setLoading(false)
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    } catch {
      setError('Stream interrupted — check server logs.')
    }

    setLoading(false)
  }

  function handleFileChange(newFile: File | null) {
    if (!newFile) return
    if (!newFile.name.endsWith('.csv')) {
      setError('Please select a CSV file.')
      return
    }
    setError('')
    setResult(null)
    setFile(newFile)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileChange(dropped)
  }

  function removeFile() {
    setFile(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const statusConfig = result
    ? result.status === 'completed'
      ? {
          bg: 'bg-green-50',
          border: 'border-green-200',
          headerBg: 'bg-green-100',
          textColor: 'text-green-800',
          icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
          label: 'Import Completed',
        }
      : result.status === 'failed'
      ? {
          bg: 'bg-red-50',
          border: 'border-red-200',
          headerBg: 'bg-red-100',
          textColor: 'text-red-800',
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          label: 'Import Failed',
        }
      : {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          headerBg: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
          label: 'Completed with Errors',
        }
    : null

  const progressPct = progressState && progressState.total > 0
    ? Math.round((progressState.processed / progressState.total) * 100)
    : 0

  return (
    <div className="space-y-5">
      {/* Import type banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Upload className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">
              {canRunCore ? 'Core Member Import' : 'Profile Data Import'}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Required columns:{' '}
              <span className="font-mono text-foreground">{columns.join(', ')}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => downloadTemplate(canRunCore)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          Template
        </button>
      </div>

      {/* Drag & Drop zone */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer select-none
            ${dragOver
              ? 'border-primary bg-primary/5'
              : file
              ? 'border-green-400 bg-green-50/50 cursor-default'
              : 'border-border hover:border-primary/50 hover:bg-primary/5'
            }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-2 bg-white border border-border rounded-full px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {file.name}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeFile() }}
                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          ) : (
            <>
              <UploadCloud className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Drag &amp; drop your CSV file here</p>
              <div className="flex items-center gap-3 my-3 max-w-[160px] mx-auto">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted/40 transition-colors"
              >
                Browse file
              </button>
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-3 py-2.5">
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Live progress — shown while SSE stream is active */}
        {loading && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
              {progressState?.phase ?? 'Processing import…'}
            </p>
            {progressState && progressState.total > 0 && (
              <>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {progressState.processed.toLocaleString()} / {progressState.total.toLocaleString()} rows
                  {progressState.inserted > 0 && ` · ${progressState.inserted} inserted`}
                  {progressState.updated > 0 && ` · ${progressState.updated} updated`}
                  {progressState.errors > 0 && ` · ${progressState.errors} errors`}
                </p>
              </>
            )}
          </div>
        )}

        {/* Live error list — grows as errors arrive */}
        {liveErrors.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-destructive/20 bg-destructive/10">
              <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
                Row Errors ({liveErrors.length})
              </p>
            </div>
            <div className="overflow-auto max-h-[200px] divide-y divide-destructive/10">
              {liveErrors.map((err, i) => (
                <div key={i} className="px-4 py-2 text-xs">
                  <span className="font-mono text-muted-foreground mr-2">Row {err.row}</span>
                  {err.its_no && (
                    <span className="font-mono text-muted-foreground mr-2">ITS {err.its_no}</span>
                  )}
                  <span className="text-destructive">{err.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Start Import
            </>
          )}
        </button>
      </form>

      {/* Result panel */}
      {result && statusConfig && (
        <div className={`rounded-xl border overflow-hidden ${statusConfig.bg} ${statusConfig.border}`}>
          {/* Header */}
          <div className={`${statusConfig.headerBg} px-4 py-3 flex items-center gap-2`}>
            {statusConfig.icon}
            <span className={`font-semibold text-sm ${statusConfig.textColor}`}>{statusConfig.label}</span>
          </div>

          {/* Stats grid */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <p className="text-xl font-bold text-foreground">{result.totalRows}</p>
            </div>
            <div className="bg-card rounded-lg border border-green-200 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Inserted</p>
              <p className="text-xl font-bold text-green-600">{result.insertedRows}</p>
            </div>
            <div className="bg-card rounded-lg border border-blue-200 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Updated</p>
              <p className="text-xl font-bold text-blue-600">{result.updatedRows}</p>
            </div>
            <div className="bg-card rounded-lg border border-red-200 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Errors</p>
              <p className="text-xl font-bold text-red-600">{result.errorRows}</p>
            </div>
          </div>

          {/* Error table */}
          {result.errors.length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Error Details ({result.errors.length})
              </p>
              <div className="overflow-auto max-h-[300px] rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Row #</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">ITS No</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Error Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {result.errors.map((err, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono text-muted-foreground">{err.rowNumber}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{err.itsNo ?? '—'}</td>
                        <td className="px-3 py-2 text-destructive">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Column Reference — collapsible */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setColRefOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
        >
          <span>Column Reference</span>
          {colRefOpen
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </button>
        {colRefOpen && (
          <div className="px-4 pb-4 border-t border-border">
            <p className="text-xs text-muted-foreground mt-3 mb-2">
              Expected columns for {canRunCore ? 'Core Member Import' : 'Profile Data Import'}:
            </p>
            {canRunCore ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Required</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CORE_COLUMNS_REQUIRED.map(col => (
                    <code key={col} className="bg-muted text-foreground font-mono text-xs px-2.5 py-1 rounded-md border border-border">
                      {col}
                    </code>
                  ))}
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Optional</p>
                <div className="flex flex-wrap gap-2">
                  {CORE_COLUMNS_OPTIONAL.map(col => (
                    <code key={col} className="bg-muted/50 text-muted-foreground font-mono text-xs px-2.5 py-1 rounded-md border border-dashed border-border">
                      {col}
                    </code>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                {columns.map(col => (
                  <code key={col} className="bg-muted text-foreground font-mono text-xs px-2.5 py-1 rounded-md border border-border">
                    {col}
                  </code>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
