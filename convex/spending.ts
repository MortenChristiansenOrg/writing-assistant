import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'google/gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'meta-llama/llama-3.1-70b-instruct': { input: 0.88, output: 0.88 },
  'meta-llama/llama-3.1-8b-instruct': { input: 0.055, output: 0.055 },
  'mistralai/mistral-large-2411': { input: 2, output: 6 },
}

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model] ?? { input: 1, output: 3 }
  return (
    (inputTokens / 1_000_000) * costs.input +
    (outputTokens / 1_000_000) * costs.output
  )
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0] ?? ''
}

export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
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
    const userId = await auth.getUserId(ctx)
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

export const record = mutation({
  args: {
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const today = getDateString()
    const totalCost = calculateCost(
      args.model,
      args.inputTokens,
      args.outputTokens
    )

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
