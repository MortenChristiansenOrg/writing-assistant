import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAI } from '../useAI'

// Mock modules
vi.mock('@ai-sdk/react', () => ({
  useCompletion: vi.fn(),
}))

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('@/lib/convex-url', () => ({
  convexSiteUrl: 'https://test.convex.site',
}))

import { useCompletion } from '@ai-sdk/react'
import { useQuery, useMutation } from 'convex/react'
import { toast } from 'sonner'

describe('useAI', () => {
  const mockComplete = vi.fn()
  const mockStop = vi.fn()
  const mockSetCompletion = vi.fn()
  const mockRecordSpending = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    ;(useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      vaultKeyId: 'test-key',
      defaultModel: 'anthropic/claude-3.5-sonnet',
    })

    ;(useMutation as ReturnType<typeof vi.fn>).mockReturnValue(mockRecordSpending)
    mockRecordSpending.mockResolvedValue(undefined)

    ;(useCompletion as ReturnType<typeof vi.fn>).mockImplementation((options) => {
      return {
        completion: '',
        complete: mockComplete,
        isLoading: false,
        error: null,
        stop: mockStop,
        setCompletion: mockSetCompletion,
        _options: options, // Expose for testing callbacks
      }
    })
  })

  describe('runAction', () => {
    it('calls complete with correct params', async () => {
      mockComplete.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAI())

      await act(async () => {
        await result.current.runAction('rewrite', 'test text')
      })

      expect(mockComplete).toHaveBeenCalledWith('test text', {
        body: {
          action: 'rewrite',
          text: 'test text',
          persona: undefined,
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: 'test-key',
        },
      })
    })

    it('includes persona when provided', async () => {
      mockComplete.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAI())

      await act(async () => {
        await result.current.runAction('formal', 'test', 'Professional Writer')
      })

      expect(mockComplete).toHaveBeenCalledWith('test', {
        body: expect.objectContaining({
          persona: 'Professional Writer',
        }),
      })
    })

    it('shows error toast when no API key', async () => {
      ;(useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        vaultKeyId: null,
        defaultModel: 'anthropic/claude-3.5-sonnet',
      })

      const { result } = renderHook(() => useAI())

      await act(async () => {
        await result.current.runAction('rewrite', 'test')
      })

      expect(toast.error).toHaveBeenCalledWith('Please add your OpenRouter API key in settings')
      expect(mockComplete).not.toHaveBeenCalled()
    })

    it('clears completion before starting', async () => {
      mockComplete.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAI())

      await act(async () => {
        await result.current.runAction('shorter', 'test')
      })

      expect(mockSetCompletion).toHaveBeenCalledWith('')
    })
  })

  describe('streaming state', () => {
    it('isLoading combines useCompletion loading and streaming state', () => {
      ;(useCompletion as ReturnType<typeof vi.fn>).mockReturnValue({
        completion: '',
        complete: mockComplete,
        isLoading: true,
        error: null,
        stop: mockStop,
        setCompletion: mockSetCompletion,
      })

      const { result } = renderHook(() => useAI())

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('onFinish callback', () => {
    it('records spending after completion', async () => {
      let onFinishCallback: ((prompt: string, result: string) => void) | undefined

      ;(useCompletion as ReturnType<typeof vi.fn>).mockImplementation((options) => {
        onFinishCallback = options.onFinish
        return {
          completion: '',
          complete: mockComplete,
          isLoading: false,
          error: null,
          stop: mockStop,
          setCompletion: mockSetCompletion,
        }
      })

      renderHook(() => useAI())

      act(() => {
        onFinishCallback?.('prompt', 'completed result text')
      })

      await waitFor(() => {
        expect(mockRecordSpending).toHaveBeenCalledWith({
          model: 'anthropic/claude-3.5-sonnet',
          inputTokens: expect.any(Number),
          outputTokens: expect.any(Number),
        })
      })
    })

    it('calls onComplete option callback', () => {
      let onFinishCallback: ((prompt: string, result: string) => void) | undefined
      const onComplete = vi.fn()

      ;(useCompletion as ReturnType<typeof vi.fn>).mockImplementation((options) => {
        onFinishCallback = options.onFinish
        return {
          completion: '',
          complete: mockComplete,
          isLoading: false,
          error: null,
          stop: mockStop,
          setCompletion: mockSetCompletion,
        }
      })

      renderHook(() => useAI({ onComplete }))

      act(() => {
        onFinishCallback?.('prompt', 'result')
      })

      expect(onComplete).toHaveBeenCalledWith('result')
    })
  })

  describe('error handling', () => {
    it('calls onError option callback', () => {
      let onErrorCallback: ((err: Error) => void) | undefined
      const onError = vi.fn()

      ;(useCompletion as ReturnType<typeof vi.fn>).mockImplementation((options) => {
        onErrorCallback = options.onError
        return {
          completion: '',
          complete: mockComplete,
          isLoading: false,
          error: null,
          stop: mockStop,
          setCompletion: mockSetCompletion,
        }
      })

      renderHook(() => useAI({ onError }))

      act(() => {
        onErrorCallback?.(new Error('Test error'))
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(toast.error).toHaveBeenCalledWith('Test error', { duration: Infinity })
    })

    it('handles non-Error objects in onError', () => {
      let onErrorCallback: ((err: unknown) => void) | undefined

      ;(useCompletion as ReturnType<typeof vi.fn>).mockImplementation((options) => {
        onErrorCallback = options.onError
        return {
          completion: '',
          complete: mockComplete,
          isLoading: false,
          error: null,
          stop: mockStop,
          setCompletion: mockSetCompletion,
        }
      })

      renderHook(() => useAI())

      act(() => {
        onErrorCallback?.('string error')
      })

      expect(toast.error).toHaveBeenCalledWith('AI request failed', { duration: Infinity })
    })
  })

  describe('stop', () => {
    it('exposes stop function from useCompletion', () => {
      const { result } = renderHook(() => useAI())

      result.current.stop()

      expect(mockStop).toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('clears completion by calling setCompletion with empty string', () => {
      const { result } = renderHook(() => useAI())

      result.current.clear()

      expect(mockSetCompletion).toHaveBeenCalledWith('')
    })
  })

  describe('token estimation', () => {
    it('estimates tokens based on result length', async () => {
      let onFinishCallback: ((prompt: string, result: string) => void) | undefined

      ;(useCompletion as ReturnType<typeof vi.fn>).mockImplementation((options) => {
        onFinishCallback = options.onFinish
        return {
          completion: '',
          complete: mockComplete,
          isLoading: false,
          error: null,
          stop: mockStop,
          setCompletion: mockSetCompletion,
        }
      })

      renderHook(() => useAI())

      // Result of length 100 chars should yield ~25 tokens
      const result = 'a'.repeat(100)
      act(() => {
        onFinishCallback?.('prompt', result)
      })

      await waitFor(() => {
        expect(mockRecordSpending).toHaveBeenCalledWith({
          model: 'anthropic/claude-3.5-sonnet',
          inputTokens: 25,
          outputTokens: 25,
        })
      })
    })
  })
})
