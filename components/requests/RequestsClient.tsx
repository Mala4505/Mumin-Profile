'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Loader2, Search, X, Users } from 'lucide-react'

interface Family {
  sabeel_no: string
  hof_name: string
  hof_its: number | null
  hof_phone: string | null
  building_name: string
  subsector_name: string
}

interface ChangeRequest {
  id: number
  sabeel_no: string
  remark: string
  status: 'pending' | 'done'
  created_at: string
}

interface Props {
  families: Family[]
  initialRequests: ChangeRequest[]
  mode: 'idle' | 'loaded'
  currentSearch: string
  showAll: boolean
}

const PRESET_REMARKS = [
  'Address Change',
  'Left Building',
  'New Member Added',
  'Member Deceased',
  'Custom...',
]

export function RequestsClient({ families, initialRequests, mode, currentSearch, showAll }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(currentSearch)
  const [selected, setSelected] = useState<Family | null>(null)
  const [remark, setRemark] = useState(PRESET_REMARKS[0])
  const [customRemark, setCustomRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [requests, setRequests] = useState<ChangeRequest[]>(initialRequests)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('show_all')
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  function handleSearchChange(val: string) {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParam('search', val), 350)
  }

  function clearSearch() {
    setSearchInput('')
    router.push(pathname)
  }

  const finalRemark = remark === 'Custom...' ? customRemark.trim() : remark

  async function handleSubmit() {
    if (!selected || !finalRemark) return
    setSubmitting(true)
    setSubmitError('')

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sabeel_no: selected.sabeel_no, remark: finalRemark }),
    })

    if (!res.ok) {
      const d = await res.json()
      setSubmitError(d.error ?? 'Failed to submit')
      setSubmitting(false)
      return
    }

    const newReq = await res.json()
    setRequests(prev => [newReq, ...prev])
    setSelected(null)
    setRemark(PRESET_REMARKS[0])
    setCustomRemark('')
    setSubmitting(false)
  }

  // Search bar used in both modes
  const searchBar = (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex-1 min-w-48 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search by sabeel, HOF name, ITS…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      {searchInput && (
        <button
          onClick={clearSearch}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
      {!showAll && (
        <a
          href="/requests?show_all=1"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          View All
        </a>
      )}
    </div>
  )

  // ── Idle state ──────────────────────────────────────────────────────────────
  if (mode === 'idle') {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          {searchBar}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Search for a family</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Type a name, ITS No, or sabeel number, or load the full list.
            </p>
            <a
              href="/requests?show_all=1"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Users className="w-4 h-4" />
              View All Families
            </a>
          </div>
        </div>

        {/* My Requests — always visible */}
        {requests.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">My Requests</h2>
            <RequestsTable requests={requests} />
          </div>
        )}
      </div>
    )
  }

  // ── Loaded state ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Family List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border space-y-3">
            <h2 className="font-semibold text-foreground">Select Family</h2>
            {searchBar}
          </div>
          <div className="overflow-y-auto max-h-96">
            {families.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No families found</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sabeel</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">HOF Name</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Building</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Subsector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {families.map(f => (
                    <tr
                      key={f.sabeel_no}
                      onClick={() => setSelected(f)}
                      className={`cursor-pointer transition-colors ${
                        selected?.sabeel_no === f.sabeel_no
                          ? 'bg-primary/10 border-l-2 border-l-primary'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.sabeel_no}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{f.hof_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{f.building_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{f.subsector_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Request Form */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-foreground">Submit Request</h2>

          {selected ? (
            <>
              {/* Selected family info */}
              <div className="bg-muted/30 rounded-lg p-3 border border-border flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Selected Family</p>
                  <p className="font-medium text-foreground">{selected.hof_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sabeel {selected.sabeel_no}
                    {selected.hof_its && ` · ITS ${selected.hof_its}`}
                    {selected.hof_phone && ` · ${selected.hof_phone}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{selected.building_name} · {selected.subsector_name}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Remark</label>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_REMARKS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRemark(r)}
                      className={`px-3 py-2 rounded-lg text-sm text-left border transition-colors ${
                        remark === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-foreground hover:bg-muted/40'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {remark === 'Custom...' && (
                  <textarea
                    value={customRemark}
                    onChange={e => setCustomRemark(e.target.value)}
                    placeholder="Describe the change…"
                    rows={3}
                    className="mt-2 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                )}
              </div>

              {submitError && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !finalRemark}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Request'}
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center py-12 text-center">
              <div>
                <p className="text-muted-foreground text-sm">Select a family from the list to submit a request</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Requests */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">My Requests</h2>
        {requests.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
            No requests submitted yet.
          </div>
        ) : (
          <RequestsTable requests={requests} />
        )}
      </div>
    </div>
  )
}

function RequestsTable({ requests }: { requests: ChangeRequest[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sabeel</th>
            <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Remark</th>
            <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Date</th>
            <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map(r => (
            <tr key={r.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.sabeel_no}</td>
              <td className="px-4 py-3 text-foreground">{r.remark}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                {new Date(r.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === 'done'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {r.status === 'done' ? 'Done' : 'Pending'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
