import { httpAction } from './_generated/server'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

export const stream = httpAction(async (_ctx, request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await request.json()
    const { action, text, persona, model, apiKey } = body as {
      action: string
      text: string
      persona?: string
      model?: string
      apiKey: string
    }

    if (!action || !text || !apiKey) {
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    const actionPrompt = ACTION_PROMPTS[action]
    if (!actionPrompt) {
      return new Response('Invalid action', { status: 400, headers: corsHeaders })
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
    })

    const response = result.toTextStreamResponse()
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  } catch (error) {
    console.error('AI stream error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
