import { convexTest } from 'convex-test'
import schema from '../../convex/schema'
import type { Id } from '../../convex/_generated/dataModel'
import { vi } from 'vitest'

// Import modules explicitly for convex-test
const modules = import.meta.glob('../../convex/**/*.ts')

// Create test context factory
export function createTestContext() {
  return convexTest(schema, modules)
}

// Helper to create authenticated test context
export async function createAuthenticatedContext(t: ReturnType<typeof convexTest>) {
  const subject = `user_test_${crypto.randomUUID()}`
  const issuer = 'https://clerk.test'
  const tokenIdentifier = `${issuer}|${subject}`
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      tokenIdentifier,
      subject,
      issuer,
      lastSeenAt: Date.now(),
    })
  })
  return {
    userId,
    tokenIdentifier,
    asUser: t.withIdentity({ subject, issuer, tokenIdentifier }),
  }
}

// Helper to create a project for testing
export async function createTestProject(
  t: ReturnType<typeof convexTest>,
  userId: Id<'users'>,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
}

// Helper to create a document for testing
export async function createTestDocument(
  t: ReturnType<typeof convexTest>,
  userId: Id<'users'>,
  projectId: Id<'projects'>,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('documents', {
      projectId,
      userId,
      title: 'Test Document',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
}

// Mock date for consistent testing
export function mockDate(date: Date) {
  vi.useFakeTimers()
  vi.setSystemTime(date)
  return () => vi.useRealTimers()
}

export async function finishScheduledFunctions(
  t: ReturnType<typeof createTestContext>,
): Promise<void> {
  vi.useFakeTimers()
  try {
    await t.finishAllScheduledFunctions(() => vi.runAllTimers())
  } finally {
    vi.useRealTimers()
  }
}
