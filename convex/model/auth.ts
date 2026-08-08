import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'

type AuthenticatedDatabaseContext = Pick<QueryCtx | MutationCtx, 'auth' | 'db'>

export async function getCurrentUserId(
  ctx: AuthenticatedDatabaseContext,
): Promise<Id<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const user = await ctx.db
    .query('users')
    .withIndex('by_token', (query) =>
      query.eq('tokenIdentifier', identity.tokenIdentifier),
    )
    .unique()

  return user?._id ?? null
}

export async function requireCurrentUserId(
  ctx: AuthenticatedDatabaseContext,
): Promise<Id<'users'>> {
  const userId = await getCurrentUserId(ctx)
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}
