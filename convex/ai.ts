import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import {
  generateText,
  Output,
  streamText,
  type LanguageModelUsage,
  type ProviderMetadata,
} from 'ai'
import { z } from 'zod'
import { internal } from './_generated/api'
import { httpAction, type ActionCtx } from './_generated/server'
import { getOpenRouterApiKey } from './credentials'
import { corsHeaders, isAllowedOrigin, jsonResponse } from './httpUtils'

const actionSchema = z.enum([
  'rewrite',
  'shorter',
  'longer',
  'formal',
  'casual',
  'fix_grammar',
])

const modelSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9._:/-]+$/)

const streamInput = z.object({
  action: actionSchema,
  text: z.string().min(1).max(100_000),
  persona: z.string().max(20_000).optional(),
  model: modelSchema.optional(),
  customPrompt: z.string().min(1).max(10_000).optional(),
})

const feedbackInput = z.object({
  text: z.string().max(100_000),
  persona: z.string().max(20_000).optional(),
  model: modelSchema.optional(),
  projectDescription: z.string().max(10_000).optional(),
  documentDescription: z.string().max(10_000).optional(),
  focusArea: z.string().max(5_000).optional(),
})

const feedbackNote = z.object({
  comment: z.string().min(1).max(4_000),
  severity: z.enum(['info', 'suggestion', 'warning']),
  category: z.string().min(1).max(100).optional(),
})

const ACTION_PROMPTS: Record<z.infer<typeof actionSchema>, string> = {
  rewrite:
    'Rewrite the following text while preserving its meaning. Make it clearer and more engaging.',
  shorter:
    'Make the following text more concise. Remove unnecessary words while preserving the core meaning.',
  longer:
    'Expand the following text with more detail and explanation while maintaining the same tone.',
  formal: 'Rewrite the following text in a more formal, professional tone.',
  casual:
    'Rewrite the following text in a more casual, conversational tone.',
  fix_grammar:
    'Fix any grammar, spelling, or punctuation errors in the following text. Only make corrections; do not change the style or meaning.',
}

const FEEDBACK_INSTRUCTIONS = `You are a literary editor reviewing a piece of writing. Provide specific, actionable feedback. Aim for 3-8 notes depending on text length. Each note has a short comment, a severity, and optionally a concise category such as pacing, dialogue, clarity, tone, structure, character, or consistency.`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function openRouterCost(
  metadata: ProviderMetadata | undefined,
): number {
  const provider = metadata?.openrouter
  if (!isRecord(provider) || !isRecord(provider.usage)) return 0
  if (typeof provider.usage.cost === 'number') {
    return Math.max(0, provider.usage.cost)
  }
  const costDetails = provider.usage.costDetails
  if (
    isRecord(costDetails) &&
    typeof costDetails.upstreamInferenceCost === 'number'
  ) {
    return Math.max(0, costDetails.upstreamInferenceCost)
  }
  return 0
}

async function recordUsage(
  ctx: ActionCtx,
  tokenIdentifier: string,
  model: string,
  usage: LanguageModelUsage,
  metadata: ProviderMetadata | undefined,
): Promise<void> {
  await ctx.runMutation(internal.spending.recordUsage, {
    tokenIdentifier,
    model,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalCost: openRouterCost(metadata),
  })
}

async function authenticate(ctx: ActionCtx, request: Request) {
  if (!isAllowedOrigin(request)) {
    return { response: jsonResponse(request, { error: 'Origin not allowed' }, 403) }
  }

  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return { response: jsonResponse(request, { error: 'Unauthorized' }, 401) }
  }

  const spending = await ctx.runQuery(internal.spending.getThresholdStatus, {
    tokenIdentifier: identity.tokenIdentifier,
  })
  if (spending && spending.totalCost >= spending.threshold) {
    return {
      response: jsonResponse(
        request,
        { error: 'Daily AI spending limit reached' },
        429,
      ),
    }
  }

  const apiKey = await getOpenRouterApiKey(ctx, identity.tokenIdentifier)
  if (!apiKey) {
    return {
      response: jsonResponse(
        request,
        { error: 'Configure an OpenRouter API key in settings' },
        409,
      ),
    }
  }

  return { identity, apiKey }
}

export const stream = httpAction(async (ctx, request) => {
  const authentication = await authenticate(ctx, request)
  if ('response' in authentication) return authentication.response

  const parsed = streamInput.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse(request, { error: 'Invalid request' }, 400)
  }

  const { action, text, persona, model, customPrompt } = parsed.data
  const selectedModel = model ?? 'anthropic/claude-sonnet-5'
  const actionPrompt = customPrompt ?? ACTION_PROMPTS[action]
  const instructions = persona
    ? `${persona}\n\n${actionPrompt}`
    : actionPrompt
  const inputTokenEstimate = Math.ceil(text.length / 4)
  const outputMultiplier = action === 'longer' ? 3 : action === 'shorter' ? 0.75 : 1.5
  const maxOutputTokens = Math.max(
    256,
    Math.min(4096, Math.ceil(inputTokenEstimate * outputMultiplier)),
  )

  try {
    const openrouter = createOpenRouter({ apiKey: authentication.apiKey })
    const result = streamText({
      model: openrouter(selectedModel, { usage: { include: true } }),
      instructions,
      prompt: text,
      maxOutputTokens,
    })
    const encoder = new TextEncoder()
    const responseStream = new ReadableStream({
      async start(controller) {
        let hasContent = false
        let streamError: string | undefined
        try {
          for await (const part of result.stream) {
            if (part.type === 'text-delta') {
              controller.enqueue(encoder.encode(part.text))
              hasContent = true
            } else if (part.type === 'error') {
              streamError = 'The AI provider rejected the request'
              break
            }
          }
        } catch {
          streamError = 'AI request failed'
        }

        if (!streamError) {
          try {
            if ((await result.finishReason) === 'length') {
              streamError = 'AI response was truncated; try a smaller selection'
            }
          } catch {
            streamError = 'AI request failed'
          }
        }

        if (streamError) {
          controller.enqueue(encoder.encode(`__AI_ERROR__:${streamError}`))
        } else if (!hasContent) {
          controller.enqueue(encoder.encode('__AI_ERROR__:No response from AI'))
        }

        try {
          const [usage, finalStep] = await Promise.all([
            result.usage,
            result.finalStep,
          ])
          await recordUsage(
            ctx,
            authentication.identity.tokenIdentifier,
            selectedModel,
            usage,
            finalStep.providerMetadata,
          )
        } catch {
          console.error('Failed to record AI usage')
        }

        controller.close()
      },
    })

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...corsHeaders(request),
      },
    })
  } catch {
    return jsonResponse(request, { error: 'AI request failed' }, 502)
  }
})

export const feedback = httpAction(async (ctx, request) => {
  const authentication = await authenticate(ctx, request)
  if ('response' in authentication) return authentication.response

  const parsed = feedbackInput.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse(request, { error: 'Invalid request' }, 400)
  }

  const {
    text,
    persona,
    model,
    projectDescription,
    documentDescription,
    focusArea,
  } = parsed.data
  const selectedModel = model ?? 'anthropic/claude-sonnet-5'
  const instructions = persona
    ? `${persona}\n\n${FEEDBACK_INSTRUCTIONS}`
    : FEEDBACK_INSTRUCTIONS
  const context = [
    projectDescription && `Project context: ${projectDescription}`,
    documentDescription && `Document description: ${documentDescription}`,
    focusArea && `Focus area: ${focusArea}`,
    text || '(No text written yet; review the supplied context.)',
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const openrouter = createOpenRouter({ apiKey: authentication.apiKey })
    const result = await generateText({
      model: openrouter(selectedModel, {
        usage: { include: true },
        plugins: [{ id: 'response-healing' }],
      }),
      instructions,
      prompt: context,
      maxOutputTokens: 2048,
      output: Output.array({ element: feedbackNote }),
    })
    await recordUsage(
      ctx,
      authentication.identity.tokenIdentifier,
      selectedModel,
      result.usage,
      result.finalStep.providerMetadata,
    )
    if (!Array.isArray(result.output)) {
      return jsonResponse(
        request,
        { error: 'AI feedback request failed' },
        502,
      )
    }
    return jsonResponse(request, result.output)
  } catch {
    return jsonResponse(request, { error: 'AI feedback request failed' }, 502)
  }
})
