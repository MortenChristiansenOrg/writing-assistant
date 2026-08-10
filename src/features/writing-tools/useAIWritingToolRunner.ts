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
const successResponseSchema = z.object({ text: z.string().min(1) })

export function writingToolOutputBudget(toolId: string): number {
  if (toolId === 'continue-scene') return 512
  if (toolId === 'alternate-pov') return 1_536
  return 768
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
    const response = await fetch(`${convexSiteUrl}/ai/tools/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        instructions: request.customPrompt,
        model: settings.defaultModel ?? 'anthropic/claude-sonnet-5',
        maxOutputTokens: writingToolOutputBudget(tool.id),
      }),
    })

    if (!response.ok) {
      const payload = errorResponseSchema.safeParse(
        await response.json().catch(() => null),
      )
      throw new Error(payload.success ? payload.data.error : 'AI request failed')
    }

    const payload = successResponseSchema.safeParse(
      await response.json().catch(() => null),
    )
    if (!payload.success) {
      throw new Error('The AI provider returned an invalid response. Try again.')
    }

    return parseAIWritingToolResult(tool, context, payload.data.text)
  }, [category, getConvexHttpToken, settings])
}
