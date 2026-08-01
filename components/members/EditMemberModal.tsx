'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

/**
 * Raw <select>s were `h-9` while the sibling `<Input>`s were `h-10` and both sat
 * under the 44px touch minimum. `INPUT_CLASS` re-heights the shadcn Input so the
 * whole form is one row height: 44px on phones, 40px from `sm:` up.
 */
const SELECT_CLASS =
  'w-full border border-border rounded-lg h-11 sm:h-10 px-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'

const INPUT_CLASS = 'h-11 sm:h-10'

// Tier-1 fields only — structural fields go through change request
interface Tier1Fields {
  name: string
  gender: 'M' | 'F' | ''
  date_of_birth: string
  balig_status: 'Balig' | 'Ghair Balig' | ''
  phone: string
  alternate_phone: string
  email: string
  status: string
  notes: string
}

export interface AddressFields {
  subsector_id: string
  building_name: string
  floor_no: string
  flat_no: string
  paci_no: string  // read-only display only — not sent to API
}

interface EditMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itsNo: number
  initial: Partial<Tier1Fields>
  initialAddress?: AddressFields
  onSaved?: () => void
}

interface SubsectorOption {
  subsector_id: number
  subsector_name: string
}

interface BuildingSuggestion {
  building_id: string
  building_name: string
  subsector_id: number
  subsector_name: string
}

export function EditMemberModal({
  open,
  onOpenChange,
  itsNo,
  initial,
  initialAddress,
  onSaved,
}: EditMemberModalProps) {
  const [form, setForm] = useState<Tier1Fields>({
    name: initial.name ?? '',
    gender: initial.gender ?? '',
    date_of_birth: initial.date_of_birth ?? '',
    balig_status: initial.balig_status ?? '',
    phone: initial.phone ?? '',
    alternate_phone: initial.alternate_phone ?? '',
    email: initial.email ?? '',
    status: initial.status ?? 'active',
    notes: initial.notes ?? '',
  })

  const [address, setAddress] = useState<AddressFields>({
    subsector_id: initialAddress?.subsector_id ?? '',
    building_name: initialAddress?.building_name ?? '',
    floor_no: initialAddress?.floor_no ?? '',
    flat_no: initialAddress?.flat_no ?? '',
    paci_no: initialAddress?.paci_no ?? '',
  })

  const [subsectors, setSubsectors] = useState<SubsectorOption[]>([])
  const [buildingSuggestions, setBuildingSuggestions] = useState<BuildingSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionRef = useRef<HTMLDivElement>(null)

  // Fetch subsectors on open (only needed when address section is shown)
  useEffect(() => {
    if (!open || !initialAddress) return
    fetch('/api/members/filters')
      .then((r) => r.json())
      .then((d) => {
        const seen = new Set<number>()
        const unique: SubsectorOption[] = []
        for (const s of d.subsectors ?? []) {
          if (!seen.has(s.subsector_id)) {
            seen.add(s.subsector_id)
            unique.push({ subsector_id: s.subsector_id, subsector_name: s.subsector_name })
          }
        }
        setSubsectors(unique)
      })
      .catch(() => {})
  }, [open, initialAddress])

  // Close suggestions on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function set<K extends keyof Tier1Fields>(key: K, value: Tier1Fields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setAddr<K extends keyof AddressFields>(key: K, value: string) {
    setAddress((prev) => ({ ...prev, [key]: value }))
  }

  function onBuildingInput(value: string) {
    setAddr('building_name', value)
    setShowSuggestions(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setBuildingSuggestions([]); return }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/buildings?q=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((d) => { setBuildingSuggestions(d.buildings ?? []); setShowSuggestions(true) })
        .catch(() => {})
    }, 250)
  }

  function pickBuilding(b: BuildingSuggestion) {
    setAddress((prev) => ({
      ...prev,
      building_name: b.building_name,
      subsector_id: String(b.subsector_id),
    }))
    setBuildingSuggestions([])
    setShowSuggestions(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      // Save Tier-1 fields
      const res = await fetch(`/api/members/${itsNo}/core`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || undefined,
          gender: form.gender || undefined,
          date_of_birth: form.date_of_birth || null,
          balig_status: form.balig_status || undefined,
          phone: form.phone || null,
          alternate_phone: form.alternate_phone || null,
          email: form.email || null,
          status: form.status || undefined,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Save failed')
      }

      // Save address if the section is shown and required fields are filled
      if (initialAddress && address.building_name.trim() && address.subsector_id) {
        const addrRes = await fetch(`/api/members/${itsNo}/address`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            building_name: address.building_name.trim(),
            subsector_id: parseInt(address.subsector_id, 10),
            floor_no: address.floor_no.trim() || undefined,
            flat_no: address.flat_no.trim() || undefined,
          }),
        })
        if (!addrRes.ok) {
          const d = await addrRes.json()
          throw new Error(d.error ?? 'Address save failed')
        }
      }

      onOpenChange(false)
      onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Member — ITS {itsNo}</DialogTitle>
        </DialogHeader>

        {/* No inner scroll cap — DialogContent already caps at 100dvh-2rem and scrolls. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
          {/* Name */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="em-name">Full Name</Label>
            <Input id="em-name" className={INPUT_CLASS} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label htmlFor="em-gender">Gender</Label>
            <select
              id="em-gender"
              value={form.gender}
              onChange={(e) => set('gender', e.target.value as 'M' | 'F')}
              className={SELECT_CLASS}
            >
              <option value="">— select —</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          {/* Balig Status */}
          <div className="space-y-1.5">
            <Label htmlFor="em-balig">Balig Status</Label>
            <select
              id="em-balig"
              value={form.balig_status}
              onChange={(e) => set('balig_status', e.target.value as 'Balig' | 'Ghair Balig')}
              className={SELECT_CLASS}
            >
              <option value="">— select —</option>
              <option value="Balig">Balig</option>
              <option value="Ghair Balig">Ghair Balig</option>
            </select>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label htmlFor="em-dob">Date of Birth</Label>
            <Input id="em-dob" className={INPUT_CLASS} type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="em-status">Status</Label>
            <select
              id="em-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="active">Active</option>
              <option value="deceased">Deceased</option>
              <option value="relocated">Relocated</option>
              <option value="left_community">Left Community</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="em-phone">Phone</Label>
            <Input id="em-phone" className={INPUT_CLASS} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>

          {/* Alt Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="em-altphone">Alt. Phone</Label>
            <Input id="em-altphone" className={INPUT_CLASS} type="tel" value={form.alternate_phone} onChange={(e) => set('alternate_phone', e.target.value)} />
          </div>

          {/* Email */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="em-email">Email</Label>
            <Input id="em-email" className={INPUT_CLASS} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="em-notes">Notes</Label>
            <textarea
              id="em-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {/* Address section — only shown when initialAddress is provided (SuperAdmin from profile view) */}
          {initialAddress && (
            <>
              <div className="sm:col-span-2 border-t border-border/60 pt-3 mt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Address</p>
              </div>

              {/* Subsector */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="em-subsector">Subsector</Label>
                <select
                  id="em-subsector"
                  value={address.subsector_id}
                  onChange={(e) => setAddr('subsector_id', e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">— select subsector —</option>
                  {subsectors.map((s) => (
                    <option key={s.subsector_id} value={String(s.subsector_id)}>
                      {s.subsector_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Building autocomplete */}
              <div className="sm:col-span-2 space-y-1.5 relative" ref={suggestionRef}>
                <Label htmlFor="em-building">Building</Label>
                <Input
                  id="em-building"
                  className={INPUT_CLASS}
                  value={address.building_name}
                  onChange={(e) => onBuildingInput(e.target.value)}
                  onFocus={() => address.building_name && setShowSuggestions(true)}
                  placeholder="Type to search existing buildings…"
                  autoComplete="off"
                />
                {showSuggestions && buildingSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                    {buildingSuggestions.map((b) => (
                      <button
                        key={b.building_id}
                        type="button"
                        onMouseDown={() => pickBuilding(b)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0"
                      >
                        <span className="font-medium">{b.building_name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">— {b.subsector_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showSuggestions && address.building_name.trim() && buildingSuggestions.length === 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg px-3 py-2 text-xs text-muted-foreground">
                    No existing buildings match — a new building will be created on save.
                  </div>
                )}
              </div>

              {/* Floor & Flat */}
              <div className="space-y-1.5">
                <Label htmlFor="em-floor">Floor No</Label>
                <Input id="em-floor" className={INPUT_CLASS} value={address.floor_no} onChange={(e) => setAddr('floor_no', e.target.value)} placeholder="e.g. 3" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="em-flat">Flat No</Label>
                <Input id="em-flat" className={INPUT_CLASS} value={address.flat_no} onChange={(e) => setAddr('flat_no', e.target.value)} placeholder="e.g. 12" />
              </div>

              {/* PACI No — read-only, cannot be changed via this form */}
              {address.paci_no && (
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-muted-foreground">PACI No</Label>
                  <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border/60">
                    {address.paci_no} <span className="text-xs">(cannot be changed here)</span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving…</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
