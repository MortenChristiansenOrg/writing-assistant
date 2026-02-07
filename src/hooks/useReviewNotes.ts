import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function useReviewNotes(documentId: Id<'documents'>) {
  const notes = useQuery(api.reviewNotes.list, { documentId })
  const dismissMutation = useMutation(api.reviewNotes.dismiss)
  const undismissMutation = useMutation(api.reviewNotes.undismiss)
  const clearAllMutation = useMutation(api.reviewNotes.deleteForDocument)

  return {
    notes: notes ?? [],
    dismiss: (id: Id<'reviewNotes'>) => dismissMutation({ id }),
    undismiss: (id: Id<'reviewNotes'>) => undismissMutation({ id }),
    clearAll: () => clearAllMutation({ documentId }),
  }
}
