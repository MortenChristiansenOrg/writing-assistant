import { vi } from 'vitest'

type QueryResult = unknown
type MutationResult = unknown

export class FakeConvexClient {
  private queryResults: Map<string, QueryResult> = new Map()
  private mutationResults: Map<string, MutationResult> = new Map()
  private subscriptions: Map<string, Set<(result: QueryResult) => void>> =
    new Map()

  // Set expected query result
  setQueryResult(queryName: string, result: QueryResult) {
    this.queryResults.set(queryName, result)
    // Notify subscribers
    const subs = this.subscriptions.get(queryName)
    if (subs) {
      subs.forEach((cb) => cb(result))
    }
  }

  // Set expected mutation result
  setMutationResult(mutationName: string, result: MutationResult) {
    this.mutationResults.set(mutationName, result)
  }

  // Mock query subscription
  onUpdate = vi.fn(
    (
      query: { name?: string },
      _args: unknown,
      callback: (result: QueryResult) => void
    ) => {
      const queryName = query?.name || 'unknown'
      if (!this.subscriptions.has(queryName)) {
        this.subscriptions.set(queryName, new Set())
      }
      this.subscriptions.get(queryName)!.add(callback)

      // Return current value if exists
      if (this.queryResults.has(queryName)) {
        callback(this.queryResults.get(queryName))
      }

      // Return unsubscribe function
      return () => {
        this.subscriptions.get(queryName)?.delete(callback)
      }
    }
  )

  // Mock mutation
  mutation = vi.fn(async (mutation: { name?: string }, _args: unknown) => {
    const mutationName = mutation?.name || 'unknown'
    if (this.mutationResults.has(mutationName)) {
      return this.mutationResults.get(mutationName)
    }
    return undefined
  })

  // Mock action
  action = vi.fn(async () => undefined)

  // Required by ConvexProvider
  setAuth = vi.fn()
  clearAuth = vi.fn()

  // Clear all mocks
  reset() {
    this.queryResults.clear()
    this.mutationResults.clear()
    this.subscriptions.clear()
    this.onUpdate.mockClear()
    this.mutation.mockClear()
    this.action.mockClear()
  }
}
