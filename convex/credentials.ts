import { z } from 'zod'
import { internal } from './_generated/api'
import { httpAction, type ActionCtx } from './_generated/server'
import { corsHeaders, isAllowedOrigin, jsonResponse } from './httpUtils'
import { decryptSecret, encryptSecret } from './model/secrets'

const apiKeyInput = z.object({
  apiKey: z.string().trim().min(10).max(512),
})

export async function getOpenRouterApiKey(
  ctx: ActionCtx,
  tokenIdentifier: string,
): Promise<string | null> {
  const encrypted = await ctx.runQuery(
    internal.userSettings.getEncryptedOpenRouterKey,
    { tokenIdentifier },
  )
  if (!encrypted) return null
  const decrypted = await decryptSecret(encrypted, tokenIdentifier)
  if (!decrypted) return null

  if (decrypted.needsRotation) {
    try {
      const rotated = await encryptSecret(decrypted.plaintext, tokenIdentifier)
      await ctx.runMutation(
        internal.userSettings.storeEncryptedOpenRouterKey,
        { tokenIdentifier, ...rotated },
      )
    } catch {
      console.error('Stored OpenRouter credential rotation failed')
    }
  }

  return decrypted.plaintext
}

export const saveOpenRouterKey = httpAction(async (ctx, request) => {
  if (!isAllowedOrigin(request)) {
    return jsonResponse(request, { error: 'Origin not allowed' }, 403)
  }

  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401)
  }

  const parsed = apiKeyInput.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse(request, { error: 'Invalid API key' }, 400)
  }

  try {
    const encrypted = await encryptSecret(
      parsed.data.apiKey,
      identity.tokenIdentifier,
    )
    await ctx.runMutation(internal.userSettings.storeEncryptedOpenRouterKey, {
      tokenIdentifier: identity.tokenIdentifier,
      ...encrypted,
    })
    return jsonResponse(request, { configured: true })
  } catch {
    console.error('Failed to store OpenRouter credential')
    return jsonResponse(request, { error: 'Could not store API key' }, 500)
  }
})

export const deleteOpenRouterKey = httpAction(async (ctx, request) => {
  if (!isAllowedOrigin(request)) {
    return jsonResponse(request, { error: 'Origin not allowed' }, 403)
  }

  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401)
  }

  await ctx.runMutation(internal.userSettings.clearEncryptedOpenRouterKey, {
    tokenIdentifier: identity.tokenIdentifier,
  })
  return new Response(null, { status: 204, headers: corsHeaders(request) })
})

export const preflight = httpAction(async (_ctx, request) => {
  if (!isAllowedOrigin(request)) {
    return new Response(null, { status: 403, headers: corsHeaders(request) })
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) })
})
