'use client'

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { AnswerDist, SectorBreakdown } from '@/app/api/analytics/forms/[id]/route'

const PALETTE = [
  '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
  '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
]

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

export function DistributionPie({
  data,
  selectedAnswer,
  onSliceClick,
}: {
  data: AnswerDist[]
  selectedAnswer?: string | null
  onSliceClick?: (answer: string) => void
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
        Answer Distribution
        {onSliceClick && (
          <span className="text-xs text-muted-foreground font-normal ml-1">· click a slice to filter</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground font-normal">{total} total</span>
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="answer"
            cx="50%"
            cy="46%"
            innerRadius={70}
            outerRadius={105}
            paddingAngle={2}
            label={({ percent, answer }: { percent?: number; answer?: string }) => {
              if ((percent ?? 0) < 0.12) return ''
              const label = answer ?? ''
              return label.length > 12 ? label.slice(0, 11) + '…' : label
            }}
            labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={onSliceClick ? ((data: any) => onSliceClick(data.answer)) : undefined}
            style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={PALETTE[i % PALETTE.length]}
                opacity={selectedAnswer && selectedAnswer !== d.answer ? 0.35 : 1}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', padding: '8px 12px' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any, _name: any, props: any) => [
              `${value} (${pct(Number(value), total)}%)`,
              props.payload?.answer ?? _name,
            ]) as any}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 12, lineHeight: '22px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SectorBarChart({
  data,
  answers,
  groupBy,
  selectedSector,
  onSegmentClick,
}: {
  data: SectorBreakdown[]
  answers: string[]
  groupBy: 'sector' | 'subsector'
  selectedSector?: string | null
  onSegmentClick?: (sector: string, answer: string) => void
}) {
  const bottomMargin = data.length > 6 ? 64 : data.length > 3 ? 40 : 20
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full bg-blue-500 inline-block" />
        By {groupBy === 'sector' ? 'Sector' : 'Subsector'}
        {onSegmentClick && (
          <span className="text-xs text-muted-foreground font-normal ml-1">· click a bar to filter</span>
        )}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: bottomMargin }}
          barCategoryGap="28%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={data.length > 4 ? -35 : 0}
            textAnchor={data.length > 4 ? 'end' : 'middle'}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', padding: '8px 12px' }}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 16, lineHeight: '22px' }}
          />
          {answers.map((ans, i) => (
            <Bar
              key={ans}
              dataKey={ans}
              stackId="a"
              fill={PALETTE[i % PALETTE.length]}
              radius={i === answers.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={48}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={onSegmentClick ? (barData: any) => onSegmentClick(barData.name, ans) : undefined}
            >
              {data.map((entry, j) => (
                <Cell
                  key={j}
                  fill={PALETTE[i % PALETTE.length]}
                  opacity={selectedSector && selectedSector !== entry.name ? 0.35 : 1}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
