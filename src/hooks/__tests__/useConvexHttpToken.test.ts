import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConvexHttpToken } from '../useConvexHttpToken'

const { mockGetToken } = vi.hoisted(() => ({
  mockGetToken: vi.fn(),
}))

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

describe('useConvexHttpToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetToken.mockResolvedValue('session-token')
  })

  it('uses the Clerk session token from the Convex integration', async () => {
    const { result } = renderHook(() => useConvexHttpToken())

    let token: string | undefined
    await act(async () => {
      token = await result.current()
    })

    expect(token).toBe('session-token')
    expect(mockGetToken).toHaveBeenCalledWith()
  })

  it('fails when the Clerk session has expired', async () => {
    mockGetToken.mockResolvedValue(null)
    const { result } = renderHook(() => useConvexHttpToken())

    await expect(result.current()).rejects.toThrow('Authentication expired')
  })
})
