'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, MessageSquare, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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

function DeleteButton({
  filename,
  onConfirm,
  disabled,
}: {
  filename: string
  onConfirm: () => void
  disabled?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={disabled}
          title="Delete document"
          className="w-7 h-7 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
          aria-label={`Delete ${filename}`}
        >
          <Trash2 size={14} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-[#0F172A]">&ldquo;{filename}&rdquo;</span> and all its
            indexed chunks will be permanently removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const ROW_HEIGHT = 'h-[53px]'
const PAGE_SIZE = 10

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

function FillerRow() {
  return (
    <tr className="border-b border-gray-50">
      <td colSpan={5} className={ROW_HEIGHT} />
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
      {/* Mobile card layout */}
      <div className="md:hidden divide-y divide-gray-50">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          ))
        ) : documents.length === 0 ? (
          <div className="px-4 py-8 text-center space-y-1">
            <p className="text-sm text-[#64748B]">No documents uploaded yet</p>
            <p className="text-xs text-[#94A3B8]">Upload a document in Chat to get started</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#0F172A] truncate">{doc.filename}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5 uppercase font-mono">
                  {doc.fileType} · {formatDate(doc.uploadedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <StatusBadge status={doc.status} />
                {doc.status === 'done' && (
                  <Link
                    href={`/chat?docId=${doc.id}&docName=${encodeURIComponent(doc.filename)}`}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-[#4F6CF7] hover:bg-[#EEF2FF]"
                  >
                    <MessageSquare size={14} />
                  </Link>
                )}
                {onDelete && (
                  <DeleteButton filename={doc.filename} onConfirm={() => onDelete(doc.id)} disabled={isDeleting} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block overflow-x-auto">
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
              Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
            ) : documents.length === 0 ? (
              <>
                <tr className={ROW_HEIGHT}>
                  <td colSpan={5} className="px-4 pt-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[#64748B] text-sm">No documents uploaded yet</span>
                      <span className="text-[#94A3B8] text-xs">
                        Upload a document in the Chat view to get started
                      </span>
                    </div>
                  </td>
                </tr>
                {Array.from({ length: PAGE_SIZE - 1 }).map((_, i) => <FillerRow key={i} />)}
              </>
            ) : (
              <>
                {documents.map((doc) => (
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
                          <DeleteButton filename={doc.filename} onConfirm={() => onDelete(doc.id)} disabled={isDeleting} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {Array.from({ length: PAGE_SIZE - documents.length }).map((_, i) => (
                  <FillerRow key={i} />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {onPageChange !== undefined && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-7 w-20 rounded" />
            </>
          ) : (
            <>
              <span className="text-xs text-[#94A3B8]">
                {total === 0
                  ? 'No documents'
                  : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
              </span>
              {totalPages > 1 && (
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
