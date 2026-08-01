'use client'

import { useRef } from 'react'
import { CalendarClock, MapPin } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import type { Question, Respondent } from './ReportsClient'

interface RespondentDetailSheetProps {
  /** null closes the sheet */
  respondent: Respondent | null
  questions: Question[]
  /** field_id → answer for the selected respondent */
  answers: Record<number, string>
  onClose: () => void
}

function formatSubmittedAt(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function RespondentDetailSheet({
  respondent,
  questions,
  answers,
  onClose,
}: RespondentDetailSheetProps) {
  // Keep the last respondent rendered during the close animation
  const lastRef = useRef<Respondent | null>(null)
  if (respondent) lastRef.current = respondent
  const person = respondent ?? lastRef.current

  const answered = questions.filter((q) => (answers[q.field_id] ?? '') !== '').length
  const location = person
    ? [person.sector_name, person.subsector_name].filter(Boolean).join(' · ')
    : ''
  const demographics = person
    ? [
        person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : null,
        person.age !== null ? `${person.age} yrs` : null,
      ].filter(Boolean)
    : []
  const submitted = person ? formatSubmittedAt(person.submitted_at) : ''

  return (
    <Sheet open={!!respondent} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        {person && (
          <>
            <SheetHeader className="p-6 pb-4 border-b border-border space-y-1">
              <SheetTitle className="pr-8">{person.name}</SheetTitle>
              <SheetDescription className="font-mono text-xs">
                ITS {person.its_no}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </span>
                )}
                {demographics.length > 0 && <span>{demographics.join(', ')}</span>}
                {submitted && (
                  <span className="flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    Submitted {submitted}
                  </span>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-3 border-b border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  {answered} of {questions.length} question{questions.length !== 1 ? 's' : ''} answered
                </p>
              </div>
              <dl className="px-6 divide-y divide-border">
                {questions.map((q) => {
                  const val = answers[q.field_id] ?? ''
                  return (
                    <div key={q.field_id} className="py-3">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        {q.caption}
                      </dt>
                      <dd>
                        {val ? (
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                            {val}
                          </p>
                        ) : (
                          <p className="text-sm italic text-muted-foreground/60">No answer</p>
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
