'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { FormDraft } from '../FormBuilder'

interface SectorRow { sector_id: number; sector_name: string }
interface SubsectorRow { subsector_id: number; subsector_name: string; sector_id: number }

interface Props {
  draft: Partial<FormDraft>
  update: (patch: Partial<FormDraft>) => void
  onNext: () => void
  onBack: () => void
}

const inputClass =
  'flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors'

function CheckItem({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 cursor-pointer group">
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60'
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
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}

export function Step2Audience({ draft, update, onNext, onBack }: Props) {
  const [sectors, setSectors] = useState<SectorRow[]>([])
  const [subsectors, setSubsectors] = useState<SubsectorRow[]>([])

  const filters = draft.audience_filters ?? {}
  const isAll = filters.all !== false

  useEffect(() => {
    const supabase = createClient()
    supabase.from('sector').select('sector_id, sector_name').then(({ data }) => setSectors(data ?? []))
    supabase.from('subsector').select('subsector_id, subsector_name, sector_id').then(({ data }) => setSubsectors(data ?? []))
  }, [])

  function setAll(v: boolean) {
    update({ audience_filters: { ...filters, all: v } })
  }

  function setGender(v: string) {
    update({ audience_filters: { ...filters, gender: v === '' ? undefined : (v as 'M' | 'F') } })
  }

  function setBalig(checked: boolean) {
    update({ audience_filters: { ...filters, balig_status: checked ? 'Balig' : undefined } })
  }

  function setAgeFrom(v: string) {
    update({ audience_filters: { ...filters, age_from: v === '' ? undefined : Number(v) } })
  }

  function setAgeTo(v: string) {
    update({ audience_filters: { ...filters, age_to: v === '' ? undefined : Number(v) } })
  }

  function toggleSector(sectorId: number) {
    const idStr = String(sectorId)
    const current = filters.sector_ids ?? []
    const next = current.includes(idStr) ? current.filter((x) => x !== idStr) : [...current, idStr]
    const newSubs = (filters.subsector_ids ?? []).filter((sid) => {
      const ss = subsectors.find((s) => s.subsector_id === Number(sid))
      return ss && next.includes(String(ss.sector_id))
    })
    update({ audience_filters: { ...filters, sector_ids: next, subsector_ids: newSubs } })
  }

  function toggleSubsector(subsectorId: number) {
    const idStr = String(subsectorId)
    const current = filters.subsector_ids ?? []
    const next = current.includes(idStr) ? current.filter((x) => x !== idStr) : [...current, idStr]
    update({ audience_filters: { ...filters, subsector_ids: next } })
  }

  const selectedSectorIds = filters.sector_ids ?? []
  const visibleSubsectors = selectedSectorIds.length > 0
    ? subsectors.filter((ss) => selectedSectorIds.includes(String(ss.sector_id)))
    : subsectors

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Audience</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Who should this form target?</p>
      </div>

      {/* All vs By criteria toggle */}
      <div className="flex gap-3">
        {[
          { label: 'All members', value: true },
          { label: 'By criteria', value: false },
        ].map((opt) => {
          const active = isAll === opt.value
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setAll(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {!isAll && (
        <div className="space-y-5 pt-1">
          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'All', value: '' },
                { label: 'Male', value: 'M' },
                { label: 'Female', value: 'F' },
              ].map((opt) => {
                const active = (filters.gender ?? '') === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Balig status */}
          <div>
            <CheckItem
              id="balig-only"
              label="Balig members only"
              checked={!!filters.balig_status}
              onChange={setBalig}
            />
          </div>

          {/* Age range */}
          <div className="space-y-2">
            <Label>Age Range <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">From</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  placeholder="0"
                  value={filters.age_from ?? ''}
                  onChange={(e) => setAgeFrom(e.target.value)}
                  className={`${inputClass} w-24`}
                />
              </div>
              <span className="text-muted-foreground mt-4">—</span>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">To</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  placeholder="120"
                  value={filters.age_to ?? ''}
                  onChange={(e) => setAgeTo(e.target.value)}
                  className={`${inputClass} w-24`}
                />
              </div>
            </div>
          </div>

          {/* Sectors */}
          {sectors.length > 0 && (
            <div className="space-y-2">
              <Label>Sectors <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-lg bg-muted/20 max-h-40 overflow-y-auto">
                {sectors.map((s) => (
                  <CheckItem
                    key={s.sector_id}
                    id={`sector-${s.sector_id}`}
                    label={s.sector_name}
                    checked={selectedSectorIds.includes(String(s.sector_id))}
                    onChange={() => toggleSector(s.sector_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Subsectors */}
          {visibleSubsectors.length > 0 && (
            <div className="space-y-2">
              <Label>
                Subsectors <span className="text-muted-foreground font-normal">(optional{selectedSectorIds.length > 0 ? ', filtered by selected sectors' : ''})</span>
              </Label>
              <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-lg bg-muted/20 max-h-48 overflow-y-auto">
                {visibleSubsectors.map((ss) => (
                  <CheckItem
                    key={ss.subsector_id}
                    id={`subsector-${ss.subsector_id}`}
                    label={ss.subsector_name}
                    checked={(filters.subsector_ids ?? []).includes(String(ss.subsector_id))}
                    onChange={() => toggleSubsector(ss.subsector_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Next: Questions</Button>
      </div>
    </div>
  )
}