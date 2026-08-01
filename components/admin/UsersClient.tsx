'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Pencil, X, Loader2, Shield, Search, ChevronLeft, ChevronRight, ChevronDown, Users, KeyRound, Ban, TriangleAlert, Check, RotateCcw } from 'lucide-react'
import { Chip, MemberIdentity } from '@/components/members/MemberPrimitives'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TOUCH_TARGET } from '@/lib/members/display'

/** Canonical table-header typography, shared with every other table in the app. */
const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'

interface SystemUser {
  its_no: number
  name: string
  role: string
  is_active: boolean
  last_login_at: string | null
  supabase_auth_id: string | null
  login_credential: string
  has_custom_password: boolean
  sector: Array<{ sector_id: number }>
  subsector: Array<{ subsector_id: number }>
  umoor: Array<{ category_id: number }>
}

interface Sector { sector_id: number; sector_name: string }
interface Subsector { subsector_id: number; sector_id: number; subsector_name: string }
interface Category { id: number; name: string }

interface Props {
  initialUsers: SystemUser[]
  sectors: Sector[]
  subsectors: Subsector[]
  categories: Category[]
  mode: 'idle' | 'loaded'
  currentSearch: string
  currentRole: string
  showAll: boolean
}

const ROLES = ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'Mumin', 'UmoorCoordinator'] as const
type Role = typeof ROLES[number]

const ALL_ROLES = ['', ...ROLES] as const

const PAGE_SIZE = 50

const CREDENTIALS = ['paci', 'sabeel'] as const
type Credential = typeof CREDENTIALS[number]

const CREDENTIAL_LABEL: Record<Credential, string> = {
  paci: 'PACI No',
  sabeel: 'Sabeel No',
}

const CREDENTIAL_HINT: Record<Credential, string> = {
  paci: 'Signs in with the family PACI number.',
  sabeel: 'Signs in with their own Sabeel number.',
}

function toCredential(value: string | null | undefined): Credential {
  return value === 'sabeel' ? 'sabeel' : 'paci'
}

const nf = new Intl.NumberFormat('en-US')

/**
 * Runs `worker` over `items` with at most `limit` requests in flight. Bulk
 * updates can cover 2000 rows and each one hits the per-user PATCH endpoint,
 * so firing them all at once would bury the API and the Supabase auth admin.
 */
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
  shouldStop: () => boolean
): Promise<void> {
  let cursor = 0
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      if (shouldStop()) return
      const index = cursor++
      if (index >= items.length) return
      await worker(items[index])
    }
  })
  await Promise.all(lanes)
}

const BULK_CONCURRENCY = 5

/**
 * Roles are a different semantic domain from member status, so they keep their
 * own colours — but they render through the shared `Chip` so padding, radius and
 * weight match every other badge in the app.
 */
const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: 'bg-purple-100 text-purple-700 border-purple-200',
  Admin: 'bg-amber-100 text-amber-700 border-amber-200',
  Masool: 'bg-primary/10 text-primary border-primary/20',
  Musaid: 'bg-blue-100 text-blue-700 border-blue-200',
  Mumin: 'bg-muted text-muted-foreground border-border',
  UmoorCoordinator: 'bg-teal-100 text-teal-700 border-teal-200',
}

const ROLE_FALLBACK = 'bg-muted text-muted-foreground border-border'

function RoleBadge({ role }: { role: string }) {
  return <Chip tone={ROLE_COLORS[role] ?? ROLE_FALLBACK}>{role}</Chip>
}

// ── Bulk credential rollout over the current filtered set ─────────────────────

interface BulkResult {
  updated: number
  failures: Array<{ its_no: number; name: string; reason: string }>
  stoppedEarly: boolean
}

function BulkCredentialPanel({
  users,
  onApplied,
}: {
  users: SystemUser[]
  onApplied: (itsNos: number[], credential: Credential) => void
}) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<Credential>('sabeel')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BulkResult | null>(null)
  const stopRef = useRef(false)

  // Only rows that would actually change are sent. Announcing "1,204" when 900
  // are already correct would overstate the blast radius.
  const pending = useMemo(
    () => users.filter(u => toCredential(u.login_credential) !== target),
    [users, target]
  )
  const alreadySet = users.length - pending.length
  const needsProvisioning = useMemo(() => pending.filter(u => !u.supabase_auth_id).length, [pending])

  async function run() {
    stopRef.current = false
    setRunning(true)
    setProgress(0)
    setResult(null)

    const failures: BulkResult['failures'] = []
    const succeeded: number[] = []
    let completed = 0

    await runPool(
      pending,
      BULK_CONCURRENCY,
      async (u) => {
        try {
          const res = await fetch(`/api/admin/users/${u.its_no}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login_credential: target }),
          })
          if (res.ok) {
            succeeded.push(u.its_no)
          } else {
            const data = await res.json().catch(() => ({}))
            failures.push({ its_no: u.its_no, name: u.name, reason: data.error ?? `HTTP ${res.status}` })
          }
        } catch {
          failures.push({ its_no: u.its_no, name: u.name, reason: 'Network error' })
        } finally {
          completed++
          setProgress(completed)
        }
      },
      () => stopRef.current
    )

    onApplied(succeeded, target)
    setResult({ updated: succeeded.length, failures, stoppedEarly: stopRef.current })
    setRunning(false)
  }

  function reset() {
    setOpen(false)
    setResult(null)
    setProgress(0)
    stopRef.current = false
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <KeyRound className="w-3.5 h-3.5" />
        Set credential in bulk
      </button>
    )
  }

  return (
    // Full-bleed drawer under the header row rather than a card nested in a card.
    <div className="w-full basis-full -mx-4 -mb-3 border-t border-border bg-muted/20 px-4 py-4">
      {!result ? (
        <>
          <p className="text-sm font-semibold text-foreground">
            Set login credential for the {nf.format(users.length)} member{users.length !== 1 ? 's' : ''} in this view
          </p>

          <div className="flex gap-2 mt-3 max-w-xs">
            {CREDENTIALS.map(c => (
              <button
                key={c}
                type="button"
                disabled={running}
                onClick={() => setTarget(c)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60 ${
                  target === c
                    ? 'bg-primary/15 text-foreground border-primary'
                    : 'bg-background border-border text-foreground hover:bg-muted/40'
                }`}
              >
                {CREDENTIAL_LABEL[c]}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-1 text-sm text-muted-foreground max-w-prose">
            <p>
              <span className="font-semibold text-foreground">{nf.format(pending.length)}</span> will change to {CREDENTIAL_LABEL[target]}.
              {alreadySet > 0 && <> {nf.format(alreadySet)} already use it and will be skipped.</>}
            </p>
            {needsProvisioning > 0 && (
              <p className="text-amber-600">
                {nf.format(needsProvisioning)} of them have no login account yet. One will be created for each as part of this run.
              </p>
            )}
          </div>

          {running && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Updating {nf.format(progress)} of {nf.format(pending.length)}</span>
                <span>{Math.round((progress / Math.max(1, pending.length)) * 100)}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={pending.length}
                aria-valuenow={progress}
                aria-label={`Updating login credential for ${nf.format(pending.length)} members`}
                className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
              >
                <div
                  className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-200 ease-out"
                  style={{ transform: `scaleX(${progress / Math.max(1, pending.length)})` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {running ? (
              <button
                type="button"
                onClick={() => { stopRef.current = true }}
                className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
              >
                Stop after in-flight updates
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={run}
                  disabled={pending.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {pending.length === 0
                    ? 'Nothing to change'
                    : `Update ${nf.format(pending.length)} member${pending.length !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-2.5">
            <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${
              result.failures.length === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {result.failures.length === 0 ? <Check className="w-3.5 h-3.5" /> : <TriangleAlert className="w-3.5 h-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {nf.format(result.updated)} updated to {CREDENTIAL_LABEL[target]}
                {result.failures.length > 0 && <>, {nf.format(result.failures.length)} failed</>}
              </p>
              {result.stoppedEarly && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Stopped early. The remaining members keep their previous credential.
                </p>
              )}
              {result.failures.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-background divide-y divide-border">
                  {result.failures.map(f => (
                    <div key={f.its_no} className="px-3 py-2 text-xs">
                      <span className="font-mono text-muted-foreground">{f.its_no}</span>
                      <span className="text-foreground"> {f.name}</span>
                      <span className="text-destructive">: {f.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
            >
              Done
            </button>
            {result.failures.length > 0 && (
              <button
                type="button"
                onClick={() => { setResult(null); setProgress(0) }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Retry the {nf.format(result.failures.length)} that failed
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function UsersClient({ initialUsers, sectors, subsectors, categories, mode, currentSearch, currentRole, showAll }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [users, setUsers] = useState(initialUsers)
  const [searchInput, setSearchInput] = useState(currentSearch)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<SystemUser | null>(null)
  const [editRole, setEditRole] = useState<Role>('Mumin')
  const [editActive, setEditActive] = useState(true)
  const [editCredential, setEditCredential] = useState<Credential>('paci')
  const [editSectorIds, setEditSectorIds] = useState<number[]>([])
  const [editSubsectorIds, setEditSubsectorIds] = useState<number[]>([])
  const [editUmoorIds, setEditUmoorIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [resetConfirming, setResetConfirming] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync users when server re-renders with new data
  useEffect(() => { setUsers(initialUsers) }, [initialUsers])
  useEffect(() => { setSearchInput(currentSearch) }, [currentSearch])

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('show_all')
    router.push(`${pathname}?${params.toString()}`)
    setPage(1)
  }, [pathname, router, searchParams])

  function handleSearchChange(val: string) {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParam('search', val), 350)
  }

  function handleRoleChange(val: string) {
    updateParam('role', val)
  }

  function clearAll() {
    setSearchInput('')
    router.push(pathname)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const paginated = useMemo(() => users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [users, page])

  function openEdit(u: SystemUser) {
    setEditing(u)
    setEditRole(u.role as Role)
    setEditActive(u.is_active)
    setEditCredential(toCredential(u.login_credential))
    setEditSectorIds(u.sector.map(s => s.sector_id))
    setEditSubsectorIds(u.subsector.map(s => s.subsector_id))
    setEditUmoorIds((u.umoor ?? []).map(s => s.category_id))
    setSaveError('')
    setResetConfirming(false)
    setResetError('')
  }

  function closeEdit() {
    setEditing(null)
    setSaveError('')
    setResetConfirming(false)
    setResetError('')
  }

  async function handleResetCredential() {
    if (!editing) return
    setResetBusy(true)
    setResetError('')
    try {
      const res = await fetch(`/api/admin/users/${editing.its_no}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_to_default_credential: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setResetError(data.error ?? 'Could not reset the credential. Nothing was changed.')
        return
      }
      setEditing(prev => prev ? { ...prev, has_custom_password: false } : prev)
      setUsers(prev => prev.map(u => u.its_no === editing.its_no ? { ...u, has_custom_password: false } : u))
      setResetConfirming(false)
    } catch {
      setResetError('Network error. The credential was not reset.')
    } finally {
      setResetBusy(false)
    }
  }

  function toggleSector(id: number) {
    setEditSectorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleSubsector(id: number) {
    setEditSubsectorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleUmoor(id: number) {
    setEditUmoorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setSaveError('')

    const body: Record<string, unknown> = {
      role: editRole,
      is_active: editActive,
      login_credential: editCredential,
    }

    if (editRole === 'Admin' || editRole === 'Masool') {
      body.sector_ids = editSectorIds
      body.subsector_ids = []
    } else if (editRole === 'Musaid') {
      body.subsector_ids = editSubsectorIds
      body.sector_ids = []
    } else {
      body.sector_ids = []
      body.subsector_ids = []
    }

    body.umoor_ids = editRole === 'UmoorCoordinator' ? editUmoorIds : []

    const res = await fetch(`/api/admin/users/${editing.its_no}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setSaveError(data.error ?? 'Save failed')
      setSaving(false)
      return
    }

    const responseData = await res.json()

    setUsers(prev => prev.map(u =>
      u.its_no === editing.its_no
        ? {
            ...u,
            role: editRole,
            is_active: editActive,
            login_credential: editCredential,
            supabase_auth_id: responseData.supabase_auth_id ?? u.supabase_auth_id,
            sector: (editRole === 'Admin' || editRole === 'Masool') ? editSectorIds.map(id => ({ sector_id: id })) : [],
            subsector: editRole === 'Musaid' ? editSubsectorIds.map(id => ({ subsector_id: id })) : [],
            umoor: editRole === 'UmoorCoordinator' ? editUmoorIds.map(id => ({ category_id: id })) : [],
          }
        : u
    ))

    setSaving(false)
    closeEdit()
    router.refresh()
  }

  const handleBulkApplied = useCallback((itsNos: number[], credential: Credential) => {
    if (itsNos.length === 0) return
    const changed = new Set(itsNos)
    setUsers(prev => prev.map(u => changed.has(u.its_no) ? { ...u, login_credential: credential } : u))
  }, [])

  // ── Idle state ──────────────────────────────────────────────────────────────
  if (mode === 'idle') {
    return (
      <div className="space-y-4">
        {/* Search / filter bar */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by name or ITS No…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <select
              value={currentRole}
              onChange={e => handleRoleChange(e.target.value)}
              className="appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Idle prompt */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Search to find members</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Type a name or ITS No, filter by role, or load the full list.
            </p>
            <a
              href="/admin/users?show_all=1"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Users className="w-4 h-4" />
              View All Members
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Loaded state ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Search / filter bar */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-wrap gap-3 items-end mb-4">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name or ITS No…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="relative">
          <select
            value={currentRole}
            onChange={e => handleRoleChange(e.target.value)}
            className="appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
        {(searchInput || currentRole) && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
        {!showAll && (
          <a
            href="/admin/users?show_all=1"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            View All
          </a>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-x-3 gap-y-3">
          <Shield className="w-4 h-4 text-primary flex-shrink-0" />
          <h2 className="font-semibold text-foreground text-sm">
            {nf.format(users.length)} member{users.length !== 1 ? 's' : ''} found
          </h2>
          {users.length > 0 && <BulkCredentialPanel users={users} onApplied={handleBulkApplied} />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className={TH}>Member</th>
                <th className={TH}>Role</th>
                <th className={TH}>Sector / Subsector</th>
                <th className={TH}>Credential</th>
                <th className={TH}>Sign-in</th>
                <th className={`${TH} hidden md:table-cell`}>Last Login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No members found.
                  </td>
                </tr>
              ) : paginated.map(u => {
                const sectorNames = u.sector.map((s: any) => sectors.find(sec => sec.sector_id === s.sector_id)?.sector_name).filter(Boolean)
                const subsectorNames = u.subsector.map((s: any) => subsectors.find(sub => sub.subsector_id === s.subsector_id)?.subsector_name).filter(Boolean)
                const umoorNames = (u.umoor ?? []).map((s: any) => categories.find(c => c.id === s.category_id)?.name).filter(Boolean)
                const assignment = u.role === 'UmoorCoordinator'
                  ? (umoorNames.length > 0 ? umoorNames.join(', ') : '—')
                  : sectorNames.length > 0
                  ? sectorNames.join(', ')
                  : subsectorNames.length > 0
                  ? subsectorNames.join(', ')
                  : '—'
                const credential = toCredential(u.login_credential)

                return (
                  <tr key={u.its_no} className={`transition-colors ${u.is_active ? 'hover:bg-muted/20' : 'bg-muted/25 hover:bg-muted/40'}`}>
                    <td className="px-4 py-3">
                      <MemberIdentity
                        name={u.name}
                        itsNo={u.its_no}
                        size="sm"
                        meta={
                          !u.supabase_auth_id ? (
                            <span className="ml-2 text-[11px] sm:text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                              no login
                            </span>
                          ) : undefined
                        }
                      />
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{assignment}</td>
                    <td className="px-4 py-3">
                      {!u.is_active ? (
                        <span className="text-xs text-muted-foreground" title="Account is disabled, so no credential applies.">
                          Not applicable
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[11px] font-mono uppercase tracking-wider ${
                              credential === 'sabeel' ? 'text-foreground font-semibold' : 'text-muted-foreground'
                            }`}
                            title={CREDENTIAL_HINT[credential]}
                          >
                            {credential === 'sabeel' ? 'Sabeel' : 'PACI'}
                          </span>
                          {u.has_custom_password && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] sm:text-[10px] font-medium text-amber-700"
                              title="This member set their own password. The credential above no longer affects how they sign in."
                            >
                              <KeyRound className="w-2.5 h-2.5" />
                              own password
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <Chip tone="bg-green-100 text-green-700 border-green-200">Allowed</Chip>
                      ) : (
                        <span title="Account is inactive. This member cannot sign in.">
                          <Chip tone="bg-destructive/10 text-destructive border-destructive/20">
                            <Ban className="w-3 h-3 shrink-0" />
                            Blocked
                          </Chip>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(u)}
                        className={`${TOUCH_TARGET} rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors`}
                        title="Edit user"
                        aria-label="Edit user"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, users.length)} of {users.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) closeEdit() }}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          {editing && (
            <>
              <DialogHeader className="mb-5">
                <DialogTitle className="sr-only">{editing.name}</DialogTitle>
                <MemberIdentity name={editing.name} itsNo={editing.its_no} size="md" />
                {!editing.supabase_auth_id && (
                  <p className="text-xs text-amber-600">
                    No login account — one will be created automatically on save.
                  </p>
                )}
              </DialogHeader>

              <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`min-h-11 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border truncate transition-colors ${
                        editRole === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-foreground hover:bg-muted/40'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Account Status</label>
                <div className="flex gap-2">
                  {[true, false].map(active => (
                    <button
                      key={String(active)}
                      type="button"
                      onClick={() => setEditActive(active)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        editActive === active
                          ? active
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : 'bg-gray-100 text-gray-600 border-gray-300'
                          : 'bg-background border-border text-foreground hover:bg-muted/40'
                      }`}
                    >
                      {active ? 'Active' : 'Inactive'}
                    </button>
                  ))}
                </div>
                {!editActive && (
                  <p className="text-xs text-destructive mt-1.5">
                    Inactive members cannot sign in, whichever credential is set below.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Login Credential</label>
                <div className="flex gap-2">
                  {CREDENTIALS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditCredential(c)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        editCredential === c
                          ? 'bg-primary/15 text-foreground border-primary'
                          : 'bg-background border-border text-foreground hover:bg-muted/40'
                      }`}
                    >
                      {CREDENTIAL_LABEL[c]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {CREDENTIAL_HINT[editCredential]}
                </p>
                {editing.has_custom_password && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    This member has already set their own password, so the credential above will not change how they sign in.
                  </p>
                )}
              </div>

              {editing.has_custom_password && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                    Reset to default credential
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Their custom password stops working immediately. They can log back in with their {CREDENTIAL_LABEL[toCredential(editing.login_credential)]} — the default credential shown above.
                  </p>

                  {resetError && (
                    <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mt-2">
                      {resetError}
                    </p>
                  )}

                  {!resetConfirming ? (
                    <button
                      type="button"
                      onClick={() => { setResetConfirming(true); setResetError('') }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to default credential
                    </button>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-foreground">Reset this member&apos;s password?</span>
                      <button
                        type="button"
                        onClick={() => { setResetConfirming(false); setResetError('') }}
                        disabled={resetBusy}
                        className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/40 disabled:opacity-60 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleResetCredential}
                        disabled={resetBusy}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                      >
                        {resetBusy
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Resetting…</>
                          : 'Yes, reset it'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(editRole === 'Admin' || editRole === 'Masool') && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Assigned Sectors</label>
                  <div className="space-y-1.5 bg-muted/30 rounded-lg p-3 border border-border">
                    {sectors.map(s => (
                      <label key={s.sector_id} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={editSectorIds.includes(s.sector_id)}
                          onChange={() => toggleSector(s.sector_id)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-foreground">{s.sector_name}</span>
                      </label>
                    ))}
                    {sectors.length === 0 && <p className="text-xs text-muted-foreground">No sectors found</p>}
                  </div>
                </div>
              )}

              {editRole === 'UmoorCoordinator' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Assigned Umoors</label>
                  <div className="space-y-1.5 bg-muted/30 rounded-lg p-3 border border-border max-h-48 overflow-y-auto">
                    {categories.map(c => (
                      <label key={c.id} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={editUmoorIds.includes(c.id)}
                          onChange={() => toggleUmoor(c.id)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-foreground">{c.name}</span>
                      </label>
                    ))}
                    {categories.length === 0 && <p className="text-xs text-muted-foreground">No umoor categories found</p>}
                  </div>
                  {editUmoorIds.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      No umoor assigned — this coordinator will not see any profile data until at least one umoor is assigned.
                    </p>
                  )}
                </div>
              )}

              {editRole === 'Musaid' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Assigned Subsectors</label>
                  <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border max-h-48 overflow-y-auto">
                    {sectors.map(sec => {
                      const subs = subsectors.filter(s => s.sector_id === sec.sector_id)
                      if (subs.length === 0) return null
                      return (
                        <div key={sec.sector_id}>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">{sec.sector_name}</p>
                          <div className="space-y-1 pl-2">
                            {subs.map(s => (
                              <label key={s.subsector_id} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                                <input
                                  type="checkbox"
                                  checked={editSubsectorIds.includes(s.subsector_id)}
                                  onChange={() => toggleSubsector(s.subsector_id)}
                                  className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm text-foreground">{s.subsector_name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    {subsectors.length === 0 && <p className="text-xs text-muted-foreground">No subsectors found</p>}
                  </div>
                </div>
              )}

              {saveError && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Role changes take effect on the user's next login.
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
