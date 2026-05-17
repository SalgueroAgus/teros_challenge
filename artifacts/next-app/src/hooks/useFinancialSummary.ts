'use client'

import { useState, useEffect } from 'react'

function sr(seed: number, offset: number, min: number, max: number): number {
  const x = Math.sin(seed + offset) * 10000
  return min + (x - Math.floor(x)) * (max - min)
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function generate() {
  const seed = Math.random()
  const spending = Math.round(sr(seed, 1, 2800, 5200) * 100) / 100
  const income   = Math.round(sr(seed, 2, spending + 600, spending + 2800) * 100) / 100
  const savings  = Math.round((income - spending) * 100) / 100

  const categories = [
    { name: 'Housing',       value: Math.round(spending * 0.34), color: '#4F6CF7' },
    { name: 'Food',          value: Math.round(spending * 0.24), color: '#22C55E' },
    { name: 'Transport',     value: Math.round(spending * 0.16), color: '#F59E0B' },
    { name: 'Entertainment', value: Math.round(spending * 0.14), color: '#EF4444' },
    { name: 'Other',         value: Math.round(spending * 0.12), color: '#8B5CF6' },
  ]

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const monthly = MONTHS.map((month, i) => ({
    month,
    spending: Math.round(sr(seed, 10 + i, spending * 0.12, spending * 0.22)),
    income:   Math.round(sr(seed, 20 + i, income   * 0.13, income   * 0.20)),
  }))

  return {
    spending: { value: fmt(spending) },
    income:   { value: fmt(income)   },
    savings:  { value: (savings >= 0 ? '' : '-') + fmt(Math.abs(savings)) },
    categories,
    monthly,
  }
}

const EMPTY = {
  spending: { value: '—' },
  income:   { value: '—' },
  savings:  { value: '—' },
  categories: [] as { name: string; value: number; color: string }[],
  monthly:    [] as { month: string; spending: number; income: number }[],
}

export function useFinancialSummary() {
  const [data, setData] = useState(EMPTY)

  useEffect(() => {
    setData(generate())
  }, [])

  return data
}
