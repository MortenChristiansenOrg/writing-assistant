import { mutation, query } from './_generated/server'

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return await ctx.db
      .query('users')
      .withIndex('by_token', (queryBuilder) =>
        queryBuilder.eq('tokenIdentifier', identity.tokenIdentifier),
      )
      .unique()
  },
})

export const ensureCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthorized')

    const existing = await ctx.db
      .query('users')
      .withIndex('by_token', (queryBuilder) =>
        queryBuilder.eq('tokenIdentifier', identity.tokenIdentifier),
      )
      .unique()

    const profile = {
      subject: identity.subject,
      issuer: identity.issuer,
      ...(identity.name !== undefined && { name: identity.name }),
      ...(identity.email !== undefined && { email: identity.email }),
      ...(identity.pictureUrl !== undefined && {
        imageUrl: identity.pictureUrl,
      }),
      lastSeenAt: Date.now(),
    }

    if (existing) {
      // replace intentionally clears optional profile fields removed in Clerk.
      await ctx.db.replace(existing._id, {
        tokenIdentifier: identity.tokenIdentifier,
        ...profile,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      tokenIdentifier: identity.tokenIdentifier,
      ...profile,
    })
  },
})
