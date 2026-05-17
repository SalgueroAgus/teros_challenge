import type { Document, Source } from '@/types'

// All requests go through Next.js route handlers — the API key never reaches the browser.
// In production, add Supabase Auth + RLS to scope documents per user.
const BASE = '/api'

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
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body: formData,
  })
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

export interface PaginatedDocuments {
  items: Document[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function fetchDocuments(page = 1): Promise<PaginatedDocuments> {
  const res = await fetch(`${BASE}/documents?page=${page}&page_size=10`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Failed to fetch documents (${res.status})`)
  }
  const data = await res.json()
  return {
    items: Array.isArray(data.items) ? data.items.map(mapDocument) : [],
    total: data.total ?? 0,
    page: data.page ?? page,
    pageSize: data.page_size ?? 10,
    totalPages: data.total_pages ?? 1,
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE}/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Delete failed')
  }
}

// Polls GET /documents until the given document reaches 'done' or 'error'.
// Newly uploaded docs are always on page 1 (sorted by uploaded_at desc).
// Pass an AbortSignal to stop polling when the user removes the attachment.
export async function pollDocumentReady(
  documentId: string,
  signal?: AbortSignal,
): Promise<'done' | 'error'> {
  const MAX_ATTEMPTS = 30  // 30 × 2 s = 60 s max wait
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 2000)
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
    })
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      const data = await fetchDocuments(1)
      const doc = data.items.find(d => d.id === documentId)
      if (doc?.status === 'done') return 'done'
      if (doc?.status === 'error') return 'error'
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      // transient network error — keep polling
    }
  }
  return 'error'
}
