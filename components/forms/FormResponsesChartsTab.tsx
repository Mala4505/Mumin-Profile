'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Progress } from '@/components/ui/progress'
import type { FormQuestion } from '@/lib/types/forms'

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

export function FormResponsesChartsTab({
  formFields,
  responses,
  audience,
}: {
  formFields: FormQuestion[]
  responses: Response[]
  audience: AudienceMember[]
}) {
  const completionPct =
    audience.length > 0 ? Math.round((responses.length / audience.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Overall completion */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-3">Overall Completion</h3>
        <Progress value={completionPct} className="h-3 mb-2" />
        <p className="text-sm text-muted-foreground">
          {completionPct}% — {responses.length} of {audience.length} members
        </p>
      </div>

      {/* Per-question breakdown */}
      {formFields.map((q) => {
        const answers = responses
          .flatMap((r) => r.responses ?? [])
          .filter((r) => r.profile_field_id === q.profile_field_id)
          .map((r) => r.answer)
          .filter(Boolean)

        if (answers.length === 0) {
          return (
            <div
              key={q.profile_field_id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-foreground mb-2">{q.question_text}</h3>
              <p className="text-sm text-muted-foreground italic">No answers yet</p>
            </div>
          )
        }

        const counts: Record<string, number> = {}
        for (const a of answers) counts[a] = (counts[a] ?? 0) + 1
        const distinctValues = Object.keys(counts)

        if (distinctValues.length <= 20) {
          const chartData = distinctValues
            .sort((a, b) => counts[b] - counts[a])
            .map((v) => ({ name: v, count: counts[v] }))

          return (
            <div
              key={q.profile_field_id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">{q.question_text}</h3>
              <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 36)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 0, bottom: 0 }}
                >
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

        const top10 = distinctValues.sort((a, b) => counts[b] - counts[a]).slice(0, 10)

        return (
          <div
            key={q.profile_field_id}
            className="bg-card border border-border rounded-xl p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-foreground mb-1">{q.question_text}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {answers.length} total · {distinctValues.length} unique answers
            </p>
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
