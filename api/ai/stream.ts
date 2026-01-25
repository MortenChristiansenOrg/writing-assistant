import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const config = {
  runtime: 'edge',
}

const ACTION_PROMPTS: Record<string, string> = {
  rewrite:
    'Rewrite the following text while preserving its meaning. Make it clearer and more engaging.',
  shorter:
    'Make the following text more concise. Remove unnecessary words while preserving the core meaning.',
  longer:
    'Expand the following text with more detail and explanation while maintaining the same tone.',
  formal:
    'Rewrite the following text in a more formal, professional tone.',
  casual:
    'Rewrite the following text in a more casual, conversational tone.',
  fix_grammar:
    'Fix any grammar, spelling, or punctuation errors in the following text. Only make corrections, do not change the style or meaning.',
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { action, text, persona, model, apiKey } = body as {
      action: string
      text: string
      persona?: string
      model?: string
      apiKey: string
    }

    if (!action || !text || !apiKey) {
      return new Response('Missing required fields', { status: 400 })
    }

    const actionPrompt = ACTION_PROMPTS[action]
    if (!actionPrompt) {
      return new Response('Invalid action', { status: 400 })
    }

    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    })

    const selectedModel = model ?? 'anthropic/claude-3.5-sonnet'

    const systemPrompt = persona
      ? `${persona}\n\n${actionPrompt}`
      : actionPrompt

    const result = streamText({
      model: openrouter(selectedModel),
      system: systemPrompt,
      prompt: text,
      maxTokens: 2048,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('AI stream error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
