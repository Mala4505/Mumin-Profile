'use client'

import { useState } from 'react'
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

interface EditMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itsNo: number
  initial: Partial<Tier1Fields>
  onSaved?: () => void
}

export function EditMemberModal({
  open,
  onOpenChange,
  itsNo,
  initial,
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

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof Tier1Fields>(key: K, value: Tier1Fields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
