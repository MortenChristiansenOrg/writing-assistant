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

export function useAIFeedback(documentId: Id<'documents'>) {
  const settings = useQuery(api.userSettings.get)
  const createBatch = useMutation(api.reviewNotes.createBatch)
  const recordSpending = useMutation(api.spending.record)
  const [loading, setLoading] = useState(false)

  const requestFeedback = async (
    text: string,
    persona: { id?: Id<'personas'>; name: string; systemPrompt: string; model?: string }
  ) => {
    if (!settings?.vaultKeyId) {
      toast.error('Please add your OpenRouter API key in settings')
      return
    }

    setLoading(true)
    try {
      const model = persona.model ?? settings.defaultModel ?? 'anthropic/claude-sonnet-4'

      const res = await fetch(`${convexSiteUrl}/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          persona: persona.systemPrompt,
          model,
          apiKey: settings.vaultKeyId,
        }),
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

  return {
    requestFeedback,
    loading,
    hasApiKey: !!settings?.vaultKeyId,
  }
}
