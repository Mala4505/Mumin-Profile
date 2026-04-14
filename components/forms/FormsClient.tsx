'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FormBuilder } from '@/components/forms/FormBuilder'
import {
  FileText,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FilePen,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react'
import type { Role } from '@/lib/types/app'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Form {
  id: string
  title: string
  status: 'draft' | 'pending_approval' | 'published' | 'closed' | 'expired'
  form_type: 'simple' | 'detailed'
  expires_at: string | null
  is_expired: boolean
  created_by: string
  created_at: string
  response_count?: number
  audience_count?: number
}

type FormWithCounts = Form & { response_count?: number; audience_count?: number }

interface FormsClientProps {
  role: Role
}

type TabId = 'my-forms' | 'pending-approval' | 'all-forms'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Form['status'],
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  pending_approval: {
    label: 'Pending Approval',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  published: {
    label: 'Published',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
}

const TYPE_CONFIG: Record<Form['form_type'], { label: string; className: string }> = {
  simple: {
    label: 'Simple',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  detailed: {
    label: 'Detailed',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg {
  id: number
  type: 'success' | 'error'
  message: string
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="h-5 bg-muted rounded w-3/4 mb-3" />
      <div className="flex gap-2 mb-4">
        <div className="h-5 bg-muted rounded-full w-20" />
        <div className="h-5 bg-muted rounded-full w-16" />
      </div>
      <div className="h-4 bg-muted rounded w-1/2 mb-4" />
      <div className="h-8 bg-muted rounded-lg w-24" />
    </div>
  )
}

// ─── Form Card ────────────────────────────────────────────────────────────────

function FormCard({
  form,
  role,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  form: Form
  role: Role
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  approving?: boolean
  rejecting?: boolean
}) {
  const router = useRouter()
  const statusCfg = STATUS_CONFIG[form.status] ?? STATUS_CONFIG.draft
  const typeCfg = TYPE_CONFIG[form.form_type] ?? TYPE_CONFIG.simple
  const isExpired = form.is_expired

  const canFill =
    form.status === 'published' &&
    !isExpired &&
    (role === 'Masool' || role === 'Musaid')

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Title */}
      <h3 className="font-semibold text-foreground text-base leading-snug">
        {form.title}
      </h3>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}
        >
          {statusCfg.label}
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeCfg.className}`}
        >
          {typeCfg.label}
        </span>
      </div>

      {/* Response progress — published/expired/closed forms with audience */}
      {(form.status === 'published' || form.status === 'expired' || form.status === 'closed') &&
        (form as FormWithCounts).audience_count != null &&
        (form as FormWithCounts).audience_count! > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Responses</span>
            <span className="font-medium text-foreground">
              {(form as FormWithCounts).response_count ?? 0} / {(form as FormWithCounts).audience_count}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round(((form as FormWithCounts).response_count ?? 0) / (form as FormWithCounts).audience_count! * 100))}%`
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.round(((form as FormWithCounts).response_count ?? 0) / (form as FormWithCounts).audience_count! * 100)}% complete
            {form.status === 'published' && ` · ${(form as FormWithCounts).audience_count! - ((form as FormWithCounts).response_count ?? 0)} pending`}
          </p>
        </div>
      )}

      {/* Expiry */}
      {form.expires_at && (
        <p className={`text-xs ${isExpired ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
          {isExpired ? 'EXPIRED' : `Expires: ${formatDate(form.expires_at)}`}
        </p>
      )}

      {/* Created date */}
      <p className="text-xs text-muted-foreground">
        Created {formatDate(form.created_at)}
      </p>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        {onApprove && onReject ? (
          // Pending approval actions (SuperAdmin)
          <>
            <button
              onClick={() => onApprove(form.id)}
              disabled={approving || rejecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {approving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Approve
            </button>
            <button
              onClick={() => onReject(form.id)}
              disabled={approving || rejecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {rejecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Reject
            </button>
          </>
        ) : form.status === 'draft' ? (
          <button
            onClick={() => router.push(`/forms/${form.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted/40 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Continue Editing
          </button>
        ) : form.status === 'pending_approval' ? (
          <button
            onClick={() => router.push(`/forms/${form.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted/40 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : canFill ? (
          <button
            onClick={() => router.push(`/forms/${form.id}/fill`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <FilePen className="w-3.5 h-3.5" />
            Fill
          </button>
        ) : (
          <div className="flex gap-2">
            {form.status === 'published' && (
              <button
                onClick={() => router.push(`/forms/${form.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted/40 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            <button
              onClick={() => router.push(`/forms/${form.id}/responses`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <FilePen className="w-3.5 h-3.5" />
              View Responses
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FormsClient({ role }: FormsClientProps) {
  const [tab, setTab] = useState<TabId>('my-forms')
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const toastCounter = useRef(0)

  // Per-card action state: map of form id -> boolean
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set())

  // ── Toast helpers ──────────────────────────────────────────────────────────
  function pushToast(type: 'success' | 'error', message: string) {
    const id = ++toastCounter.current
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  // ── Fetch forms ────────────────────────────────────────────────────────────
  const fetchForms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forms')
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? 'Failed to load forms')
      }
      const json = await res.json()
      setForms(json.forms ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  // ── Approve ────────────────────────────────────────────────────────────────
  async function handleApprove(id: string) {
    setApprovingIds((prev) => new Set([...prev, id]))
    try {
      const res = await fetch(`/api/forms/${id}/approve`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? 'Approve failed')
      }
      pushToast('success', 'Form approved and published.')
      await fetchForms()
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // ── Reject ─────────────────────────────────────────────────────────────────
  async function handleReject(id: string) {
    setRejectingIds((prev) => new Set([...prev, id]))
    try {
      const res = await fetch(`/api/forms/${id}/reject`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? 'Reject failed')
      }
      pushToast('success', 'Form rejected and returned to draft.')
      await fetchForms()
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setRejectingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // ── Tab definitions ────────────────────────────────────────────────────────
  type TabDef = { id: TabId; label: string; icon: React.ReactNode }

  const tabs: TabDef[] = [
    {
      id: 'my-forms',
      label: 'My Forms',
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    ...(role === 'SuperAdmin'
      ? [
          {
            id: 'pending-approval' as TabId,
            label: 'Pending Approval',
            icon: <Clock className="w-3.5 h-3.5" />,
          },
        ]
      : []),
    ...(role === 'SuperAdmin' || role === 'Admin'
      ? [
          {
            id: 'all-forms' as TabId,
            label: 'All Forms',
            icon: <AlertTriangle className="w-3.5 h-3.5 opacity-70" />,
          },
        ]
      : []),
  ]

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const myForms = forms // API already scopes to the user's visible forms
  const pendingForms = forms.filter((f) => f.status === 'pending_approval')
  const allForms = forms

  function getTabForms(): Form[] {
    if (tab === 'pending-approval') return pendingForms
    if (tab === 'all-forms') return allForms
    return myForms
  }

  const tabForms = getTabForms().filter((f) =>
    search.trim() === '' || f.title.toLowerCase().includes(search.toLowerCase())
  )

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Toast notifications ──────────────────────────────────────── */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
                t.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {t.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Row 1: tabs + new form button */}
        <div className="flex items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="w-auto">
            <TabsList>
              {tabs.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5">
                  {t.icon}
                  {t.label}
                  {t.id === 'pending-approval' && pendingForms.length > 0 && (
                    <span className="ml-0.5 bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                      {pendingForms.length}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Form
          </button>
        </div>

        {/* Row 2: search + view toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search forms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 3: stats bar */}
        <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/40 rounded-lg border border-border text-xs text-muted-foreground">
          <span><span className="font-semibold text-foreground">{tabForms.length}</span> forms</span>
          <span className="text-border">·</span>
          <span><span className="font-semibold text-green-700">{tabForms.filter(f => f.status === 'published').length}</span> published</span>
          <span className="text-border">·</span>
          <span><span className="font-semibold text-amber-700">{tabForms.filter(f => f.status === 'pending_approval').length}</span> pending</span>
          <span className="text-border">·</span>
          <span><span className="font-semibold text-foreground">{tabForms.reduce((sum, f) => sum + ((f as FormWithCounts).response_count ?? 0), 0)}</span> responses</span>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
          : 'flex flex-col gap-2'
        }>
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : tabForms.length === 0 ? (
        <div className="bg-card rounded-xl border border-border px-5 py-16 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            {tab === 'pending-approval'
              ? 'No forms awaiting approval'
              : tab === 'all-forms'
              ? 'No forms found'
              : 'No forms yet. Create your first form.'}
          </p>
          {tab === 'my-forms' && (
            <p className="text-xs text-muted-foreground">
              Click{' '}
              <button
                onClick={() => setShowBuilder(true)}
                className="text-primary underline"
              >
                New Form
              </button>{' '}
              to get started.
            </p>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
          : 'flex flex-col gap-2'
        }>
          {tabForms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              role={role}
              onApprove={tab === 'pending-approval' ? handleApprove : undefined}
              onReject={tab === 'pending-approval' ? handleReject : undefined}
              approving={approvingIds.has(form.id)}
              rejecting={rejectingIds.has(form.id)}
            />
          ))}
        </div>
      )}

      {/* FormBuilder Dialog */}
      <Dialog
        open={showBuilder}
        onOpenChange={(open) => {
          if (!open) setShowDiscardConfirm(true)
          else setShowBuilder(true)
        }}
      >
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogTitle className="sr-only">Form Builder</DialogTitle>
          <FormBuilder
            onComplete={() => {
              setShowBuilder(false)
              fetchForms()
            }}
            role={role}
          />
        </DialogContent>
      </Dialog>

      {/* Discard confirmation */}
      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Discard this draft?"
        description="You'll lose any progress on this form. This cannot be undone."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={() => {
          setShowDiscardConfirm(false)
          setShowBuilder(false)
        }}
      />
    </div>
  )
}
