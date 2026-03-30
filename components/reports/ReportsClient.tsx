'use client'

import { useState } from 'react'
import {
  SlidersHorizontal,
  Search,
  RotateCcw,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react'
import type { Role } from '@/lib/types/app'

interface ReportsClientProps {
  sectors: Array<{ sector_id: number; sector_name: string }>
  role: Role
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors'

const labelClass = 'block text-xs font-medium text-muted-foreground mb-1.5'

export function ReportsClient({ sectors, role }: ReportsClientProps) {
  const [sectorId, setSectorId] = useState('')
  const [gender, setGender] = useState('')
  const [baligStatus, setBaligStatus] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  const hasFilters = !!(sectorId || gender || baligStatus || status || search)

  function buildQueryString() {
    const params = new URLSearchParams()
    if (sectorId) params.set('sector_id', sectorId)
    if (gender) params.set('gender', gender)
    if (baligStatus) params.set('balig_status', baligStatus)
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    return params.toString()
  }

  async function handleExport() {
    setDownloading(true)
    setExportSuccess(false)
    const qs = buildQueryString()
    const res = await fetch(`/api/export/members${qs ? '?' + qs : ''}`)
    if (!res.ok) {
      alert('Export failed. Please try again.')
      setDownloading(false)
      return
    }
    const disposition = res.headers.get('Content-Disposition') ?? ''
    const filenameMatch = disposition.match(/filename="([^"]+)"/)
    const filename = filenameMatch?.[1] ?? 'members.xlsx'

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    setDownloading(false)
    setExportSuccess(true)
    setTimeout(() => setExportSuccess(false), 4000)
  }

  function resetFilters() {
    setSectorId('')
    setGender('')
    setBaligStatus('')
    setStatus('')
    setSearch('')
  }

  // Build active filter pills for the export panel preview
  const activePills: Array<{ key: string; label: string; clear: () => void }> = []
  if (search) activePills.push({ key: 'search', label: `Search: "${search}"`, clear: () => setSearch('') })
  if (sectorId) {
    const sectorName = sectors.find(s => String(s.sector_id) === sectorId)?.sector_name ?? sectorId
    activePills.push({ key: 'sector', label: `Sector: ${sectorName}`, clear: () => setSectorId('') })
  }
  if (gender) activePills.push({ key: 'gender', label: `Gender: ${gender === 'M' ? 'Male' : 'Female'}`, clear: () => setGender('') })
  if (baligStatus) activePills.push({ key: 'balig', label: `Balig: ${baligStatus}`, clear: () => setBaligStatus('') })
  if (status) activePills.push({ key: 'status', label: `Status: ${status}`, clear: () => setStatus('') })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
      {/* Left: Filter Panel */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Filter Members
          </h2>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Search */}
          <div>
            <label className={labelClass}>Search Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Type to search…"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {/* Sector — SuperAdmin only */}
          {role === 'SuperAdmin' && (
            <div>
              <label className={labelClass}>Sector</label>
              <select
                value={sectorId}
                onChange={e => setSectorId(e.target.value)}
                className={inputClass}
              >
                <option value="">All Sectors</option>
                {sectors.map(s => (
                  <option key={s.sector_id} value={s.sector_id}>{s.sector_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Gender toggle */}
          <div>
            <label className={labelClass}>Gender</label>
            <div className="flex gap-2">
              {[
                { value: '', label: 'All' },
                { value: 'M', label: 'Male' },
                { value: 'F', label: 'Female' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors
                    ${gender === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:bg-muted/40'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Balig Status */}
          <div>
            <label className={labelClass}>Balig Status</label>
            <select
              value={baligStatus}
              onChange={e => setBaligStatus(e.target.value)}
              className={inputClass}
            >
              <option value="">All</option>
              <option value="Balig">Balig</option>
              <option value="Ghair Balig">Ghair Balig</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>Member Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className={inputClass}
            >
              <option value="">Active only</option>
              <option value="active">Active</option>
              <option value="deceased">Deceased</option>
              <option value="relocated">Relocated</option>
              <option value="left_community">Left Community</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Right: Export Panel */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm mb-1">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          Export Report
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Download all matching members as an Excel file (.xlsx).
        </p>

        {/* Active filter summary pills */}
        <div className="mb-4 min-h-[32px]">
          {activePills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {activePills.map(pill => (
                <span
                  key={pill.key}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full border border-primary/20"
                >
                  {pill.label}
                  <button
                    type="button"
                    onClick={pill.clear}
                    className="hover:text-primary/60 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No filters active — all members will be exported.</p>
          )}
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={downloading}
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors
            ${downloading
              ? 'bg-primary/70 text-primary-foreground cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Excel (.xlsx)
            </>
          )}
        </button>

        {/* Success banner */}
        {exportSuccess && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Export complete — file downloaded successfully.
          </div>
        )}
      </div>
    </div>
  )
}
