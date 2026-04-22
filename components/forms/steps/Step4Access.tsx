'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { FillerAccess } from '@/lib/types/forms'
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
        onClick={() => onChange(!checked)}
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

export function Step4Access({ draft, update, onNext, onBack }: Props) {
  const [masools, setMasools] = useState<MuminOption[]>([])
  const [musaids, setMusaids] = useState<MuminOption[]>([])

  const access = draft.filler_access ?? { fillers: [] }
  const fillers = access.fillers

  const hasRoleMasool = fillers.some((f) => f.type === 'role' && f.value === 'Masool')
  const hasRoleMusaid = fillers.some((f) => f.type === 'role' && f.value === 'Musaid')
  const hasSelf = fillers.some((f) => f.type === 'self')
  const specificMasool = (fillers.find((f) => f.type === 'specific_masool') as { type: 'specific_masool'; value: number[] } | undefined)?.value ?? []
  const specificMusaid = (fillers.find((f) => f.type === 'specific_musaid') as { type: 'specific_musaid'; value: number[] } | undefined)?.value ?? []

  useEffect(() => {
    const supabase = createClient()
    supabase.from('mumin').select('its_no, name').eq('role', 'Masool').then(({ data }) =>
      setMasools((data ?? []).map((d) => ({ its_no: d.its_no as number, name: d.name })))
    )
    supabase.from('mumin').select('its_no, name').eq('role', 'Musaid').then(({ data }) =>
      setMusaids((data ?? []).map((d) => ({ its_no: d.its_no as number, name: d.name })))
    )
  }, [])

  function buildFillers(patch: {
    roleMasool?: boolean
    roleMusaid?: boolean
    self?: boolean
    specMasool?: number[]
    specMusaid?: number[]
  }): FillerAccess {
    const rm = patch.roleMasool ?? hasRoleMasool
    const rmu = patch.roleMusaid ?? hasRoleMusaid
    const sf = patch.self ?? hasSelf
    const sm = patch.specMasool ?? specificMasool
    const smu = patch.specMusaid ?? specificMusaid

    const next: FillerAccess['fillers'] = []
    if (rm) next.push({ type: 'role', value: 'Masool' })
    if (rmu) next.push({ type: 'role', value: 'Musaid' })
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

      {/* Footer */}
      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Next: Review</Button>
      </div>
    </div>
  )
}




// 'use client'

// import { useEffect, useState } from 'react'
// import { Label } from '@/components/ui/label'
// import { Button } from '@/components/ui/button'
// import { createClient } from '@/lib/supabase/client'
// import type { FillerAccess } from '@/lib/types/forms'
// import type { FormDraft } from '../FormBuilder'

// interface MuminOption { its_no: string; name: string }

// interface Props {
//   draft: Partial<FormDraft>
//   update: (patch: Partial<FormDraft>) => void
//   onNext: () => void
//   onBack: () => void
// }

// function CheckItem({ id, label, checked, onChange, sublabel }: {
//   id: string; label: string; checked: boolean; onChange: (v: boolean) => void; sublabel?: string
// }) {
//   return (
//     <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer group">
//       <div
//         className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
//           checked ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60'
//         }`}
//         onClick={() => onChange(!checked)}
//       >
//         {checked && (
//           <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
//             <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//           </svg>
//         )}
//       </div>
//       <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
//       <div>
//         <span className="text-sm text-foreground">{label}</span>
//         {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
//       </div>
//     </label>
//   )
// }

// function PersonPicker({ label, people, selected, onChange }: {
//   label: string
//   people: MuminOption[]
//   selected: string[]
//   onChange: (v: string[]) => void
// }) {
//   const [search, setSearch] = useState('')
//   const filtered = people.filter(
//     (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.its_no.includes(search)
//   )

//   function toggle(its: string) {
//     onChange(selected.includes(its) ? selected.filter((x) => x !== its) : [...selected, its])
//   }

//   return (
//     <div className="space-y-2 ml-6">
//       <Label className="text-xs text-muted-foreground">{label}</Label>
//       <input
//         type="text"
//         placeholder="Search by name or ITS..."
//         value={search}
//         onChange={(e) => setSearch(e.target.value)}
//         className="flex h-8 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
//       />
//       {selected.length > 0 && (
//         <div className="flex flex-wrap gap-1.5 mt-1">
//           {selected.map((its) => {
//             const person = people.find((p) => p.its_no === its)
//             return (
//               <span
//                 key={its}
//                 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
//               >
//                 {person?.name ?? its}
//                 <button type="button" onClick={() => toggle(its)} className="hover:text-destructive transition-colors">
//                   ×
//                 </button>
//               </span>
//             )
//           })}
//         </div>
//       )}
//       {search && (
//         <div className="border border-border rounded-lg bg-background max-h-40 overflow-y-auto divide-y divide-border">
//           {filtered.length === 0 && (
//             <p className="text-xs text-muted-foreground p-2 text-center">No results</p>
//           )}
//           {filtered.map((p) => (
//             <button
//               key={p.its_no}
//               type="button"
//               onClick={() => toggle(p.its_no)}
//               className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors hover:bg-muted/50 ${
//                 selected.includes(p.its_no) ? 'text-primary font-medium' : 'text-foreground'
//               }`}
//             >
//               <span>{p.name}</span>
//               <span className="text-muted-foreground">{p.its_no}</span>
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   )
// }

// export function Step4Access({ draft, update, onNext, onBack }: Props) {
//   const [masools, setMasools] = useState<MuminOption[]>([])
//   const [musaids, setMusaids] = useState<MuminOption[]>([])

//   const access = draft.filler_access ?? { fillers: [] }
//   const fillers = access.fillers

//   const hasRoleMasool = fillers.some((f) => f.type === 'role' && f.value === 'Masool')
//   const hasRoleMusaid = fillers.some((f) => f.type === 'role' && f.value === 'Musaid')
//   const hasSelf = fillers.some((f) => f.type === 'self')
//   const specificMasool = (fillers.find((f) => f.type === 'specific_masool') as { type: 'specific_masool'; value: string[] } | undefined)?.value ?? []
//   const specificMusaid = (fillers.find((f) => f.type === 'specific_musaid') as { type: 'specific_musaid'; value: string[] } | undefined)?.value ?? []

//   useEffect(() => {
//     const supabase = createClient()
//     supabase.from('mumin').select('its_no, name').eq('role', 'Masool').then(({ data }) =>
//       setMasools((data ?? []).map((d) => ({ its_no: String(d.its_no), name: d.name })))
//     )
//     supabase.from('mumin').select('its_no, name').eq('role', 'Musaid').then(({ data }) =>
//       setMusaids((data ?? []).map((d) => ({ its_no: String(d.its_no), name: d.name })))
//     )
//   }, [])

//   function buildFillers(patch: {
//     roleMasool?: boolean
//     roleMusaid?: boolean
//     self?: boolean
//     specMasool?: string[]
//     specMusaid?: string[]
//   }): FillerAccess {
//     const rm = patch.roleMasool ?? hasRoleMasool
//     const rmu = patch.roleMusaid ?? hasRoleMusaid
//     const sf = patch.self ?? hasSelf
//     const sm = patch.specMasool ?? specificMasool
//     const smu = patch.specMusaid ?? specificMusaid

//     const next: FillerAccess['fillers'] = []
//     if (rm) next.push({ type: 'role', value: 'Masool' })
//     if (rmu) next.push({ type: 'role', value: 'Musaid' })
//     if (sm.length > 0) next.push({ type: 'specific_masool', value: sm })
//     if (smu.length > 0) next.push({ type: 'specific_musaid', value: smu })
//     if (sf) next.push({ type: 'self' })

//     return { fillers: next }
//   }

//   return (
//     <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
//       <div>
//         <h2 className="text-base font-semibold text-foreground">Access Control</h2>
//         <p className="text-sm text-muted-foreground mt-0.5">Who can fill in this form?</p>
//       </div>

//       <div className="space-y-4">
//         {/* By Role */}
//         <div className="space-y-2">
//           <Label className="text-xs uppercase tracking-wider text-muted-foreground">By Role</Label>
//           <div className="space-y-2.5 p-3.5 border border-border rounded-lg bg-background">
//             <CheckItem
//               id="role-masool"
//               label="All Masools"
//               sublabel="Every user with the Masool role can fill this form"
//               checked={hasRoleMasool}
//               onChange={(v) => update({ filler_access: buildFillers({ roleMasool: v }) })}
//             />
//             <CheckItem
//               id="role-musaid"
//               label="All Musaids"
//               sublabel="Every user with the Musaid role can fill this form"
//               checked={hasRoleMusaid}
//               onChange={(v) => update({ filler_access: buildFillers({ roleMusaid: v }) })}
//             />
//           </div>
//         </div>

//         {/* Specific people */}
//         <div className="space-y-2">
//           <Label className="text-xs uppercase tracking-wider text-muted-foreground">Specific People</Label>
//           <div className="space-y-3 p-3.5 border border-border rounded-lg bg-background">
//             <PersonPicker
//               label="Specific Masools"
//               people={masools}
//               selected={specificMasool}
//               onChange={(v) => update({ filler_access: buildFillers({ specMasool: v }) })}
//             />
//             <div className="border-t border-border" />
//             <PersonPicker
//               label="Specific Musaids"
//               people={musaids}
//               selected={specificMusaid}
//               onChange={(v) => update({ filler_access: buildFillers({ specMusaid: v }) })}
//             />
//           </div>
//         </div>

//         {/* Self-fill */}
//         <div className="space-y-2">
//           <Label className="text-xs uppercase tracking-wider text-muted-foreground">Self-fill</Label>
//           <div className="p-3.5 border border-border rounded-lg bg-background">
//             <CheckItem
//               id="self-fill"
//               label="Allow members to fill their own data"
//               sublabel="Members can access and fill this form for themselves"
//               checked={hasSelf}
//               onChange={(v) => update({ filler_access: buildFillers({ self: v }) })}
//             />
//           </div>
//         </div>
//       </div>

//       {fillers.length === 0 && (
//         <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
//           No one has been given access yet. You can still proceed and configure access later.
//         </p>
//       )}

//       {/* Footer */}
//       <div className="flex justify-between pt-2 border-t border-border">
//         <Button variant="outline" onClick={onBack}>Back</Button>
//         <Button onClick={onNext}>Next: Review</Button>
//       </div>
//     </div>
//   )
// }
