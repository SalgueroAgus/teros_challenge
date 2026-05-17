'use client'

import { useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { AlertCircle, Check, Loader2, Paperclip, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileUploadState } from '@/types'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  attachedFile: File | null
  fileUploadState: FileUploadState
  onAttach: (file: File) => void
  onRemoveAttachment: () => void
  isLoading: boolean
  activeDocumentName?: string | null
  onClearActiveDocument?: () => void
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'text/csv': ['.csv'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  attachedFile,
  fileUploadState,
  onAttach,
  onRemoveAttachment,
  isLoading,
  activeDocumentName,
  onClearActiveDocument,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onAttach(acceptedFiles[0])
      }
    },
    [onAttach]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  })

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && value.trim() && fileUploadState !== 'uploading' && fileUploadState !== 'processing') {
        onSubmit()
      }
    }
  }

  const isFileProcessing = fileUploadState === 'uploading' || fileUploadState === 'processing'
  const sendDisabled = isLoading || !value.trim() || isFileProcessing

  return (
    <div
      {...getRootProps()}
      className={cn(
        'w-full max-w-2xl mx-auto px-4',
        isDragActive && 'ring-2 ring-[#4F6CF7] ring-offset-2 rounded-2xl'
      )}
    >
      {/* Active document context badge */}
      {activeDocumentName && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="text-xs text-[#64748B]">Context:</span>
          <div className="flex items-center gap-1 bg-[#EEF2FF] text-[#4F6CF7] px-2 py-0.5 rounded-full">
            <span className="text-xs font-medium">{activeDocumentName}</span>
            {onClearActiveDocument && (
              <button
                onClick={onClearActiveDocument}
                className="ml-0.5 hover:text-red-400 flex-shrink-0"
                aria-label="Clear document context"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* File attachment chip */}
      {attachedFile && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div
            className={cn(
              'flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 text-xs shadow-sm border transition-colors',
              fileUploadState === 'done'
                ? 'border-green-400'
                : fileUploadState === 'error'
                  ? 'border-red-400'
                  : 'border-gray-200'
            )}
          >
            {/* Left status icon */}
            {isFileProcessing && (
              <Loader2 size={12} className="animate-spin text-[#64748B] flex-shrink-0" />
            )}
            {fileUploadState === 'done' && (
              <Check size={12} className="text-green-500 flex-shrink-0" />
            )}
            {fileUploadState === 'error' && (
              <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
            )}
            {fileUploadState === 'idle' && (
              <Paperclip size={12} className="text-[#64748B] flex-shrink-0" />
            )}

            <span
              className={cn(
                'truncate max-w-[200px]',
                fileUploadState === 'done' && 'text-green-700',
                fileUploadState === 'error' && 'text-red-600',
                (isFileProcessing || fileUploadState === 'idle') && 'text-[#0F172A]'
              )}
            >
              {attachedFile.name}
            </span>

            {/* Remove button — always available so users can cancel mid-upload */}
            <button
              onClick={onRemoveAttachment}
              className="ml-1 text-[#64748B] hover:text-red-500 flex-shrink-0"
              aria-label="Remove attachment"
            >
              <X size={12} />
            </button>
          </div>

          {/* Processing hint */}
          {isFileProcessing && (
            <span className="text-xs text-[#94A3B8]">
              {fileUploadState === 'uploading' ? 'Uploading…' : 'Processing…'}
            </span>
          )}
        </div>
      )}

      {/* Input bar */}
      <div
        className={cn(
          'flex items-end gap-2 bg-white rounded-2xl shadow-sm border border-gray-100 px-3 py-2',
          isDragActive && 'border-[#4F6CF7]'
        )}
      >
        {/* Hidden dropzone input */}
        <input {...getInputProps()} />

        {/* Paperclip button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#4F6CF7] hover:bg-[#F0F4FF]"
          aria-label="Attach file"
        >
          <Paperclip size={17} />
        </button>

        {/* Hidden file input for click-to-upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              onAttach(file)
              e.target.value = ''
            }
          }}
        />

        {/* Text area */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isFileProcessing
              ? 'Waiting for file to finish processing…'
              : 'Ask me anything about your finances...'
          }
          disabled={isLoading}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-[#0F172A] placeholder-[#94A3B8]',
            'focus:outline-none leading-relaxed py-1.5 max-h-32 overflow-y-auto',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
          style={{ minHeight: '36px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = `${Math.min(target.scrollHeight, 128)}px`
          }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={() => onSubmit()}
          disabled={sendDisabled}
          className={cn(
            'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg',
            'bg-[#4F6CF7] text-white',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'hover:bg-[#3B5BDB] focus:outline-none focus:ring-2 focus:ring-[#4F6CF7] focus:ring-offset-1'
          )}
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </div>

      {/* Drag hint */}
      {isDragActive && (
        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-[#4F6CF7] bg-[#EEF2FF]/80 flex items-center justify-center pointer-events-none">
          <span className="text-[#4F6CF7] font-medium text-sm">Drop file here</span>
        </div>
      )}
    </div>
  )
}
