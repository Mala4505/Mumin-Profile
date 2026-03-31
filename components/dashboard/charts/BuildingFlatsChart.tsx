'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

interface BuildingItem {
  building_name: string
  flat_count: number
}

export default function BuildingFlatsChart({ buildings }: { buildings: BuildingItem[] }) {
  if (buildings.length === 0) return null

  // Sort by flat count descending, cap at 20
  const data = [...buildings]
    .sort((a, b) => b.flat_count - a.flat_count)
    .slice(0, 20)
    .map(b => ({
      name: b.building_name.length > 20 ? b.building_name.slice(0, 18) + '…' : b.building_name,
      Flats: b.flat_count,
    }))

  const height = Math.max(200, data.length * 38)

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-base font-semibold text-foreground mb-4">Flats per Building</h2>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="Flats" fill="#3B82F6" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
