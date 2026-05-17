'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Document } from '@/types'
import { deleteDocument, fetchDocuments } from '@/lib/api'

export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
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

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
