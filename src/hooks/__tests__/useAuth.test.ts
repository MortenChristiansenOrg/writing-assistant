import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from '../useAuth'

// Mock modules
vi.mock('convex/react', () => ({
  useConvexAuth: vi.fn(),
}))

vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: vi.fn(),
}))

import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'

describe('useAuth', () => {
  const mockSignIn = vi.fn()
  const mockSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthActions as ReturnType<typeof vi.fn>).mockReturnValue({
      signIn: mockSignIn,
      signOut: mockSignOut,
    })
  })

  describe('loading state', () => {
    it('returns isLoading true when auth is loading', () => {
      ;(useConvexAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuth())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('returns isLoading false when auth is loaded', () => {
      ;(useConvexAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      })

      const { result } = renderHook(() => useAuth())

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('authenticated state', () => {
    it('returns isAuthenticated true when user is logged in', () => {
      ;(useConvexAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      })

      const { result } = renderHook(() => useAuth())

      expect(result.current.isAuthenticated).toBe(true)
    })

    it('returns isAuthenticated false when user is not logged in', () => {
      ;(useConvexAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuth())

      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('signIn', () => {
    it('exposes signIn function from useAuthActions', () => {
      ;(useConvexAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuth())

      expect(result.current.signIn).toBe(mockSignIn)
    })
  })

  describe('signOut', () => {
    it('exposes signOut function from useAuthActions', () => {
      ;(useConvexAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      })

      const { result } = renderHook(() => useAuth())

      expect(result.current.signOut).toBe(mockSignOut)
    })
  })

  describe('state transitions', () => {
    it('reflects auth state changes', () => {
      ;(useConvexAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
      })

      const { result, rerender } = renderHook(() => useAuth())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)

      // Simulate auth completing
      ;(useConvexAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      })

      rerender()

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})
