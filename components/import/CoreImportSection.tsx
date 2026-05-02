'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

type LogLine =
  | { type: 'info'; text: string }
  | { type: 'error'; text: string }
  | { type: 'done'; text: string }

export function CoreImportSection() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [done, setDone] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  function appendLog(line: LogLine) {
    setLogs(prev => [...prev, line])
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const downloadTemplate = () => {
    window.open('/api/import/template?table=core', '_blank')
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setLogs([])
    setDone(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/import/core', { method: 'POST', body: formData })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Import failed' }))
        appendLog({ type: 'error', text: err.error ?? 'Import failed' })
        setImporting(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'start') {
              appendLog({ type: 'info', text: `Started — ${event.total} rows to process` })
            } else if (event.type === 'progress') {
              appendLog({
                type: 'info',
                text: `[${event.phase}] ${event.processed}/${event.total} rows | inserted: ${event.inserted} | updated: ${event.updated} | errors: ${event.errors}`,
              })
            } else if (event.type === 'error') {
              appendLog({
                type: 'error',
                text: `Row ${event.row}${event.its_no ? ` (ITS ${event.its_no})` : ''}: ${event.message}`,
              })
            } else if (event.type === 'done') {
              const r = event.result
              appendLog({
                type: 'done',
                text: `Done — Inserted: ${r.insertedRows} | Updated: ${r.updatedRows} | Errors: ${r.errorRows} | Status: ${r.status}`,
              })
              setDone(true)
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (err) {
      appendLog({ type: 'error', text: String(err) })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex gap-3 flex-wrap items-center">
        <Button variant="outline" onClick={downloadTemplate}>
          Download Template
        </Button>
        <span className="text-xs text-muted-foreground">
          Columns: ITS_NO, Name, Gender, DOB, Balig, Sabeel_No, PACI_NO, Floor_No, Flat_No, Building, SubSector, Sector, Role, Phone, Street, Landmark, Family_Type
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Upload CSV</label>
        <input
          type="file"
          accept=".csv"
          onChange={e => {
            setFile(e.target.files?.[0] ?? null)
            setDone(false)
            setLogs([])
          }}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-muted"
        />
      </div>

      {file && !importing && !done && (
        <Button onClick={handleImport}>
          Import {file.name}
        </Button>
      )}

      {done && (
        <Button
          variant="outline"
          onClick={() => {
            setFile(null)
            setLogs([])
            setDone(false)
          }}
        >
          Import another file
        </Button>
      )}

      {logs.length > 0 && (
        <div className="rounded-lg border bg-muted font-mono text-xs p-3 max-h-80 overflow-y-auto space-y-0.5">
          {logs.map((log, i) => (
            <div
              key={i}
              className={
                log.type === 'error'
                  ? 'text-red-600'
                  : log.type === 'done'
                  ? 'text-green-700 font-semibold'
                  : 'text-foreground'
              }
            >
              {log.text}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  )
}
