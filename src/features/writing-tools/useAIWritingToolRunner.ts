import { useCallback } from 'react'
import { useQuery } from 'convex/react'
import { z } from 'zod'
import { api } from '../../../convex/_generated/api'
import { useConvexHttpToken } from '@/hooks/useConvexHttpToken'
import { convexSiteUrl } from '@/lib/convex-url'
import { buildAIWritingToolRequest, parseAIWritingToolResult } from './ai-runner'
import type {
  ProjectCategoryId,
  WritingToolRunner,
} from './types'

const errorResponseSchema = z.object({ error: z.string().min(1) })
const streamErrorMarker = '__AI_ERROR__:'
// The shared streaming endpoint derives its output allowance from the prompt
// length. Tool instructions live separately in `customPrompt`, so short drafts
// otherwise receive only 256 output tokens and structured JSON can be cut off.
// Padding reaches the endpoint's 4,096-token ceiling without changing the
// manuscript content or encouraging the model to produce a longer response.
const minimumBudgetInputCharacters = 5_500

export function ensureWritingToolOutputBudget(text: string): string {
  return text.padEnd(minimumBudgetInputCharacters, ' ')
}

export function useAIWritingToolRunner(
  category: ProjectCategoryId,
): WritingToolRunner {
  const settings = useQuery(api.userSettings.get)
  const getConvexHttpToken = useConvexHttpToken()

  return useCallback<WritingToolRunner>(async (tool, context, parameters) => {
    if (settings === undefined) {
      throw new Error('AI settings are still loading. Try again in a moment.')
    }
    if (!settings?.hasOpenRouterKey) {
      throw new Error('Add your OpenRouter API key in Settings before using AI tools.')
    }

    const token = await getConvexHttpToken()
    const request = buildAIWritingToolRequest(tool, category, context, parameters)
    const response = await fetch(`${convexSiteUrl}/ai/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'longer',
        text: ensureWritingToolOutputBudget(request.text),
        customPrompt: request.customPrompt,
        model: settings.defaultModel ?? 'anthropic/claude-sonnet-5',
      }),
    })

    if (!response.ok) {
      const payload = errorResponseSchema.safeParse(
        await response.json().catch(() => null),
      )
      throw new Error(payload.success ? payload.data.error : 'AI request failed')
    }

    const responseText = await response.text()
    const errorOffset = responseText.indexOf(streamErrorMarker)
    if (errorOffset >= 0) {
      throw new Error(responseText.slice(errorOffset + streamErrorMarker.length))
    }

    return parseAIWritingToolResult(tool, context, responseText)
  }, [category, getConvexHttpToken, settings])
}
