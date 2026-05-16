import type { Document, Source } from '@/types'

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

export interface UploadResponse {
  document_id: string
  filename: string
  status: string
}

export interface QueryResponse {
  answer: string
  sources: Source[]
}

interface RawDocument {
  id: string
  filename: string
  status: string
  uploaded_at: string
}

export function mapDocument(raw: RawDocument): Document {
  const ext = raw.filename.split('.').pop()?.toUpperCase() ?? '—'
  return {
    id: raw.id,
    filename: raw.filename,
    fileType: ext,
    status: raw.status as Document['status'],
    uploadedAt: raw.uploaded_at,
  }
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Upload failed')
  }
  return res.json()
}

export async function queryDocuments(
  question: string,
  documentId?: string | null
): Promise<QueryResponse> {
  const res = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, document_id: documentId ?? null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Query failed')
  }
  return res.json()
}

export async function fetchDocuments(): Promise<Document[]> {
  if (!BASE) return []
  const res = await fetch(`${BASE}/documents`)
  if (!res.ok) return []
  const data: RawDocument[] = await res.json()
  return Array.isArray(data) ? data.map(mapDocument) : []
}
