'use client'

import { useQuery } from '@tanstack/react-query'
import type { Document } from '@/types'
import { fetchDocuments } from '@/lib/api'

export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
    placeholderData: [],
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
