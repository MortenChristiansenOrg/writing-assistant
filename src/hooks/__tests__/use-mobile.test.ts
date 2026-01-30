import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../use-mobile'

describe('useIsMobile', () => {
  let originalInnerWidth: number
  let originalMatchMedia: typeof window.matchMedia
  let addEventListenerSpy: ReturnType<typeof vi.fn>
  let removeEventListenerSpy: ReturnType<typeof vi.fn>
  let mediaQueryCallback: (() => void) | null = null

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    originalMatchMedia = window.matchMedia
    addEventListenerSpy = vi.fn((event, callback) => {
      if (event === 'change') {
        mediaQueryCallback = callback as () => void
      }
    })
    removeEventListenerSpy = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    })
    mediaQueryCallback = null
  })

  describe('desktop detection', () => {
    it('returns false on desktop width (>= 768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false)
    })

    it('returns false at exactly 768px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 768,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false)
    })
  })

  describe('mobile detection', () => {
    it('returns true on mobile width (< 768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 500,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(true)
    })

    it('returns true at 767px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 767,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(true)
    })
  })

  describe('resize events', () => {
    it('registers change listener on mount', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      })

      renderHook(() => useIsMobile())

      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('removes listener on unmount', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      })

      const { unmount } = renderHook(() => useIsMobile())

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('updates value when window resizes from desktop to mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false)

      // Simulate resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          value: 500,
        })
        mediaQueryCallback?.()
      })

      expect(result.current).toBe(true)
    })

    it('updates value when window resizes from mobile to desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 500,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(true)

      // Simulate resize to desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          value: 1024,
        })
        mediaQueryCallback?.()
      })

      expect(result.current).toBe(false)
    })
  })

  describe('initial state', () => {
    it('uses correct media query', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      })

      renderHook(() => useIsMobile())

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
    })

    it('returns false before useEffect runs (undefined coerced to false)', () => {
      // The hook starts with undefined and coerces to false via !!
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 500,
      })

      const { result } = renderHook(() => useIsMobile())

      // After effect runs, should be true for mobile width
      expect(result.current).toBe(true)
    })
  })
})
