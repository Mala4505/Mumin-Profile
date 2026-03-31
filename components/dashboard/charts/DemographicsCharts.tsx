'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  maleCount: number
  femaleCount: number
  baligCount: number
  ghairBaligCount: number
}

const GENDER_COLORS = ['#3B82F6', '#EC4899']
const BALIG_COLORS = ['#F59E0B', '#94A3B8']

const renderLabel = ({ percent }: { percent: number }) =>
  percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''

export default function DemographicsCharts({ maleCount, femaleCount, baligCount, ghairBaligCount }: Props) {
  const total = maleCount + femaleCount
  if (total === 0) return null

  const genderData = [
    { name: 'Male', value: maleCount },
    { name: 'Female', value: femaleCount },
  ]

  const baligData = [
    { name: 'Balig', value: baligCount },
    { name: 'Ghair Balig', value: ghairBaligCount },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Gender Distribution</h3>
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={genderData}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={3}
              dataKey="value"
              label={renderLabel}
              labelLine={false}
            >
              {genderData.map((_, i) => (
                <Cell key={i} fill={GENDER_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Balig Distribution</h3>
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={baligData}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={3}
              dataKey="value"
              label={renderLabel}
              labelLine={false}
            >
              {baligData.map((_, i) => (
                <Cell key={i} fill={BALIG_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
