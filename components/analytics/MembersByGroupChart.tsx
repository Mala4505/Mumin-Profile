'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface GroupItem {
  name: string
  count: number
}

interface Props {
  groupData: GroupItem[]
  selectedGroup: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBarClick: (data: any) => void
}

export default function MembersByGroupChart({ groupData, selectedGroup, onBarClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <BarChart
        data={groupData}
        margin={{ top: 4, right: 16, left: 0, bottom: groupData.length > 4 ? 64 : 8 }}
        onClick={onBarClick as any}
        style={{ cursor: 'pointer' }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={groupData.length > 4 ? -35 : 0}
          textAnchor={groupData.length > 4 ? 'end' : 'middle'}
          height={groupData.length > 4 ? 70 : 30}
          tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + '…' : v}
        />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
          cursor={{ fill: '#f8fafc' }}
        />
        <Bar
          dataKey="count"
          name="Members"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        >
          {groupData.map((entry, i) => (
            <Cell
              key={i}
              fill={selectedGroup === entry.name ? '#F59E0B' : '#3B82F6'}
              opacity={selectedGroup && selectedGroup !== entry.name ? 0.4 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
