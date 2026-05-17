'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { name: string; value: number; color: string }[]
}

export function SpendingDonut({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-medium text-[#0F172A] mb-4">Spending by Category</p>
      <div className="flex items-center gap-6">
        <div className="w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={62}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={false}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  ['$' + Number(value).toLocaleString('en-US'), '']
                }
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-col gap-2 flex-1 min-w-0">
          {data.map((entry) => (
            <li key={entry.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-[#64748B] truncate">{entry.name}</span>
              </div>
              <span className="text-xs font-medium text-[#0F172A] flex-shrink-0">
                ${entry.value.toLocaleString('en-US')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
