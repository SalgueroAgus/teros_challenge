'use client'

import { useState } from 'react'
import { DocumentsTable } from '@/components/dashboard/DocumentsTable'
import { DocumentUploadZone } from '@/components/dashboard/DocumentUploadZone'
import { useDeleteDocument, useDocuments } from '@/hooks/useDocuments'

export default function DocumentsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useDocuments(page)
  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteDocument()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Documents</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage your uploaded financial documents
          </p>
        </div>
        <DocumentUploadZone />
        <DocumentsTable
          documents={data?.items ?? []}
          isLoading={isLoading}
          onDelete={deleteDocument}
          isDeleting={isDeleting}
          currentPage={page}
          totalPages={data?.totalPages}
          total={data?.total}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
