'use client'

import { useQuery } from '@tanstack/react-query'
import type { Document } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL

async function fetchDocuments(): Promise<Document[]> {
  if (!API_URL) {
    return []
  }
  try {
    const res = await fetch(`${API_URL}/documents`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
    initialData: [],
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      const hasActiveDoc = data.some(
        (doc) => doc.status === 'pending' || doc.status === 'processing'
      )
      return hasActiveDoc ? 3000 : false
    },
  })
}
