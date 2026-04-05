'use client'

import { useState } from 'react'
import { Loader2, CheckCheck, X } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewRequest {
  id: number
  sabeel_no: string
  remark: string
  status: 'pending' | 'done'
  created_at: string
  reviewed_at: string | null
  requester: { its_no: number; name: string; phone: string | null } | null
  hof: { head_its_no: number | null; mumin: { its_no: number; name: string } | null } | null
}

interface Props {
  initialRequests: ReviewRequest[]
}

type FilterTab = 'all' | 'pending' | 'done'

export function RequestsReview({ initialRequests }: Props) {
  const [requests, setRequests] = useState<ReviewRequest[]>(initialRequests)
  const [tab, setTab] = useState<FilterTab>('all')
  const [toggling, setToggling] = useState<number | null>(null)
  const [showMarkAllModal, setShowMarkAllModal] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab)
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const pendingFiltered = filtered.filter(r => r.status === 'pending')

  async function toggleStatus(req: ReviewRequest) {
    const newStatus = req.status === 'pending' ? 'done' : 'pending'
    setToggling(req.id)

    const res = await fetch(`/api/requests/${req.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (res.ok) {
      const updated = await res.json()
      setRequests(prev => prev.map(r =>
        r.id === req.id
          ? { ...r, status: updated.status, reviewed_at: updated.reviewed_at }
          : r
      ))
    } else {
      toast.error('Failed to update request status')
    }

    setToggling(null)
  }

  async function handleMarkAllPending() {
    setMarkingAll(true)
    const pendingIds = requests.filter(r => r.status === 'pending').map(r => r.id)

    let succeeded = 0
    let failed = 0

    await Promise.all(
      pendingIds.map(async id => {
        const res = await fetch(`/api/requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done' }),
        })
        if (res.ok) {
          const updated = await res.json()
          setRequests(prev => prev.map(r =>
            r.id === id ? { ...r, status: updated.status, reviewed_at: updated.reviewed_at } : r
          ))
          succeeded++
        } else {
          failed++
        }
      })
    )

    setMarkingAll(false)
    setShowMarkAllModal(false)

    if (failed === 0) {
      toast.success(`${succeeded} request${succeeded !== 1 ? 's' : ''} marked as done`)
    } else {
      toast.warning(`${succeeded} marked as done, ${failed} failed`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs + Mark All button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 w-fit">
          {(['all', 'pending', 'done'] as FilterTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
              {t === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {pendingCount > 0 && (
          <button
            onClick={() => setShowMarkAllModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Pending as Done
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No requests found.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Requested By</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Timestamp</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">HOF Name</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sabeel</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Remark</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{r.requester?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.requester?.its_no}</p>
                      {r.requester?.phone && (
                        <p className="text-xs text-muted-foreground">{r.requester.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}<br />
                      <span className="text-[10px]">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {r.hof?.mumin?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.sabeel_no}</td>
                    <td className="px-4 py-3 text-foreground max-w-xs">{r.remark}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(r)}
                        disabled={toggling === r.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          r.status === 'done'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        } disabled:opacity-60`}
                      >
                        {toggling === r.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        {r.status === 'done' ? 'Done' : 'Pending'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark All Confirmation Modal */}
      {showMarkAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !markingAll && setShowMarkAllModal(false)} />
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCheck className="w-5 h-5 text-green-600" />
              </div>
              <button
                onClick={() => !markingAll && setShowMarkAllModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-base font-bold text-foreground mb-1">Mark All Pending as Done?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This will mark <span className="font-semibold text-foreground">{pendingCount} pending request{pendingCount !== 1 ? 's' : ''}</span> as done. This action can be reversed individually.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowMarkAllModal(false)}
                disabled={markingAll}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkAllPending}
                disabled={markingAll}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {markingAll ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Marking…</>
                ) : (
                  <><CheckCheck className="w-4 h-4" /> Confirm</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
