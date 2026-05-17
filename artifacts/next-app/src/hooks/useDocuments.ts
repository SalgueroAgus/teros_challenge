'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaginatedDocuments } from '@/lib/api'
import { deleteDocument, fetchDocuments } from '@/lib/api'

export function useDocuments(page = 1) {
  return useQuery<PaginatedDocuments>({
    queryKey: ['documents', page],
    queryFn: () => fetchDocuments(page),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      const hasActiveDoc = data.items.some(
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
