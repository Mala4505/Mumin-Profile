'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users, CheckCircle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Form } from '@/lib/types/forms'
import type { Role } from '@/lib/types/app'

interface Response {
  id: string
  filled_for: string
  responses: Array<{ profile_field_id: string; answer: string }>
  submitted_at: string
  mumin?: { name: string; its_no: string }
}

interface AudienceMember {
  its_no: string
  mumin?: { name: string; subsector?: { name: string } }
}

interface Props {
  form: Form
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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:            { label: 'Draft',            className: 'bg-gray-100 text-gray-600' },
  pending_approval: { label: 'Pending Approval', className: 'bg-amber-100 text-amber-700' },
  published:        { label: 'Published',        className: 'bg-green-100 text-green-700' },
  closed:           { label: 'Closed',           className: 'bg-gray-100 text-gray-500' },
  expired:          { label: 'Expired',          className: 'bg-red-100 text-red-600' },
}

function ChartsTab({ form, responses, audience }: { form: Form; responses: Response[]; audience: AudienceMember[] }) {
  const completionPct = audience.length > 0
    ? Math.round((responses.length / audience.length) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Overall completion */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-3">Overall Completion</h3>
        <Progress value={completionPct} className="h-3 mb-2" />
        <p className="text-sm text-muted-foreground">{completionPct}% — {responses.length} of {audience.length} members</p>
      </div>

      {/* Per-question breakdown */}
      {(form.questions ?? []).map((q) => {
        const answers = responses
          .flatMap((r) => r.responses ?? [])
          .filter((r) => r.profile_field_id === q.profile_field_id.toString())
          .map((r) => r.answer)
          .filter(Boolean)

        if (answers.length === 0) {
          return (
            <div key={q.profile_field_id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-2">{q.question_text}</h3>
              <p className="text-sm text-muted-foreground italic">No answers yet</p>
            </div>
          )
        }

        // Count distinct values
        const counts: Record<string, number> = {}
        for (const a of answers) counts[a] = (counts[a] ?? 0) + 1
        const distinctValues = Object.keys(counts)

        // Bar chart for ≤20 distinct values
        if (distinctValues.length <= 20) {
          const chartData = distinctValues
            .sort((a, b) => counts[b] - counts[a])
            .map((v) => ({ name: v, count: counts[v] }))

          return (
            <div key={q.profile_field_id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">{q.question_text}</h3>
              <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 36)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} className="fill-primary" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        }

        // Free-text fallback: top 10 list
        const top10 = distinctValues
          .sort((a, b) => counts[b] - counts[a])
          .slice(0, 10)

        return (
          <div key={q.profile_field_id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-1">{q.question_text}</h3>
            <p className="text-xs text-muted-foreground mb-3">{answers.length} total · {distinctValues.length} unique answers</p>
            <div className="space-y-1.5">
              {top10.map((val) => (
                <div key={val} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{val}</span>
                  <span className="text-muted-foreground text-xs ml-3 shrink-0">{counts[val]}×</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function FormResponsesClient({ form, responses, audience, role }: Props) {
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
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{form.title}</h1>
            {form.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{form.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
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
            <span><span className="font-semibold text-foreground">{completionPct}%</span> <span className="text-muted-foreground">completion</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span><span className="font-semibold text-foreground">{pending.length}</span> <span className="text-muted-foreground">pending</span></span>
          </div>
        </div>

        {/* Completion bar */}
        {audience.length > 0 && (
          <div className="space-y-1">
            <Progress value={completionPct} className="h-2" />
            <p className="text-xs text-muted-foreground">{responses.length} of {audience.length} members responded</p>
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
            <div className="bg-card border border-border rounded-xl px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">No responses yet.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ITS</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Answer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {responses.map((r) => {
                    const firstAnswer = r.responses?.[0]?.answer ?? '—'
                    const isMulti = (r.responses?.length ?? 0) > 1
                    return (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <button
                            onClick={() => router.push(`/members/${r.filled_for}`)}
                            className="hover:text-primary hover:underline transition-colors text-left"
                          >
                            {r.mumin?.name ?? r.filled_for}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{r.filled_for}</td>
                        <td className="px-4 py-3 text-foreground">
                          {isMulti ? (
                            <button
                              onClick={() => setDetailResponse(r)}
                              className="text-primary text-xs underline hover:no-underline"
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
          )}
        </TabsContent>

        {/* Pending tab */}
        <TabsContent value="pending" className="mt-4">
          {pending.length === 0 ? (
            <div className="bg-card border border-border rounded-xl px-5 py-12 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">All members have responded!</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ITS</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subsector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pending.map((a) => (
                    <tr key={a.its_no} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{a.mumin?.name ?? a.its_no}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{a.its_no}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.mumin?.subsector?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Charts tab */}
        <TabsContent value="charts" className="mt-4">
          <ChartsTab form={form} responses={responses} audience={audience} />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog for multi-answer responses */}
      <Dialog open={!!detailResponse} onOpenChange={(open) => { if (!open) setDetailResponse(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detailResponse?.mumin?.name ?? 'Response'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {detailResponse?.responses.map((r, i) => {
              const question = form.questions?.find((q) => q.profile_field_id.toString() === r.profile_field_id.toString())
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
