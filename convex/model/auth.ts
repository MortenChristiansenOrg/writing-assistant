import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'

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

export async function getActiveOwnedDocument(
  ctx: AuthenticatedDatabaseContext,
  documentId: Id<'documents'>,
  userId: Id<'users'>,
): Promise<Doc<'documents'> | null> {
  const document = await ctx.db.get(documentId)
  if (
    !document ||
    document.userId !== userId ||
    document.deletingAt !== undefined
  ) {
    return null
  }

  const project = await ctx.db.get(document.projectId)
  if (
    !project ||
    project.userId !== userId ||
    project.deletingAt !== undefined
  ) {
    return null
  }

  return document
}
