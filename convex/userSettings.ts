import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    return (
      settings ?? {
        userId,
        defaultModel: 'anthropic/claude-3.5-sonnet',
        spendingThreshold: 1.0,
        vaultKeyId: undefined,
      }
    )
  },
})

export const upsert = mutation({
  args: {
    defaultModel: v.optional(v.string()),
    spendingThreshold: v.optional(v.number()),
    vaultKeyId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.defaultModel !== undefined && {
          defaultModel: args.defaultModel,
        }),
        ...(args.spendingThreshold !== undefined && {
          spendingThreshold: args.spendingThreshold,
        }),
        ...(args.vaultKeyId !== undefined && { vaultKeyId: args.vaultKeyId }),
      })
    } else {
      await ctx.db.insert('userSettings', {
        userId,
        defaultModel: args.defaultModel ?? 'anthropic/claude-3.5-sonnet',
        spendingThreshold: args.spendingThreshold ?? 1.0,
        ...(args.vaultKeyId !== undefined && { vaultKeyId: args.vaultKeyId }),
      })
    }
  },
})

export const clearApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { vaultKeyId: undefined })
    }
  },
})
