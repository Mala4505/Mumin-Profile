'use client'

import { useEffect, useRef } from 'react'

export interface UmoorChip {
  id: string
  name: string
  filled: number
  total: number
}

interface Props {
  chips: UmoorChip[]
  activeId: string | null
  onChipClick: (id: string) => void
}

/**
 * Horizontal chip bar for the 12-Umoor sections of the Mumin portal.
 * Purely presentational: the parent owns which chip is active and what a
 * click does. Keeps the active chip in view by scrolling its own strip.
 */
export function UmoorChipNav({ chips, activeId, onChipClick }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef(new Map<string, HTMLButtonElement>())

  // Auto-scroll the strip so the active chip stays visible.
  useEffect(() => {
    if (!activeId) return
    const scroller = scrollerRef.current
    const chip = chipRefs.current.get(activeId)
    if (!scroller || !chip) return

    const chipLeft = chip.offsetLeft
    const chipRight = chipLeft + chip.offsetWidth
    const viewLeft = scroller.scrollLeft
    const viewRight = viewLeft + scroller.clientWidth
    // Already comfortably visible — leave the strip alone.
    if (chipLeft >= viewLeft + 12 && chipRight <= viewRight - 12) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({
      left: chipLeft - (scroller.clientWidth - chip.offsetWidth) / 2,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [activeId])

  return (
    <nav aria-label="Profile sections">
      <div
        ref={scrollerRef}
        className="relative flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map((chip) => {
          const active = chip.id === activeId
          return (
            <button
              key={chip.id}
              ref={(el) => {
                if (el) chipRefs.current.set(chip.id, el)
                else chipRefs.current.delete(chip.id)
              }}
              type="button"
              onClick={() => onChipClick(chip.id)}
              aria-current={active ? 'true' : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {chip.name}
              <span
                className={`text-[10px] tabular-nums ${
                  active ? 'text-primary-foreground/70' : 'text-muted-foreground/70'
                }`}
              >
                {chip.filled}/{chip.total}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
