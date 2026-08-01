'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ChevronLeft, Users, CheckCircle, Clock } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Form, FormQuestion } from '@/lib/types/forms'
import type { Role } from '@/lib/types/app'
import { Chip, MemberIdentity } from '@/components/members/MemberPrimitives'

/** Canonical table-header typography, shared with every other table in the app. */
const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'

const FormResponsesChartsTab = dynamic(
  () => import('./FormResponsesChartsTab').then(m => ({ default: m.FormResponsesChartsTab })),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-muted animate-pulse rounded-xl" />,
  }
)

interface Response {
  id: string
  filled_for: number
  responses: Array<{ profile_field_id: number; answer: string }>
  submitted_at: string
  mumin?: { name: string; its_no: number }
}

interface AudienceMember {
  its_no: number
  mumin?: { name: string; subsector?: { name: string } }
}

interface Props {
  form: Form
  formFields: FormQuestion[]   // ✅ pass in form_fields separately
  responses: Response[]
  audience: AudienceMember[]
  role: Role
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * Form status is its own semantic domain, so it keeps its own colours — but it
 * renders through the shared `Chip` so the geometry matches every other badge.
 */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:            { label: 'Draft',            className: 'bg-gray-100 text-gray-600 border-gray-200' },
  pending_approval: { label: 'Pending Approval', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  published:        { label: 'Published',        className: 'bg-green-100 text-green-700 border-green-200' },
  closed:           { label: 'Closed',           className: 'bg-gray-100 text-gray-500 border-gray-200' },
  expired:          { label: 'Expired',          className: 'bg-red-100 text-red-600 border-red-200' },
}

export function FormResponsesClient({ form, formFields, responses, audience, role }: Props) {
  const router = useRouter()
  const [detailResponse, setDetailResponse] = useState<Response | null>(null)

  const respondedItsNos = new Set(responses.map((r) => r.filled_for))
  const pending = audience.filter((a) => !respondedItsNos.has(a.its_no))
  const completionPct = audience.length > 0
    ? Math.round((responses.length / audience.length) * 100)
    : 0

  const statusCfg = STATUS_CONFIG[form.status] ?? STATUS_CONFIG.draft

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => router.push('/forms')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Forms
      </button>

      {/* Stats header */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{form.title}</h1>
            {form.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{form.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Chip size="md" tone={statusCfg.className} className="font-semibold">
              {statusCfg.label}
            </Chip>
            {form.expires_at && (
              <span className="text-xs text-muted-foreground">
                Expires {new Date(form.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span><span className="font-semibold text-foreground">{responses.length}</span> <span className="text-muted-foreground">responses</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            <span>
              <span className="font-semibold text-foreground">{completionPct}%</span>{' '}
              <span className="text-muted-foreground">completion</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>
              <span className="font-semibold text-foreground">{pending.length}</span>{' '}
              <span className="text-muted-foreground">pending</span>
            </span>
          </div>
        </div>

        {/* Completion bar */}
        {audience.length > 0 && (
          <div className="space-y-1">
            <Progress value={completionPct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {responses.length} of {audience.length} members responded
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="responses">
        <TabsList>
          <TabsTrigger value="responses">All Responses ({responses.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            {pending.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        {/* All Responses tab */}
        <TabsContent value="responses" className="mt-4">
          {responses.length === 0 ? (
            <div className="bg-card rounded-xl border border-border shadow-sm px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">No responses yet.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className={TH}>Member</th>
                    <th className={TH}>Answer</th>
                    <th className={TH}>Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {responses.map((r) => {
                    const firstAnswer = r.responses?.[0]?.answer ?? '—'
                    const isMulti = (r.responses?.length ?? 0) > 1
                    return (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/members/${r.filled_for}`)}
                            className="min-h-11 sm:min-h-0 text-left hover:text-primary transition-colors"
                          >
                            <MemberIdentity
                              name={r.mumin?.name ?? String(r.filled_for)}
                              itsNo={r.filled_for}
                              size="sm"
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {isMulti ? (
                            <button
                              onClick={() => setDetailResponse(r)}
                              className="inline-flex items-center min-h-11 sm:min-h-0 text-primary text-xs underline hover:no-underline"
                            >
                              View {r.responses.length} answers
                            </button>
                          ) : firstAnswer}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(r.submitted_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Pending tab */}
        <TabsContent value="pending" className="mt-4">
          {pending.length === 0 ? (
            <div className="bg-card rounded-xl border border-border shadow-sm px-5 py-12 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">All members have responded!</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className={TH}>Member</th>
                    <th className={TH}>Subsector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pending.map((a) => (
                    <tr key={a.its_no} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <MemberIdentity
                          name={a.mumin?.name ?? String(a.its_no)}
                          itsNo={a.its_no}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.mumin?.subsector?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Charts tab */}
        <TabsContent value="charts" className="mt-4">
          <FormResponsesChartsTab formFields={formFields} responses={responses} audience={audience} />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog for multi-answer responses */}
      <Dialog open={!!detailResponse} onOpenChange={(open) => { if (!open) setDetailResponse(null) }}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{detailResponse?.mumin?.name ?? 'Response'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {detailResponse?.responses.map((r, i) => {
              const question = formFields.find((q) => q.profile_field_id === r.profile_field_id)
              return (
                <div key={i} className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{question?.question_text ?? r.profile_field_id}</p>
                  <p className="text-sm font-medium text-foreground">{r.answer || '—'}</p>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
