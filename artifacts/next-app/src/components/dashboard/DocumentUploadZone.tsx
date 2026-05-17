'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQueryClient } from '@tanstack/react-query'
import { Upload, CheckCircle2, XCircle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadDocument } from '@/lib/api'

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'text/csv': ['.csv'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
}

const MAX_FILE_BYTES = 10 * 1024 * 1024

type FileStatus = 'queued' | 'uploading' | 'done' | 'error'

interface FileEntry {
  id: string
  file: File
  status: FileStatus
  error?: string
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === 'done') return <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
  if (status === 'error') return <XCircle size={15} className="text-red-500 flex-shrink-0" />
  if (status === 'uploading') return <Loader2 size={15} className="text-[#4F6CF7] animate-spin flex-shrink-0" />
  return <div className="w-[15px] h-[15px] rounded-full border-2 border-gray-200 flex-shrink-0" />
}

export function DocumentUploadZone() {
  const [queue, setQueue] = useState<FileEntry[]>([])
  const queryClient = useQueryClient()

  const runUploads = useCallback(
    async (entries: FileEntry[]) => {
      for (const entry of entries) {
        setQueue((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: 'uploading' as const } : e))
        )
        try {
          await uploadDocument(entry.file)
          setQueue((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, status: 'done' as const } : e))
          )
          queryClient.invalidateQueries({ queryKey: ['documents'] })
        } catch (err) {
          setQueue((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    status: 'error' as const,
                    error: err instanceof Error ? err.message : 'Upload failed',
                  }
                : e
            )
          )
        }
      }
    },
    [queryClient]
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const entries: FileEntry[] = acceptedFiles.map((file) => {
        const tooBig = file.size > MAX_FILE_BYTES
        return {
          id: generateId(),
          file,
          status: tooBig ? ('error' as const) : ('queued' as const),
          error: tooBig ? 'Exceeds 10 MB limit' : undefined,
        }
      })

      setQueue((prev) => [...prev, ...entries])

      const valid = entries.filter((e) => e.status === 'queued')
      if (valid.length > 0) runUploads(valid)
    },
    [runUploads]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  })

  const hasDone = queue.some((e) => e.status === 'done')
  const isIdle = queue.length === 0

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl px-6 py-7 text-center cursor-pointer select-none',
          'transition-colors duration-150',
          isDragActive
            ? 'border-[#4F6CF7] bg-[#EEF2FF]'
            : 'border-gray-200 bg-white hover:border-[#4F6CF7] hover:bg-[#F8F9FF]'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          size={20}
          className={cn(
            'mx-auto mb-2.5 transition-colors',
            isDragActive ? 'text-[#4F6CF7]' : 'text-[#94A3B8]'
          )}
        />
        <p className="text-sm font-medium text-[#0F172A]">
          {isDragActive ? 'Drop your files here' : 'Drag & drop documents here'}
        </p>
        <p className="text-xs text-[#64748B] mt-1">
          or{' '}
          <span className="text-[#4F6CF7] underline underline-offset-2 cursor-pointer">
            browse files
          </span>{' '}
          — PDF, CSV, PNG, JPG · max 10 MB each
        </p>
      </div>

      {!isIdle && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
              Uploads
            </span>
            {hasDone && (
              <button
                onClick={() => setQueue((prev) => prev.filter((e) => e.status !== 'done'))}
                className="text-xs text-[#64748B] hover:text-[#0F172A]"
              >
                Clear done
              </button>
            )}
          </div>
          <ul className="divide-y divide-gray-50">
            {queue.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                <StatusIcon status={entry.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#0F172A] font-medium truncate">{entry.file.name}</p>
                  {entry.status === 'error' && (
                    <p className="text-xs text-red-500 mt-0.5">{entry.error}</p>
                  )}
                </div>
                <span className="text-xs text-[#94A3B8] flex-shrink-0 tabular-nums">
                  {formatMB(entry.file.size)}
                </span>
                {(entry.status === 'done' || entry.status === 'error') && (
                  <button
                    onClick={() => setQueue((prev) => prev.filter((e) => e.id !== entry.id))}
                    className="text-[#94A3B8] hover:text-[#64748B] flex-shrink-0"
                    aria-label="Dismiss"
                  >
                    <X size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
