'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Props {
  data: { month: string; spending: number; income: number }[]
}

export function MonthlyTrendBar({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-medium text-[#0F172A] mb-4">6-Month Trend</p>
      <ResponsiveContainer width="100%" height={156}>
        <BarChart data={data} barCategoryGap="35%" barGap={3}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            width={44}
          />
          <Tooltip
            formatter={(value, name) => [
              '$' + Number(value).toLocaleString('en-US'),
              String(name).charAt(0).toUpperCase() + String(name).slice(1),
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            cursor={{ fill: '#F8FAFC' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
          />
          <Bar dataKey="spending" fill="#EF4444" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="income"   fill="#22C55E" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
