import { convexTest } from 'convex-test'
import schema from '../schema'
import { vi } from 'vitest'

// Import modules explicitly for convex-test
const modules = import.meta.glob('../**/*.ts')

// Create test context factory
export function createTestContext() {
  return convexTest(schema, modules)
}

// Helper to create authenticated test context
export async function createAuthenticatedContext(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {})
  })
  return { userId, asUser: t.withIdentity({ subject: userId }) }
}

// Helper to create a project for testing
export async function createTestProject(
  t: ReturnType<typeof convexTest>,
  userId: string
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('projects', {
      userId: userId as never,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
}

// Helper to create a document for testing
export async function createTestDocument(
  t: ReturnType<typeof convexTest>,
  userId: string,
  projectId: string
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('documents', {
      projectId: projectId as never,
      userId: userId as never,
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
