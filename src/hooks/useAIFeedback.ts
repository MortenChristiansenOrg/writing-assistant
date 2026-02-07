import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { convexSiteUrl } from '@/lib/convex-url'
import { toast } from 'sonner'

interface FeedbackNote {
  comment: string
  severity: 'info' | 'suggestion' | 'warning'
  category?: string
}

export function useAIFeedback(documentId: Id<'documents'> | undefined) {
  const settings = useQuery(api.userSettings.get)
  const createBatch = useMutation(api.reviewNotes.createBatch)
  const updateNote = useMutation(api.reviewNotes.update)
  const recordSpending = useMutation(api.spending.record)
  const [loading, setLoading] = useState(false)
  const [reReviewingId, setReReviewingId] = useState<Id<'reviewNotes'> | null>(null)

  const requestFeedback = async (
    text: string,
    persona: { id?: Id<'personas'>; name: string; systemPrompt: string; model?: string },
    options?: { projectDescription?: string; documentDescription?: string; focusArea?: string }
  ) => {
    if (!settings?.vaultKeyId) {
      toast.error('Please add your OpenRouter API key in settings')
      return
    }

    if (!documentId) {
      toast.error('Document not loaded yet')
      return
    }

    setLoading(true)
    try {
      const model = persona.model ?? settings.defaultModel ?? 'anthropic/claude-sonnet-4'

      const body: Record<string, string> = {
        text,
        persona: persona.systemPrompt,
        model,
        apiKey: settings.vaultKeyId,
      }
      if (options?.projectDescription) body.projectDescription = options.projectDescription
      if (options?.documentDescription) body.documentDescription = options.documentDescription
      if (options?.focusArea) body.focusArea = options.focusArea

      const res = await fetch(`${convexSiteUrl}/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error((err as { error?: string }).error ?? 'Request failed')
      }

      const notes = (await res.json()) as FeedbackNote[]

      const batch: Parameters<typeof createBatch>[0] = {
        documentId,
        personaName: persona.name,
        model,
        notes,
      }
      if (persona.id) batch.personaId = persona.id
      await createBatch(batch)

      // Estimate spending (~4 chars/token)
      const inputTokens = Math.ceil(text.length / 4)
      const outputTokens = Math.ceil(JSON.stringify(notes).length / 4)
      recordSpending({ model, inputTokens, outputTokens }).catch(console.error)

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
    if (!settings?.vaultKeyId) {
      toast.error('Please add your OpenRouter API key in settings')
      return
    }

    setReReviewingId(noteId)
    try {
      const model = personaModel ?? settings.defaultModel ?? 'anthropic/claude-sonnet-4'

      const reReviewPrompt = `Re-evaluate this specific editorial feedback in light of the current text. Has the issue been addressed? Respond with a SINGLE JSON array item (still wrapped in []) with updated comment, severity, and optional category.\n\nOriginal feedback: "${originalComment}"`

      const res = await fetch(`${convexSiteUrl}/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          persona: personaPrompt ? `${personaPrompt}\n\n${reReviewPrompt}` : reReviewPrompt,
          model,
          apiKey: settings.vaultKeyId,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error((err as { error?: string }).error ?? 'Request failed')
      }

      const notes = (await res.json()) as FeedbackNote[]
      if (notes.length > 0) {
        const updated = notes[0]!
        await updateNote({ id: noteId, comment: updated.comment, severity: updated.severity })
        toast.success('Note re-reviewed')
      }

      const inputTokens = Math.ceil(text.length / 4)
      const outputTokens = Math.ceil(JSON.stringify(notes).length / 4)
      recordSpending({ model, inputTokens, outputTokens }).catch(console.error)
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
    hasApiKey: !!settings?.vaultKeyId,
  }
}
