import { useCallback, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { z } from 'zod'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { convexSiteUrl } from '@/lib/convex-url'
import { toast } from 'sonner'
import { useConvexHttpToken } from './useConvexHttpToken'

const feedbackNotesSchema = z.array(
  z.object({
    comment: z.string().min(1),
    severity: z.enum(['info', 'suggestion', 'warning']),
    category: z.string().optional(),
  }),
)

type FeedbackNote = z.infer<typeof feedbackNotesSchema>[number]

export function useAIFeedback(documentId: Id<'documents'> | undefined) {
  const settings = useQuery(api.userSettings.get)
  const createBatch = useMutation(api.reviewNotes.createBatch)
  const updateNote = useMutation(api.reviewNotes.update)
  const getConvexHttpToken = useConvexHttpToken()
  const [loading, setLoading] = useState(false)
  const [reReviewingId, setReReviewingId] = useState<Id<'reviewNotes'> | null>(null)

  const postFeedback = useCallback(
    async (body: Record<string, string>): Promise<FeedbackNote[]> => {
      const token = await getConvexHttpToken()
      const response = await fetch(`${convexSiteUrl}/ai/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const parsedError = z.object({ error: z.string() }).safeParse(payload)
        throw new Error(
          parsedError.success ? parsedError.data.error : 'Request failed',
        )
      }

      const parsedNotes = feedbackNotesSchema.safeParse(payload)
      if (!parsedNotes.success) {
        throw new Error('AI returned an invalid feedback response')
      }
      return parsedNotes.data
    },
    [getConvexHttpToken],
  )

  const requestFeedback = async (
    text: string,
    persona: { id?: Id<'personas'>; name: string; systemPrompt: string; model?: string },
    options?: { projectDescription?: string; documentDescription?: string; focusArea?: string }
  ) => {
    if (!settings?.hasOpenRouterKey) {
      toast.error('Please add your OpenRouter API key in settings')
      return
    }

    if (!documentId) {
      toast.error('Document not loaded yet')
      return
    }

    setLoading(true)
    try {
      const model = persona.model ?? settings.defaultModel ?? 'anthropic/claude-sonnet-5'

      const body: Record<string, string> = {
        text,
        persona: persona.systemPrompt,
        model,
      }
      if (options?.projectDescription) body.projectDescription = options.projectDescription
      if (options?.documentDescription) body.documentDescription = options.documentDescription
      if (options?.focusArea) body.focusArea = options.focusArea

      const notes = await postFeedback(body)

      const batch: Parameters<typeof createBatch>[0] = {
        documentId,
        personaName: persona.name,
        model,
        notes: notes.map((note) => ({
          comment: note.comment,
          severity: note.severity,
          ...(note.category !== undefined && { category: note.category }),
        })),
      }
      if (persona.id) batch.personaId = persona.id
      await createBatch(batch)

      toast.success(`${notes.length} notes from ${persona.name}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Feedback request failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const reReview = async (
    noteId: Id<'reviewNotes'>,
    originalComment: string,
    text: string,
    personaPrompt: string,
    personaModel?: string
  ) => {
    if (!settings?.hasOpenRouterKey) {
      toast.error('Please add your OpenRouter API key in settings')
      return
    }

    setReReviewingId(noteId)
    try {
      const model = personaModel ?? settings.defaultModel ?? 'anthropic/claude-sonnet-5'

      const reReviewPrompt = `Re-evaluate this specific editorial feedback in light of the current text. Has the issue been addressed? Respond with a SINGLE JSON array item (still wrapped in []) with updated comment, severity, and optional category.\n\nOriginal feedback: "${originalComment}"`

      const notes = await postFeedback({
        text,
        persona: personaPrompt
          ? `${personaPrompt}\n\n${reReviewPrompt}`
          : reReviewPrompt,
        model,
      })
      if (notes.length > 0) {
        const updated = notes[0]!
        await updateNote({
          id: noteId,
          comment: updated.comment,
          severity: updated.severity,
          category: updated.category ?? null,
        })
        toast.success('Note re-reviewed')
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Re-review failed'
      toast.error(msg)
    } finally {
      setReReviewingId(null)
    }
  }

  return {
    requestFeedback,
    reReview,
    loading,
    reReviewingId,
    hasApiKey: Boolean(settings?.hasOpenRouterKey),
  }
}
