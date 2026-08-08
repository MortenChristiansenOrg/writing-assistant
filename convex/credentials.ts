import { z } from 'zod'
import { internal } from './_generated/api'
import { httpAction, type ActionCtx } from './_generated/server'
import { corsHeaders, isAllowedOrigin, jsonResponse } from './httpUtils'
import { decryptSecret, encryptSecret } from './model/secrets'

const apiKeyInput = z.object({
  apiKey: z.string().trim().min(10).max(512),
})

async function requireIdentity(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Unauthorized')
  return identity
}

export async function getOpenRouterApiKey(
  ctx: ActionCtx,
  tokenIdentifier: string,
): Promise<string | null> {
  const encrypted = await ctx.runQuery(
    internal.userSettings.getEncryptedOpenRouterKey,
    { tokenIdentifier },
  )
  if (!encrypted) return null
  return await decryptSecret(encrypted, tokenIdentifier)
}

export const saveOpenRouterKey = httpAction(async (ctx, request) => {
  if (!isAllowedOrigin(request)) {
    return jsonResponse(request, { error: 'Origin not allowed' }, 403)
  }

  let identity
  try {
    identity = await requireIdentity(ctx)
  } catch {
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
    return jsonResponse(request, { error: 'Could not store API key' }, 500)
  }
})

export const credentialOptions = httpAction(async (_ctx, request) => {
  if (!isAllowedOrigin(request)) {
    return new Response(null, { status: 403, headers: corsHeaders(request) })
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) })
})
