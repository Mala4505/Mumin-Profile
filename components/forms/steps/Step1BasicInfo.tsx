'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, Loader2, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FormDraft } from '../FormBuilder'

interface ProfileCategory {
  id: number
  name: string
}

interface Event {
  id: number
  title: string
  event_date: string
}

interface Props {
  draft: Partial<FormDraft>
  update: (patch: Partial<FormDraft>) => void
  onNext: () => void
}

const selectClass =
  'appearance-none w-full bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer'

export function Step1BasicInfo({ draft, update, onNext }: Props) {
  const [categories, setCategories] = useState<ProfileCategory[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [titleError, setTitleError] = useState(false)

  // Inline new-event form state
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [newEventError, setNewEventError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profile_category')
      .select('id, name')
      .order('sort_order')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then(({ events: ev }) => setEvents(ev ?? []))
      .catch(() => {})
  }, [])

  function handleNext() {
    if (!draft.title?.trim()) {
      setTitleError(true)
      return
    }
    setTitleError(false)
    onNext()
  }

  async function handleCreateEvent() {
    setNewEventError(null)
    if (!newEventTitle.trim()) { setNewEventError('Title is required.'); return }
    if (!newEventDate) { setNewEventError('Date is required.'); return }

    setCreatingEvent(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newEventTitle.trim(), event_date: newEventDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create event')

      const created: Event = data.event
      setEvents((prev) => [created, ...prev])
      update({ event_id: created.id })
      setShowNewEvent(false)
      setNewEventTitle('')
      setNewEventDate('')
    } catch (err: any) {
      setNewEventError(err.message)
    } finally {
      setCreatingEvent(false)
    }
  }

  const selectedEvent = events.find((e) => e.id === draft.event_id)

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Basic Information</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Give this form a title and configure its basic settings.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="form-title">
          Form Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="form-title"
          placeholder="e.g. Ramadan Attendance 1446"
          value={draft.title ?? ''}
          onChange={(e) => {
            update({ title: e.target.value })
            if (e.target.value.trim()) setTitleError(false)
          }}
          className={titleError ? 'border-destructive focus:ring-destructive' : ''}
        />
        {titleError && (
          <p className="text-xs text-destructive mt-1">Title is required.</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="form-description">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <textarea
          id="form-description"
          rows={3}
          placeholder="Brief description of this form's purpose..."
          value={draft.description ?? ''}
          onChange={(e) => update({ description: e.target.value })}
          className="flex w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
        />
      </div>

      {/* Umoor Category */}
      <div className="space-y-1.5">
        <Label htmlFor="umoor-category">
          Umoor Category <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <select
            id="umoor-category"
            value={draft.umoor_category_id ?? ''}
            onChange={(e) =>
              update({ umoor_category_id: e.target.value ? Number(e.target.value) : undefined })
            }
            className={selectClass}
          >
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Event */}
      <div className="space-y-1.5">
        <Label htmlFor="event-id">
          Parent Event <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              id="event-id"
              value={draft.event_id ?? ''}
              onChange={(e) =>
                update({ event_id: e.target.value ? Number(e.target.value) : null })
              }
              className={selectClass}
            >
              <option value="">No event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.event_date})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={() => { setShowNewEvent((v) => !v); setNewEventError(null) }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            {showNewEvent ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showNewEvent ? 'Cancel' : 'New'}
          </button>
        </div>

        {/* Inline new-event form */}
        {showNewEvent && (
          <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Create New Event
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="new-event-title" className="text-xs">Title</Label>
                <Input
                  id="new-event-title"
                  placeholder="e.g. Ashara Mubaraka 1447"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-event-date" className="text-xs">Date</Label>
                <Input
                  id="new-event-date"
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            {newEventError && (
              <p className="text-xs text-destructive">{newEventError}</p>
            )}
            <Button
              size="sm"
              onClick={handleCreateEvent}
              disabled={creatingEvent}
              className="h-8"
            >
              {creatingEvent ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Creating…</>
              ) : (
                'Create Event'
              )}
            </Button>
          </div>
        )}

        {selectedEvent && !showNewEvent && (
          <p className="text-xs text-muted-foreground">
            Linked to: <span className="font-medium text-foreground">{selectedEvent.title}</span>{' '}
            on {selectedEvent.event_date}
          </p>
        )}
      </div>

      {/* Form Type */}
      <div className="space-y-2">
        <Label>Form Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'simple', label: 'Simple', desc: 'One row per member in a table view' },
            { value: 'detailed', label: 'Detailed', desc: 'Full form per member with all questions' },
          ].map((opt) => {
            const active = (draft.form_type ?? 'simple') === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ form_type: opt.value as 'simple' | 'detailed' })}
                className={`text-left p-3.5 rounded-lg border transition-colors ${
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      active ? 'border-primary' : 'border-muted-foreground'
                    }`}
                  >
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">{opt.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Expiry date */}
      <div className="space-y-1.5">
        <Label htmlFor="expires-at">
          Expiry Date <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="expires-at"
          type="date"
          min={today}
          value={draft.expires_at ?? ''}
          onChange={(e) => update({ expires_at: e.target.value })}
          className="w-48"
        />
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={handleNext} disabled={!draft.title?.trim()}>
          Next: Audience
        </Button>
      </div>
    </div>
  )
}
