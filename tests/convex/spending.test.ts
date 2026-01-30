import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { api } from '../../convex/_generated/api'
import { createTestContext, createAuthenticatedContext } from './setup'

describe('spending', () => {
  let t: ReturnType<typeof createTestContext>

  beforeEach(() => {
    t = createTestContext()
    // Mock Date.now() for consistent date strings
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getToday', () => {
    it('returns null when not authenticated', async () => {
      const result = await t.query(api.spending.getToday, {})
      expect(result).toBeNull()
    })

    it('returns zero totals when no sessions exist', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      const result = await asUser.query(api.spending.getToday, {})
      expect(result).toEqual({
        date: '2025-01-15',
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        sessions: [],
      })
    })

    it('returns aggregated totals for today', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)

      await t.run(async (ctx) => {
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-15',
          model: 'anthropic/claude-3.5-sonnet',
          inputTokens: 1000,
          outputTokens: 500,
          totalCost: 0.01,
        })
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-15',
          model: 'openai/gpt-4o',
          inputTokens: 2000,
          outputTokens: 1000,
          totalCost: 0.02,
        })
      })

      const result = await asUser.query(api.spending.getToday, {})
      expect(result?.inputTokens).toBe(3000)
      expect(result?.outputTokens).toBe(1500)
      expect(result?.totalCost).toBe(0.03)
      expect(result?.sessions).toHaveLength(2)
    })

    it('does not include sessions from other dates', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)

      await t.run(async (ctx) => {
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-15',
          model: 'test',
          inputTokens: 1000,
          outputTokens: 500,
          totalCost: 0.01,
        })
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-14',
          model: 'test',
          inputTokens: 5000,
          outputTokens: 2000,
          totalCost: 0.05,
        })
      })

      const result = await asUser.query(api.spending.getToday, {})
      expect(result?.inputTokens).toBe(1000)
      expect(result?.sessions).toHaveLength(1)
    })

    it('does not include sessions from other users', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const { userId: userId2 } = await createAuthenticatedContext(t)

      await t.run(async (ctx) => {
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-15',
          model: 'test',
          inputTokens: 1000,
          outputTokens: 500,
          totalCost: 0.01,
        })
        await ctx.db.insert('spendingSessions', {
          userId: userId2 as never,
          date: '2025-01-15',
          model: 'test',
          inputTokens: 5000,
          outputTokens: 2000,
          totalCost: 0.05,
        })
      })

      const result = await asUser.query(api.spending.getToday, {})
      expect(result?.inputTokens).toBe(1000)
      expect(result?.sessions).toHaveLength(1)
    })
  })

  describe('getRange', () => {
    it('returns empty array when not authenticated', async () => {
      const result = await t.query(api.spending.getRange, {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      })
      expect(result).toEqual([])
    })

    it('returns empty array when no sessions in range', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      const result = await asUser.query(api.spending.getRange, {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      })
      expect(result).toEqual([])
    })

    it('returns aggregated data by date', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)

      await t.run(async (ctx) => {
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-10',
          model: 'test1',
          inputTokens: 1000,
          outputTokens: 500,
          totalCost: 0.01,
        })
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-10',
          model: 'test2',
          inputTokens: 2000,
          outputTokens: 1000,
          totalCost: 0.02,
        })
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-15',
          model: 'test1',
          inputTokens: 500,
          outputTokens: 250,
          totalCost: 0.005,
        })
      })

      const result = await asUser.query(api.spending.getRange, {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      })

      expect(result).toHaveLength(2)
      const jan10 = result.find((r) => r.date === '2025-01-10')
      const jan15 = result.find((r) => r.date === '2025-01-15')

      expect(jan10?.inputTokens).toBe(3000)
      expect(jan10?.outputTokens).toBe(1500)
      expect(jan10?.totalCost).toBe(0.03)

      expect(jan15?.inputTokens).toBe(500)
      expect(jan15?.outputTokens).toBe(250)
      expect(jan15?.totalCost).toBe(0.005)
    })

    it('filters by date range', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)

      await t.run(async (ctx) => {
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-05',
          model: 'test',
          inputTokens: 1000,
          outputTokens: 500,
          totalCost: 0.01,
        })
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-10',
          model: 'test',
          inputTokens: 2000,
          outputTokens: 1000,
          totalCost: 0.02,
        })
        await ctx.db.insert('spendingSessions', {
          userId: userId as never,
          date: '2025-01-20',
          model: 'test',
          inputTokens: 3000,
          outputTokens: 1500,
          totalCost: 0.03,
        })
      })

      const result = await asUser.query(api.spending.getRange, {
        startDate: '2025-01-08',
        endDate: '2025-01-15',
      })

      expect(result).toHaveLength(1)
      expect(result[0].date).toBe('2025-01-10')
    })
  })

  describe('record', () => {
    it('throws when not authenticated', async () => {
      await expect(
        t.mutation(api.spending.record, {
          model: 'test',
          inputTokens: 1000,
          outputTokens: 500,
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('creates new session when none exists', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      const result = await asUser.mutation(api.spending.record, {
        model: 'anthropic/claude-3.5-sonnet',
        inputTokens: 1000,
        outputTokens: 500,
      })

      expect(result.totalCost).toBeGreaterThan(0)

      const today = await asUser.query(api.spending.getToday, {})
      expect(today?.sessions).toHaveLength(1)
      expect(today?.sessions[0].inputTokens).toBe(1000)
      expect(today?.sessions[0].outputTokens).toBe(500)
    })

    it('updates existing session for same model on same day', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      await asUser.mutation(api.spending.record, {
        model: 'anthropic/claude-3.5-sonnet',
        inputTokens: 1000,
        outputTokens: 500,
      })

      await asUser.mutation(api.spending.record, {
        model: 'anthropic/claude-3.5-sonnet',
        inputTokens: 2000,
        outputTokens: 1000,
      })

      const today = await asUser.query(api.spending.getToday, {})
      expect(today?.sessions).toHaveLength(1)
      expect(today?.sessions[0].inputTokens).toBe(3000)
      expect(today?.sessions[0].outputTokens).toBe(1500)
    })

    it('creates separate sessions for different models', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      await asUser.mutation(api.spending.record, {
        model: 'anthropic/claude-3.5-sonnet',
        inputTokens: 1000,
        outputTokens: 500,
      })

      await asUser.mutation(api.spending.record, {
        model: 'openai/gpt-4o',
        inputTokens: 2000,
        outputTokens: 1000,
      })

      const today = await asUser.query(api.spending.getToday, {})
      expect(today?.sessions).toHaveLength(2)
    })
  })

  describe('cost calculation', () => {
    it('calculates cost for claude-3.5-sonnet correctly', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      // claude-3.5-sonnet: input $3/1M, output $15/1M
      const result = await asUser.mutation(api.spending.record, {
        model: 'anthropic/claude-3.5-sonnet',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      })

      expect(result.totalCost).toBe(18) // $3 + $15
    })

    it('calculates cost for gpt-4o correctly', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      // gpt-4o: input $2.5/1M, output $10/1M
      const result = await asUser.mutation(api.spending.record, {
        model: 'openai/gpt-4o',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      })

      expect(result.totalCost).toBe(12.5) // $2.5 + $10
    })

    it('calculates cost for gpt-4o-mini correctly', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      // gpt-4o-mini: input $0.15/1M, output $0.6/1M
      const result = await asUser.mutation(api.spending.record, {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      })

      expect(result.totalCost).toBe(0.75) // $0.15 + $0.6
    })

    it('uses default cost for unknown models', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      // default: input $1/1M, output $3/1M
      const result = await asUser.mutation(api.spending.record, {
        model: 'unknown/model',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      })

      expect(result.totalCost).toBe(4) // $1 + $3
    })

    it('calculates cost proportionally for smaller token counts', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      // claude-3.5-sonnet: input $3/1M, output $15/1M
      // 1000 tokens = $0.003 input, 500 tokens = $0.0075 output
      const result = await asUser.mutation(api.spending.record, {
        model: 'anthropic/claude-3.5-sonnet',
        inputTokens: 1000,
        outputTokens: 500,
      })

      expect(result.totalCost).toBeCloseTo(0.0105, 5)
    })
  })
})
