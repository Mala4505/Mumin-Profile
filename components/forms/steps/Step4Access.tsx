'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { FillerAccess } from '@/lib/types/forms'
import type { Role } from '@/lib/types/app'
import type { FormDraft } from '../FormBuilder'

interface MuminOption { its_no: number; name: string }

interface Props {
  draft: Partial<FormDraft>
  update: (patch: Partial<FormDraft>) => void
  onNext: () => void
  onBack: () => void
}

function CheckItem({ id, label, checked, onChange, sublabel }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void; sublabel?: string
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer group">
      <div
        className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
          checked ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60'
        }`}
        onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div>
        <span className="text-sm text-foreground">{label}</span>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </label>
  )
}

function PersonPicker({ label, people, selected, onChange }: {
  label: string
  people: MuminOption[]
  selected: number[]
  onChange: (v: number[]) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = people.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || String(p.its_no).includes(search)
  )

  function toggle(its: number) {
    onChange(selected.includes(its) ? selected.filter((x) => x !== its) : [...selected, its])
  }

  return (
    <div className="space-y-2 ml-6">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <input
        type="text"
        placeholder="Search by name or ITS..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex h-8 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {selected.map((its) => {
            const person = people.find((p) => p.its_no === its)
            return (
              <span
                key={its}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
              >
                {person?.name ?? its}
                <button type="button" onClick={() => toggle(its)} className="hover:text-destructive transition-colors">
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}
      {search && (
        <div className="border border-border rounded-lg bg-background max-h-40 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground p-2 text-center">No results</p>
          )}
          {filtered.map((p) => (
            <button
              key={p.its_no}
              type="button"
              onClick={() => toggle(p.its_no)}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors hover:bg-muted/50 ${
                selected.includes(p.its_no) ? 'text-primary font-medium' : 'text-foreground'
              }`}
            >
              <span>{p.name}</span>
              <span className="text-muted-foreground">{p.its_no}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const VIEWER_ROLES: { role: Role; label: string; desc: string; color: string }[] = [
  { role: 'Mumin',  label: 'Mumin',  desc: 'Members',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { role: 'Masool', label: 'Masool', desc: 'Sector',       color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { role: 'Musaid', label: 'Musaid', desc: 'Sub-sector',    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
]

const ALL_VIEWER_ROLES: Role[] = ['Mumin', 'Masool', 'Musaid']

export function Step4Access({ draft, update, onNext, onBack }: Props) {
  const [masools, setMasools] = useState<MuminOption[]>([])
  const [musaids, setMusaids] = useState<MuminOption[]>([])

  // null in draft = all can view (default open); otherwise it's an explicit list
  const [responseViewerRoles, setResponseViewerRoles] = useState<Role[]>(
    draft.response_viewer_roles === null || draft.response_viewer_roles === undefined
      ? [...ALL_VIEWER_ROLES]
      : (draft.response_viewer_roles as Role[])
  )

  const access = draft.filler_access ?? { fillers: [] }
  const fillers = access.fillers

  const hasRoleMasool = fillers.some((f) => f.type === 'role' && f.value === 'Masool')
  const hasRoleMusaid = fillers.some((f) => f.type === 'role' && f.value === 'Musaid')
  const hasRoleSuperAdmin = fillers.some((f) => f.type === 'role' && f.value === 'SuperAdmin')
  const hasRoleAdmin = fillers.some((f) => f.type === 'role' && f.value === 'Admin')
  const hasSelf = fillers.some((f) => f.type === 'self')
  const hasHof = fillers.some((f) => f.type === 'hof')
  const specificMasool = (fillers.find((f) => f.type === 'specific_masool') as { type: 'specific_masool'; value: number[] } | undefined)?.value ?? []
  const specificMusaid = (fillers.find((f) => f.type === 'specific_musaid') as { type: 'specific_musaid'; value: number[] } | undefined)?.value ?? []

  useEffect(() => {
    fetch('/api/members/by-role?role=Masool')
      .then((res) => res.json())
      .then((json) => setMasools((json.members ?? []) as MuminOption[]))
    fetch('/api/members/by-role?role=Musaid')
      .then((res) => res.json())
      .then((json) => setMusaids((json.members ?? []) as MuminOption[]))
  }, [])

  function buildFillers(patch: {
    roleMasool?: boolean
    roleMusaid?: boolean
    roleSuperAdmin?: boolean
    roleAdmin?: boolean
    self?: boolean
    hof?: boolean
    specMasool?: number[]
    specMusaid?: number[]
  }): FillerAccess {
    const rm = patch.roleMasool ?? hasRoleMasool
    const rmu = patch.roleMusaid ?? hasRoleMusaid
    const rsa = patch.roleSuperAdmin ?? hasRoleSuperAdmin
    const ra = patch.roleAdmin ?? hasRoleAdmin
    const sf = patch.self ?? hasSelf
    const hof = patch.hof ?? hasHof
    const sm = patch.specMasool ?? specificMasool
    const smu = patch.specMusaid ?? specificMusaid

    const next: FillerAccess['fillers'] = []
    if (rsa) next.push({ type: 'role', value: 'SuperAdmin' })
    if (ra) next.push({ type: 'role', value: 'Admin' })
    if (rm) next.push({ type: 'role', value: 'Masool' })
    if (rmu) next.push({ type: 'role', value: 'Musaid' })
    if (hof) next.push({ type: 'hof' })
    if (sm.length > 0) next.push({ type: 'specific_masool', value: sm.map(String) })
    if (smu.length > 0) next.push({ type: 'specific_musaid', value: smu.map(String) })
    if (sf) next.push({ type: 'self' })

    return { fillers: next }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Access Control</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Who can fill in this form?</p>
      </div>

      <div className="space-y-4">
        {/* By Role */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">By Role</Label>
          <div className="space-y-2.5 p-3.5 border border-border rounded-lg bg-background">
            <CheckItem
              id="role-superadmin"
              label="SuperAdmin"
              sublabel="SuperAdmin can fill this form (bulk fill for others, or self via user mode)"
              checked={hasRoleSuperAdmin}
              onChange={(v) => update({ filler_access: buildFillers({ roleSuperAdmin: v }) })}
            />
            <CheckItem
              id="role-admin"
              label="Admin"
              sublabel="Admin users can fill this form"
              checked={hasRoleAdmin}
              onChange={(v) => update({ filler_access: buildFillers({ roleAdmin: v }) })}
            />
            <CheckItem
              id="role-masool"
              label="All Masools"
              sublabel="Every user with the Masool role can fill this form"
              checked={hasRoleMasool}
              onChange={(v) => update({ filler_access: buildFillers({ roleMasool: v }) })}
            />
            <CheckItem
              id="role-musaid"
              label="All Musaids"
              sublabel="Every user with the Musaid role can fill this form"
              checked={hasRoleMusaid}
              onChange={(v) => update({ filler_access: buildFillers({ roleMusaid: v }) })}
            />
            <CheckItem
              id="hof-fill"
              label="Heads of Family (HOF)"
              sublabel="Family heads can fill this form for their family members"
              checked={hasHof}
              onChange={(v) => update({ filler_access: buildFillers({ hof: v }) })}
            />
          </div>
        </div>

        {/* Specific people */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Specific People</Label>
          <div className="space-y-3 p-3.5 border border-border rounded-lg bg-background">
            <PersonPicker
              label="Specific Masools"
              people={masools}
              selected={specificMasool}
              onChange={(v) => update({ filler_access: buildFillers({ specMasool: v }) })}
            />
            <div className="border-t border-border" />
            <PersonPicker
              label="Specific Musaids"
              people={musaids}
              selected={specificMusaid}
              onChange={(v) => update({ filler_access: buildFillers({ specMusaid: v }) })}
            />
          </div>
        </div>

        {/* Self-fill */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Self-fill</Label>
          <div className="p-3.5 border border-border rounded-lg bg-background">
            <CheckItem
              id="self-fill"
              label="Allow members to fill their own data"
              sublabel="Members can access and fill this form for themselves"
              checked={hasSelf}
              onChange={(v) => update({ filler_access: buildFillers({ self: v }) })}
            />
          </div>
        </div>
      </div>

      {fillers.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
          No one has been given access yet. You can still proceed and configure access later.
        </p>
      )}

      {/* Response Visibility */}
      <div className="space-y-2">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Who can view responses</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Admin and SuperAdmin always have access.</p>
        </div>
        <div className="space-y-2 p-3.5 border border-border rounded-lg bg-background">
          {VIEWER_ROLES.map(({ role, label, desc, color }) => {
            const isOn = responseViewerRoles.includes(role)
            return (
              <div key={role} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[11px] font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                    {label.slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = isOn
                      ? responseViewerRoles.filter(r => r !== role)
                      : [...responseViewerRoles, role]
                    setResponseViewerRoles(next)
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 ${
                    isOn ? 'bg-primary' : 'bg-muted'
                  }`}
                  style={{ transition: 'background cubic-bezier(0.23,1,0.32,1) 200ms' }}
                  role="switch"
                  aria-checked={isOn}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                      isOn ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                    style={{ transition: 'transform cubic-bezier(0.23,1,0.32,1) 200ms' }}
                  />
                </button>
              </div>
            )
          })}
        </div>
        {/* Live summary */}
        <p className="text-xs text-muted-foreground px-1">
          {responseViewerRoles.length === 0
            ? 'No roles can view responses (staff only).'
            : responseViewerRoles.length === ALL_VIEWER_ROLES.length
            ? 'Responses visible to all roles.'
            : `Responses visible to: ${responseViewerRoles.join(', ')}.`}
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={() => {
          // Save null if all roles selected (open/default), else save explicit array
          const toSave: Role[] | null =
            responseViewerRoles.length === ALL_VIEWER_ROLES.length ? null : responseViewerRoles
          update({ response_viewer_roles: toSave })
          onNext()
        }}>Next: Review</Button>
      </div>
    </div>
  )
}