import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { getCurrentUserId } from './model/auth'

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    if (!settings) {
      return {
        userId,
        defaultModel: 'anthropic/claude-sonnet-5',
        spendingThreshold: 1.0,
        hasOpenRouterKey: false,
      }
    }

    return {
      userId,
      defaultModel: settings.defaultModel,
      spendingThreshold: settings.spendingThreshold,
      hasOpenRouterKey: Boolean(settings.openRouterKeyCiphertext),
    }
  },
})

export const upsert = mutation({
  args: {
    defaultModel: v.optional(v.string()),
    spendingThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
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
      })
    } else {
      await ctx.db.insert('userSettings', {
        userId,
        defaultModel: args.defaultModel ?? 'anthropic/claude-sonnet-5',
        spendingThreshold: args.spendingThreshold ?? 1.0,
      })
    }
  },
})

export const clearApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        openRouterKeyCiphertext: undefined,
        openRouterKeyIv: undefined,
        openRouterKeyVersion: undefined,
      })
    }
  },
})

export const storeEncryptedOpenRouterKey = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    ciphertext: v.string(),
    iv: v.string(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (queryBuilder) =>
        queryBuilder.eq('tokenIdentifier', args.tokenIdentifier),
      )
      .unique()
    if (!user) throw new Error('Unauthorized')

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('userId', user._id),
      )
      .first()
    const encryptedFields = {
      openRouterKeyCiphertext: args.ciphertext,
      openRouterKeyIv: args.iv,
      openRouterKeyVersion: args.version,
    }

    if (existing) {
      await ctx.db.patch(existing._id, encryptedFields)
      return
    }

    await ctx.db.insert('userSettings', {
      userId: user._id,
      defaultModel: 'anthropic/claude-sonnet-5',
      spendingThreshold: 1,
      ...encryptedFields,
    })
  },
})

export const getEncryptedOpenRouterKey = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (queryBuilder) =>
        queryBuilder.eq('tokenIdentifier', args.tokenIdentifier),
      )
      .unique()
    if (!user) return null

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('userId', user._id),
      )
      .unique()

    if (
      !settings?.openRouterKeyCiphertext ||
      !settings.openRouterKeyIv ||
      settings.openRouterKeyVersion === undefined
    ) {
      return null
    }

    return {
      ciphertext: settings.openRouterKeyCiphertext,
      iv: settings.openRouterKeyIv,
      version: settings.openRouterKeyVersion,
    }
  },
})
