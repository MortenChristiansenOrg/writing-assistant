import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import { getCurrentUserId } from './model/auth'

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0] ?? ''
}

export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    const today = getDateString()
    const sessions = await ctx.db
      .query('spendingSessions')
      .withIndex('by_user_date', (q) =>
        q.eq('userId', userId).eq('date', today)
      )
      .collect()

    const total = sessions.reduce(
      (acc, s) => ({
        inputTokens: acc.inputTokens + s.inputTokens,
        outputTokens: acc.outputTokens + s.outputTokens,
        totalCost: acc.totalCost + s.totalCost,
      }),
      { inputTokens: 0, outputTokens: 0, totalCost: 0 }
    )

    return { date: today, ...total, sessions }
  },
})

export const getRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    const sessions = await ctx.db
      .query('spendingSessions')
      .withIndex('by_user_date', (q) => q.eq('userId', userId))
      .filter((q) =>
        q.and(
          q.gte(q.field('date'), args.startDate),
          q.lte(q.field('date'), args.endDate)
        )
      )
      .collect()

    const byDate = new Map<
      string,
      { inputTokens: number; outputTokens: number; totalCost: number }
    >()

    for (const session of sessions) {
      const existing = byDate.get(session.date) ?? {
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      }
      byDate.set(session.date, {
        inputTokens: existing.inputTokens + session.inputTokens,
        outputTokens: existing.outputTokens + session.outputTokens,
        totalCost: existing.totalCost + session.totalCost,
      })
    }

    return Array.from(byDate.entries()).map(([date, data]) => ({
      date,
      ...data,
    }))
  },
})

export const recordUsage = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalCost: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (queryBuilder) =>
        queryBuilder.eq('tokenIdentifier', args.tokenIdentifier),
      )
      .unique()
    if (!user) throw new Error('Unauthorized')
    const userId = user._id

    const today = getDateString()
    const totalCost = Math.max(0, args.totalCost)

    const existing = await ctx.db
      .query('spendingSessions')
      .withIndex('by_user_date_model', (q) =>
        q.eq('userId', userId).eq('date', today).eq('model', args.model)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        inputTokens: existing.inputTokens + args.inputTokens,
        outputTokens: existing.outputTokens + args.outputTokens,
        totalCost: existing.totalCost + totalCost,
      })
    } else {
      await ctx.db.insert('spendingSessions', {
        userId,
        date: today,
        model: args.model,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        totalCost,
      })
    }

    return { totalCost }
  },
})
