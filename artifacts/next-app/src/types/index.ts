export type DocumentStatus = 'pending' | 'processing' | 'done' | 'error'

export interface Document {
  id: string
  filename: string
  fileType: string
  status: DocumentStatus
  uploadedAt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
