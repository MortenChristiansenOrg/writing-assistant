import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAISplitSession } from '../useAISplitSession'

const aiMock = vi.hoisted(() => ({
  clear: vi.fn(),
  runAction: vi.fn().mockResolvedValue(undefined),
  onComplete: undefined as ((result: string) => void) | undefined,
}))

vi.mock('../useAI', () => ({
  useAI: (options: { onComplete?: (result: string) => void }) => {
    aiMock.onComplete = options.onComplete
    return {
      isLoading: false,
      runAction: aiMock.runAction,
      clear: aiMock.clear,
      hasApiKey: true,
    }
  },
}))

describe('useAISplitSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    aiMock.onComplete = undefined
  })

  it('retains both preview offsets and the original ProseMirror range', () => {
    const { result } = renderHook(() => useAISplitSession())

    act(() => {
      result.current.enterSplitMode(
        'chosen',
        { from: 7, to: 13 },
        { from: 8, to: 14 },
        'rewrite',
        'Before chosen after'
      )
    })

    expect(result.current.selectionRange).toEqual({ from: 7, to: 13 })
    expect(result.current.documentRange).toEqual({ from: 8, to: 14 })
    expect(aiMock.runAction).toHaveBeenCalledWith(
      'rewrite',
      'chosen',
      undefined,
      undefined
    )
  })

  it('finishes with accepted AI text and clears the captured ranges', () => {
    const { result } = renderHook(() => useAISplitSession())
    act(() => {
      result.current.enterSplitMode(
        'old wording',
        { from: 0, to: 11 },
        { from: 4, to: 15 },
        'rewrite',
        'old wording'
      )
    })
    act(() => aiMock.onComplete?.('new wording'))
    act(() => result.current.acceptAll())

    let merged: string | null = null
    act(() => {
      merged = result.current.finish()
    })

    expect(merged).toBe('new wording')
    expect(result.current.active).toBe(false)
    expect(result.current.selectionRange).toBeNull()
    expect(result.current.documentRange).toBeNull()
  })
})
