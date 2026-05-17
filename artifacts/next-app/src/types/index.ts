export type DocumentStatus = 'pending' | 'processing' | 'done' | 'error'

export type FileUploadState = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export interface Document {
  id: string
  filename: string
  fileType: string
  status: DocumentStatus
  uploadedAt: string
}

export interface Source {
  chunk_id: string
  content: string
  similarity: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Source[]
}
