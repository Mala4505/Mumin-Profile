'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Pencil, X, Loader2, Shield, Search, ChevronLeft, ChevronRight, ChevronDown, Users } from 'lucide-react'

interface SystemUser {
  its_no: number
  name: string
  role: string
  is_active: boolean
  last_login_at: string | null
  supabase_auth_id: string | null
  sector: Array<{ sector_id: number }>
  subsector: Array<{ subsector_id: number }>
}

interface Sector { sector_id: number; sector_name: string }
interface Subsector { subsector_id: number; sector_id: number; subsector_name: string }

interface Props {
  initialUsers: SystemUser[]
  sectors: Sector[]
  subsectors: Subsector[]
  mode: 'idle' | 'loaded'
  currentSearch: string
  currentRole: string
  showAll: boolean
}

const ROLES = ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'Mumin'] as const
type Role = typeof ROLES[number]

const ALL_ROLES = ['', ...ROLES] as const

const PAGE_SIZE = 50

const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: 'bg-purple-100 text-purple-700',
  Admin: 'bg-amber-100 text-amber-700',
  Masool: 'bg-primary/10 text-primary',
  Musaid: 'bg-blue-100 text-blue-700',
  Mumin: 'bg-muted text-muted-foreground',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-muted text-muted-foreground'}`}>
      {role}
    </span>
  )
}

export function UsersClient({ initialUsers, sectors, subsectors, mode, currentSearch, currentRole, showAll }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [users, setUsers] = useState(initialUsers)
  const [searchInput, setSearchInput] = useState(currentSearch)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<SystemUser | null>(null)
  const [editRole, setEditRole] = useState<Role>('Mumin')
  const [editActive, setEditActive] = useState(true)
  const [editSectorIds, setEditSectorIds] = useState<number[]>([])
  const [editSubsectorIds, setEditSubsectorIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
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
    setEditSectorIds(u.sector.map(s => s.sector_id))
    setEditSubsectorIds(u.subsector.map(s => s.subsector_id))
    setSaveError('')
  }

  function closeEdit() {
    setEditing(null)
    setSaveError('')
  }

  function toggleSector(id: number) {
    setEditSectorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleSubsector(id: number) {
    setEditSubsectorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setSaveError('')

    const body: Record<string, unknown> = { role: editRole, is_active: editActive }

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
            supabase_auth_id: responseData.supabase_auth_id ?? u.supabase_auth_id,
            sector: (editRole === 'Admin' || editRole === 'Masool') ? editSectorIds.map(id => ({ sector_id: id })) : [],
            subsector: editRole === 'Musaid' ? editSubsectorIds.map(id => ({ subsector_id: id })) : [],
          }
        : u
    ))

    setSaving(false)
    closeEdit()
    router.refresh()
  }

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
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary flex-shrink-0" />
          <h2 className="font-semibold text-foreground text-sm">
            {users.length} member{users.length !== 1 ? 's' : ''} found
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">ITS No</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Sector / Subsector</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">Last Login</th>
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
                const assignment = sectorNames.length > 0
                  ? sectorNames.join(', ')
                  : subsectorNames.length > 0
                  ? subsectorNames.join(', ')
                  : '—'

                return (
                  <tr key={u.its_no} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.its_no}</td>
                    <td className="px-4 py-3 font-medium">
                      {u.name}
                      {!u.supabase_auth_id && (
                        <span className="ml-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">no login</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{assignment}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Pending'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        title="Edit user"
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
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-bold text-foreground text-lg">{editing.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">ITS {editing.its_no}</p>
                {!editing.supabase_auth_id && (
                  <p className="text-xs text-amber-600 mt-1">
                    No login account — one will be created automatically on save.
                  </p>
                )}
              </div>
              <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
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
              </div>

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
          </div>
        </div>
      )}
    </>
  )
}
