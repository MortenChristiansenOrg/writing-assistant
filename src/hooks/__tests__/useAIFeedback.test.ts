import { act, renderHook } from '@testing-library/react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Id } from '../../../convex/_generated/dataModel'
import { useAIFeedback } from '../useAIFeedback'

const { mockGetToken } = vi.hoisted(() => ({
  mockGetToken: vi.fn(),
}))

vi.mock('convex/react', () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}))

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

vi.mock('@/lib/convex-url', () => ({
  convexSiteUrl: 'https://test.convex.site',
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

describe('useAIFeedback', () => {
  const createBatch = vi.fn()
  const updateNote = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetToken.mockResolvedValue('test-token')
    ;(useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      hasOpenRouterKey: true,
      defaultModel: 'test/model',
    })
    ;(useMutation as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(createBatch)
      .mockReturnValueOnce(updateNote)
  })

  it('rejects an invalid feedback response before storing notes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ comment: 'Not an array' }),
    )
    const documentId = 'document-test' as Id<'documents'>
    const { result } = renderHook(() => useAIFeedback(documentId))

    await act(async () => {
      await result.current.requestFeedback('Text', {
        name: 'Editor',
        systemPrompt: 'Review it',
      })
    })

    expect(createBatch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      'AI returned an invalid feedback response',
    )
  })

  it('authenticates and stores validated initial feedback', async () => {
    const notes = [
      {
        comment: 'Clarify the opening',
        severity: 'suggestion' as const,
        category: 'clarity',
      },
    ]
    const request = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(notes))
    const documentId = 'document-test' as Id<'documents'>
    const { result } = renderHook(() => useAIFeedback(documentId))

    await act(async () => {
      await result.current.requestFeedback('Draft text', {
        name: 'Editor',
        systemPrompt: 'Review it',
      })
    })

    expect(mockGetToken).toHaveBeenCalledOnce()
    const requestInit = request.mock.calls[0]?.[1]
    expect(new Headers(requestInit?.headers).get('Authorization')).toBe(
      'Bearer test-token',
    )
    expect(createBatch).toHaveBeenCalledWith({
      documentId,
      personaName: 'Editor',
      model: 'test/model',
      notes,
    })
  })

  it('preserves the returned category when re-reviewing a note', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json([
        {
          comment: 'The pacing is fixed',
          severity: 'info',
          category: 'pacing',
        },
      ]),
    )
    const documentId = 'document-test' as Id<'documents'>
    const noteId = 'note-test' as Id<'reviewNotes'>
    const { result } = renderHook(() => useAIFeedback(documentId))

    await act(async () => {
      await result.current.reReview(
        noteId,
        'Original note',
        'Updated text',
        'Review it',
      )
    })

    expect(updateNote).toHaveBeenCalledWith({
      id: noteId,
      comment: 'The pacing is fixed',
      severity: 'info',
      category: 'pacing',
    })
  })
})
