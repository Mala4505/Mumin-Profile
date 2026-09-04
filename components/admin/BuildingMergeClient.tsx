'use client'

/**
 * Section I Phase 4 Step 4 — SuperAdmin-only tool to merge D2 duplicate
 * building rows. Low-traffic utility: a plain table per duplicate group +
 * one confirm dialog, no polish beyond that.
 *
 * Merge target defaults to the building with the most house rows in its
 * group (the strongest occupancy signal for "this is the real one"), but the
 * SuperAdmin can pick a different target via radio buttons. Confirming runs
 * one rpc_merge_buildings call per source building, sequentially, then
 * reloads the page — same refresh pattern as MoveHouseholdPanel's onMoved.
 */

import { useMemo, useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

const TH = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'

export interface DuplicateBuildingRow {
  building_id: number
  building_name: string
  street: string | null
  landmark: string | null
  house_count: number
}

export interface DuplicateBuildingGroup {
  key: string
  subsector_id: number
  subsector_name: string
  buildings: DuplicateBuildingRow[]
}

interface Props {
  initialGroups: DuplicateBuildingGroup[]
}

function defaultTargetId(buildings: DuplicateBuildingRow[]): number {
  return buildings.reduce((best, b) => (b.house_count > best.house_count ? b : best), buildings[0]).building_id
}

function GroupCard({
  group,
  onMerged,
}: {
  group: DuplicateBuildingGroup
  onMerged: () => void
}) {
  const [targetId, setTargetId] = useState<number>(() => defaultTargetId(group.buildings))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState('')

  const sourceIds = group.buildings.map((b) => b.building_id).filter((id) => id !== targetId)
  const targetBuilding = group.buildings.find((b) => b.building_id === targetId)!

  async function handleConfirmMerge() {
    setMerging(true)
    setError('')
    try {
      for (const sourceId of sourceIds) {
        const res = await fetch('/api/admin/buildings/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_building_id: sourceId, target_building_id: targetId }),
        })
        const d = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(d.error ?? 'Merge failed')
        }
      }
      toast.success(`Merged ${sourceIds.length} duplicate${sourceIds.length !== 1 ? 's' : ''} into building ${targetId}`)
      setConfirmOpen(false)
      onMerged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed')
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{group.buildings[0].building_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{group.subsector_name}</p>
        </div>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button size="sm" onClick={() => setConfirmOpen(true)}>
            Merge into selected
          </Button>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Confirm building merge</DialogTitle>
              <DialogDescription>
                Every house in {sourceIds.length} building{sourceIds.length !== 1 ? 's' : ''} will be repointed to
                building {targetId} ({targetBuilding.building_name}), and the emptied duplicate
                {sourceIds.length !== 1 ? 's are' : ' is'} deleted. This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <ul className="text-sm space-y-1 mt-2">
              {sourceIds.map((id) => {
                const b = group.buildings.find((x) => x.building_id === id)!
                return (
                  <li key={id} className="text-muted-foreground">
                    Building {id} ({b.house_count} house{b.house_count !== 1 ? 's' : ''}) &rarr; merges into{' '}
                    <span className="font-medium text-foreground">Building {targetId}</span>
                  </li>
                )
              })}
            </ul>

            {error && (
              <p className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 mt-3 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                <span>{error}</span>
              </p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <button
                  disabled={merging}
                  className="px-3 py-1.5 rounded border border-border text-sm hover:bg-muted/40 disabled:opacity-60"
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={handleConfirmMerge}
                disabled={merging}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {merging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Merge
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className={TH}>Keep</th>
              <th className={TH}>Building ID</th>
              <th className={TH}>Street</th>
              <th className={TH}>Landmark</th>
              <th className={TH}>Houses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {group.buildings.map((b) => (
              <tr key={b.building_id} className={b.building_id === targetId ? 'bg-primary/5' : undefined}>
                <td className="px-3 py-2">
                  <input
                    type="radio"
                    name={`target-${group.key}`}
                    checked={b.building_id === targetId}
                    onChange={() => setTargetId(b.building_id)}
                    disabled={merging}
                    aria-label={`Keep building ${b.building_id} as merge target`}
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-foreground">{b.building_id}</td>
                <td className="px-3 py-2 text-foreground">{b.street || '—'}</td>
                <td className="px-3 py-2 text-foreground">{b.landmark || '—'}</td>
                <td className="px-3 py-2 text-foreground">{b.house_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function BuildingMergeClient({ initialGroups }: Props) {
  const groups = initialGroups

  const totalDuplicates = useMemo(
    () => groups.reduce((sum, g) => sum + (g.buildings.length - 1), 0),
    [groups],
  )

  function handleMerged() {
    // Simplest correct refresh: reload so every group's house_count and the
    // duplicates list itself reflect the merge just performed — same pattern
    // as MoveHouseholdPanel's onMoved -> window.location.reload().
    window.location.reload()
  }

  if (groups.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center text-sm text-muted-foreground">
        No duplicate buildings found.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {groups.length} duplicate group{groups.length !== 1 ? 's' : ''} · {totalDuplicates} building
        {totalDuplicates !== 1 ? 's' : ''} to merge away
      </p>
      {groups.map((g) => (
        <GroupCard key={g.key} group={g} onMerged={handleMerged} />
      ))}
    </div>
  )
}
