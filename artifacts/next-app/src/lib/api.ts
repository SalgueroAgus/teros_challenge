import type { Document, Source } from '@/types'

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? ''

function authHeaders(): HeadersInit {
  return API_KEY ? { 'X-API-Key': API_KEY } : {}
}

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
    headers: authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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

const EMPTY_PAGE = (page: number): PaginatedDocuments => ({
  items: [],
  total: 0,
  page,
  pageSize: 10,
  totalPages: 1,
})

export async function fetchDocuments(page = 1): Promise<PaginatedDocuments> {
  if (!BASE) return EMPTY_PAGE(page)
  const res = await fetch(`${BASE}/documents?page=${page}&page_size=10`, { headers: authHeaders() })
  if (!res.ok) return EMPTY_PAGE(page)
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
  const res = await fetch(`${BASE}/documents/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Delete failed')
  }
}
