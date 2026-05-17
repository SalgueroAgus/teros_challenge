'use client'

import { useState } from 'react'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { DocumentsTable } from '@/components/dashboard/DocumentsTable'
import { useDocuments } from '@/hooks/useDocuments'

export default function OverviewPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useDocuments(page)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Overview</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Your financial snapshot at a glance
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            title="Total Spending"
            icon={TrendingDown}
            iconColor="#EF4444"
          />
          <SummaryCard
            title="Total Income"
            icon={TrendingUp}
            iconColor="#22C55E"
          />
          <SummaryCard
            title="Net Savings"
            icon={Wallet}
            iconColor="#4F6CF7"
          />
        </div>

        {/* Documents table */}
        <DocumentsTable
          documents={data?.items ?? []}
          isLoading={isLoading}
          currentPage={page}
          totalPages={data?.totalPages}
          total={data?.total}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
