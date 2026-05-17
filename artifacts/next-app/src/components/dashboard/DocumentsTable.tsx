'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, MessageSquare, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { Document, DocumentStatus } from '@/types'

interface DocumentsTableProps {
  documents: Document[]
  isLoading: boolean
  onDelete?: (id: string) => void
  isDeleting?: boolean
  currentPage?: number
  totalPages?: number
  total?: number
  onPageChange?: (page: number) => void
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
        <Skeleton className="h-4 w-32 rounded" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-9 rounded" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-14 rounded" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-24 rounded" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-7 rounded" />
      </td>
    </tr>
  )
}

export function DocumentsTable({
  documents,
  isLoading,
  onDelete,
  isDeleting,
  currentPage = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
}: DocumentsTableProps) {
  const showPagination = onPageChange !== undefined && totalPages > 1
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * 10 + 1
  const rangeEnd = rangeStart + documents.length - 1
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
                    <div className="flex items-center gap-1">
                      {doc.status === 'done' && (
                        <Link
                          href={`/chat?docId=${doc.id}&docName=${encodeURIComponent(doc.filename)}`}
                          title="Ask questions about this document"
                          className="w-7 h-7 flex items-center justify-center rounded-md text-[#4F6CF7] hover:bg-[#EEF2FF]"
                        >
                          <MessageSquare size={14} />
                        </Link>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${doc.filename}"? This cannot be undone.`)) {
                              onDelete(doc.id)
                            }
                          }}
                          disabled={isDeleting}
                          title="Delete document"
                          className="w-7 h-7 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
                          aria-label={`Delete ${doc.filename}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-[#94A3B8]">
            {total === 0
              ? 'No documents'
              : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#64748B] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-[#64748B] px-2 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#64748B] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
