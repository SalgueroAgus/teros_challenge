'use client'

import { DocumentsTable } from '@/components/dashboard/DocumentsTable'
import { useDeleteDocument, useDocuments } from '@/hooks/useDocuments'

export default function DocumentsPage() {
  const { data: documents, isLoading } = useDocuments()
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
        <DocumentsTable
          documents={documents ?? []}
          isLoading={isLoading}
          onDelete={deleteDocument}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}
