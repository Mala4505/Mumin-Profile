'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

interface SubsectorItem {
  subsector_name: string
  mumin_count: number
}

export default function SubsectorMuminChart({ subsectors }: { subsectors: SubsectorItem[] }) {
  if (subsectors.length === 0) return null

  const data = subsectors.map(s => ({
    name: s.subsector_name,
    Members: s.mumin_count,
  }))

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-base font-semibold text-foreground mb-4">Members by Subsector</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="Members" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
