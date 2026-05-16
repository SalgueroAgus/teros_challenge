'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { Document, DocumentStatus } from '@/types'

interface DocumentsTableProps {
  documents: Document[]
  isLoading: boolean
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const config: Record<DocumentStatus, { label: string; className: string }> = {
    done: {
      label: 'Done',
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    processing: {
      label: 'Processing',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    },
    pending: {
      label: 'Pending',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    error: {
      label: 'Error',
      className: 'bg-red-50 text-red-700 border-red-200',
    },
  }

  const { label, className } = config[status]

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium px-2 py-0.5 ${className}`}
    >
      {label}
    </Badge>
  )
}

function formatDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

const ROW_HEIGHT = 'h-[52px]'

function SkeletonRow() {
  return (
    <tr className={`border-b border-gray-50 ${ROW_HEIGHT}`}>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-48 rounded" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-16 rounded" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-20 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-28 rounded" />
      </td>
      <td className="px-4 py-3" />
    </tr>
  )
}

export function DocumentsTable({ documents, isLoading }: DocumentsTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-[#0F172A]">Documents</h2>
        <p className="text-xs text-[#64748B] mt-0.5">
          Your uploaded financial documents
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wide w-[40%]">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wide w-[15%]">
                Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wide w-[20%]">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wide w-[20%]">
                Uploaded
              </th>
              <th className="px-4 py-3 w-[5%]" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[#64748B] text-sm">No documents uploaded yet</span>
                    <span className="text-[#94A3B8] text-xs">
                      Upload a document in the Chat view to get started
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr
                  key={doc.id}
                  className={`border-b border-gray-50 hover:bg-gray-50/50 ${ROW_HEIGHT}`}
                >
                  <td className="px-4 py-3 font-medium text-[#0F172A] truncate max-w-xs">
                    {doc.filename}
                  </td>
                  <td className="px-4 py-3 text-[#64748B] uppercase text-xs font-mono">
                    {doc.fileType}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {doc.status === 'done' && (
                      <Link
                        href={`/chat?docId=${doc.id}&docName=${encodeURIComponent(doc.filename)}`}
                        className="flex items-center gap-1 text-xs text-[#4F6CF7] hover:text-[#3B5BDB] font-medium whitespace-nowrap"
                      >
                        <MessageSquare size={13} />
                        Ask
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
