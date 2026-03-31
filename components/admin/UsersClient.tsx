'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, Shield } from 'lucide-react'

interface SystemUser {
  its_no: number
  name: string
  role: string
  is_active: boolean
  last_login_at: string | null
  sector: Array<{ sector_id: number }>
  subsector: Array<{ subsector_id: number }>
}

interface Sector { sector_id: number; sector_name: string }
interface Subsector { subsector_id: number; sector_id: number; subsector_name: string }

interface Props {
  initialUsers: SystemUser[]
  sectors: Sector[]
  subsectors: Subsector[]
}

const ROLES = ['SuperAdmin', 'Admin', 'Masool', 'Musaid', 'Mumin'] as const
type Role = typeof ROLES[number]

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

export function UsersClient({ initialUsers, sectors, subsectors }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [editing, setEditing] = useState<SystemUser | null>(null)
  const [editRole, setEditRole] = useState<Role>('Mumin')
  const [editActive, setEditActive] = useState(true)
  const [editSectorIds, setEditSectorIds] = useState<number[]>([])
  const [editSubsectorIds, setEditSubsectorIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

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

    const body: Record<string, unknown> = {
      role: editRole,
      is_active: editActive,
    }

    // Only send assignments relevant to the new role
    if (editRole === 'Admin' || editRole === 'Masool') {
      body.sector_ids = editSectorIds
      body.subsector_ids = [] // clear subsectors
    } else if (editRole === 'Musaid') {
      body.subsector_ids = editSubsectorIds
      body.sector_ids = [] // clear sectors
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

    // Update local state
    setUsers(prev => prev.map(u =>
      u.its_no === editing.its_no
        ? {
            ...u,
            role: editRole,
            is_active: editActive,
            sector: (editRole === 'Admin' || editRole === 'Masool') ? editSectorIds.map(id => ({ sector_id: id })) : [],
            subsector: editRole === 'Musaid' ? editSubsectorIds.map(id => ({ subsector_id: id })) : [],
          }
        : u
    ))

    setSaving(false)
    closeEdit()
    router.refresh()
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            System Users ({users.length})
          </h2>
          <span className="text-xs text-muted-foreground">Mumineen with system accounts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">ITS No</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Role</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Sector / Subsector</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Last Login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(u => {
                const sectorNames = u.sector.map(s => sectors.find(sec => sec.sector_id === s.sector_id)?.sector_name).filter(Boolean)
                const subsectorNames = u.subsector.map(s => subsectors.find(sub => sub.subsector_id === s.subsector_id)?.subsector_name).filter(Boolean)
                const assignment = sectorNames.length > 0
                  ? sectorNames.join(', ')
                  : subsectorNames.length > 0
                  ? subsectorNames.join(', ')
                  : '—'

                return (
                  <tr key={u.its_no} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.its_no}</td>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{assignment}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
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
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-bold text-foreground text-lg">{editing.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">ITS {editing.its_no}</p>
              </div>
              <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Role */}
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

              {/* Active status */}
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

              {/* Sector assignments — Admin and Masool */}
              {(editRole === 'Admin' || editRole === 'Masool') && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Assigned Sectors
                  </label>
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

              {/* Subsector assignments — Musaid only */}
              {editRole === 'Musaid' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Assigned Subsectors
                  </label>
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

              {/* Error */}
              {saveError && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Role changes take effect on the user's next login.
              </p>

              {/* Actions */}
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
