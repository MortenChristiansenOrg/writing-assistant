import { httpAction } from './_generated/server'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText, generateText } from 'ai'

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
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
    }
    const { action, text, persona, model, apiKey, customPrompt } = body as {
      action: string
      text: string
      persona?: string
      model?: string
      apiKey: string
      customPrompt?: string
    }

    if (!action || !text || !apiKey) {
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    const actionPrompt = customPrompt ?? ACTION_PROMPTS[action]
    if (!actionPrompt) {
      return new Response('Invalid action', { status: 400, headers: corsHeaders })
    }

    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    })

    const selectedModel = model ?? 'anthropic/claude-sonnet-4'

    const systemPrompt = persona
      ? `${persona}\n\n${actionPrompt}`
      : actionPrompt

    // Estimate input tokens (~4 chars per token), scale output by action type
    const inputTokenEstimate = Math.ceil(text.length / 4)
    const outputMultiplier = action === 'longer' ? 3 : action === 'shorter' ? 0.75 : 1.5
    const maxTokens = Math.max(256, Math.min(4096, Math.ceil(inputTokenEstimate * outputMultiplier)))

    const result = streamText({
      model: openrouter(selectedModel),
      system: systemPrompt,
      prompt: text,
      maxOutputTokens: maxTokens,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let hasContent = false
        try {
          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              controller.enqueue(encoder.encode(part.text))
              hasContent = true
            } else if (part.type === 'error') {
              const err = part.error
              const msg = err instanceof Error ? err.message : String(err)
              controller.enqueue(encoder.encode(`__AI_ERROR__:${msg}`))
              controller.close()
              return
            }
          }
          if (!hasContent) {
            controller.enqueue(encoder.encode(`__AI_ERROR__:No response from AI`))
          }
          controller.close()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'AI request failed'
          controller.enqueue(encoder.encode(`__AI_ERROR__:${msg}`))
          controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders },
    })
  } catch (error) {
    console.error('AI stream error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

const FEEDBACK_SYSTEM = `You are a literary editor reviewing a piece of writing. Provide editorial feedback as a JSON array. Each item must have:
- "comment": a specific, actionable note (1-3 sentences)
- "severity": one of "info", "suggestion", or "warning"
- "category": optional tag like "pacing", "dialog", "clarity", "tone", "structure", "character", "consistency"

Return ONLY a valid JSON array, no markdown fencing or other text. Aim for 3-8 notes depending on text length.`

export const feedback = httpAction(async (_ctx, request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
    }
    const { text, persona, model, apiKey, projectDescription, documentDescription, focusArea } = body as {
      text: string
      persona?: string
      model?: string
      apiKey: string
      projectDescription?: string
      documentDescription?: string
      focusArea?: string
    }

    if (text == null || !apiKey) {
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    })

    const selectedModel = model ?? 'anthropic/claude-sonnet-4'
    const systemPrompt = persona
      ? `${persona}\n\n${FEEDBACK_SYSTEM}`
      : FEEDBACK_SYSTEM

    let prompt = ''
    if (projectDescription) prompt += `Project context: ${projectDescription}\n\n`
    if (documentDescription) prompt += `Document description: ${documentDescription}\n\n`
    if (focusArea) prompt += `Focus area: The reviewer specifically asked you to focus on: ${focusArea}\n\n`
    if (text) prompt += text
    else prompt += '(No text written yet — provide feedback based on the context and focus area above.)'

    const result = await generateText({
      model: openrouter(selectedModel),
      system: systemPrompt,
      prompt,
      maxOutputTokens: 2048,
    })

    // Validate JSON array
    let notes: unknown
    try {
      notes = JSON.parse(result.text)
      if (!Array.isArray(notes)) throw new Error('Not an array')
      for (const note of notes) {
        if (typeof note !== 'object' || note === null) throw new Error('Invalid note')
        if (typeof (note as Record<string, unknown>).comment !== 'string') throw new Error('Missing comment')
        if (!['info', 'suggestion', 'warning'].includes((note as Record<string, unknown>).severity as string))
          throw new Error('Invalid severity')
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: result.text }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    return new Response(JSON.stringify(notes), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    console.error('AI feedback error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'AI request failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
