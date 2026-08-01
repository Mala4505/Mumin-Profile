'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, X, Copy, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { MemberIdentity } from '@/components/members/MemberPrimitives'
import { TOUCH_TARGET } from '@/lib/members/display'
import type { RespondentRow } from '@/app/api/analytics/forms/[id]/route'

const TH = 'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'

export function filterRespondents(
  respondents: RespondentRow[],
  selectedAnswer: string | null,
  selectedSector: string | null,
  search: string
): RespondentRow[] {
  const q = search.trim().toLowerCase()
  return respondents.filter(r => {
    if (selectedAnswer && r.answer !== selectedAnswer) return false
    if (selectedSector && r.sector_name !== selectedSector) return false
    if (q) {
      if (!r.name.toLowerCase().includes(q) && !r.its_no.includes(q)) return false
    }
    return true
  })
}

const PAGE_SIZE = 10

function CopyPhone({ phone }: { phone: string | null }) {
  const [copied, setCopied] = React.useState(false)
  if (!phone) return <span className="text-muted-foreground">—</span>

  function handleCopy() {
    navigator.clipboard.writeText(phone!).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy number'}
      className="group flex min-h-11 items-center gap-1.5 font-mono text-xs text-foreground transition-colors hover:text-primary sm:min-h-0"
    >
      {phone}
      {copied
        ? <Check className="w-3 h-3 text-green-500 shrink-0" />
        : (
          // Always visible on touch — `group-hover` alone is unreachable there.
          <Copy className="w-3 h-3 shrink-0 text-muted-foreground transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100" />
        )
      }
    </button>
  )
}

function fmtDate(s: string | undefined) {
  return s
    ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
}

interface RespondentsTableProps {
  respondents: RespondentRow[]
  loading: boolean
  selectedAnswer: string | null
  selectedSector: string | null
  onAnswerClear: () => void
  onSectorClear: () => void
  onSectorChange: (sector: string | null) => void
  availableSectors: string[]
}

export function RespondentsTable({
  respondents,
  loading,
  selectedAnswer,
  selectedSector,
  onAnswerClear,
  onSectorClear,
  onSectorChange,
  availableSectors,
}: RespondentsTableProps) {
  const [searchInput, setSearchInput] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(0)

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const filtered = React.useMemo(
    () => filterRespondents(respondents, selectedAnswer, selectedSector, search),
    [respondents, selectedAnswer, selectedSector, search]
  )

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const hasFilter = !!(selectedAnswer || selectedSector || searchInput.trim())

  React.useEffect(() => { setPage(0) }, [selectedAnswer, selectedSector, search])

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground mr-1">Respondents</span>
        {selectedAnswer && (
          <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full">
            Answer: {selectedAnswer}
            <button
              onClick={onAnswerClear}
              aria-label="Clear answer filter"
              className="inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 hover:text-blue-900"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {selectedSector && (
          <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs px-2 py-0.5 rounded-full">
            Sector: {selectedSector}
            <button
              onClick={onSectorClear}
              aria-label="Clear sector filter"
              className="inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 hover:text-green-900"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
          {availableSectors.length > 0 && (
            <Select
              value={selectedSector ?? '__all__'}
              onValueChange={v => onSectorChange(v === '__all__' ? null : v)}
            >
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Sectors</SelectItem>
                {availableSectors.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name / ITS…"
              className="pl-7 h-7 text-xs w-full sm:w-36"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {!hasFilter ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Click a chart segment to drill down into respondents.
        </div>
      ) : loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No respondents match the current filters.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className={TH}>Member</th>
                  <th className={TH}>Answer</th>
                  <th className={`${TH} hidden sm:table-cell`}>Mobile</th>
                  <th className={`${TH} hidden md:table-cell`}>Sector</th>
                  <th className={`${TH} hidden lg:table-cell`}>Subsector</th>
                  <th className={`${TH} hidden xl:table-cell w-28`}>Submitted</th>
                  <th className="px-4 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <MemberIdentity name={r.name} itsNo={r.its_no} size="sm" />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-1.5 py-0.5 rounded">
                        {r.answer}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <CopyPhone phone={r.phone || ""} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{r.sector_name || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">{r.subsector_name || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                      {fmtDate(r.submitted_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        // href={`/members?search=${r.its_no}`}
                        href={`/members/${r.its_no}`}
                        className={`${TOUCH_TARGET} text-xs font-medium text-orange-600 hover:text-orange-700`}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {filtered.length} respondent{filtered.length !== 1 ? 's' : ''} shown
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Page {page + 1} / {pageCount}</span>
                <Button
                  variant="outline" size="sm" className="h-7 text-xs"
                  disabled={page === 0} onClick={() => setPage(p => p - 1)}
                >Prev</Button>
                <Button
                  variant="outline" size="sm" className="h-7 text-xs"
                  disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}
                >Next</Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
