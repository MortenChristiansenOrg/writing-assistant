import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import type { DocumentContent, EditorAdapter } from '@/lib/editor'
import { useMutation, useQuery } from 'convex/react'
import { getFunctionName } from 'convex/server'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorPage } from '../EditorPage'

const {
  createRevision,
  document,
  documentId,
  finish,
  project,
  projectId,
  replaceRange,
  requestFeedback,
  updateDocument,
} = vi.hoisted(() => {
  const generatedDocumentId = 'document-test' as Id<'documents'>
  const generatedProjectId = 'project-test' as Id<'projects'>
  const userId = 'user-test' as Id<'users'>
  return {
    createRevision: vi.fn(),
    documentId: generatedDocumentId,
    projectId: generatedProjectId,
    finish: vi.fn(() => 'replacement'),
    replaceRange: vi.fn(),
    requestFeedback: vi.fn(),
    updateDocument: vi.fn(),
    document: {
      _id: generatedDocumentId,
      _creationTime: 1,
      projectId: generatedProjectId,
      userId,
      title: 'Document',
      content: { type: 'doc', content: [] },
      createdAt: 1,
      updatedAt: 1,
    } satisfies Doc<'documents'>,
    project: {
      _id: generatedProjectId,
      _creationTime: 1,
      userId,
      name: 'Project',
      createdAt: 1,
      updatedAt: 1,
    } satisfies Doc<'projects'>,
  }
})

const editorAdapter: EditorAdapter = {
  getContent: () => ({ type: 'json', data: { type: 'doc' } }),
  setContent: vi.fn(),
  getSelection: () => null,
  getCursorPosition: () => 1,
  replaceSelection: vi.fn(),
  insertAtCursor: vi.fn(),
  focus: vi.fn(),
  onContentChange: () => () => undefined,
  onSelectionChange: () => () => undefined,
  getCharacterCount: () => 0,
  getWordCount: () => 0,
  getPlainText: () => 'original',
  getMarkdown: () => 'original',
  getSelectedMarkdown: () => null,
  getTextInRange: () => 'original',
  getTextOffsetRange: () => null,
  getDocumentRange: () => ({ from: 0, to: 8 }),
  replaceRange,
  setMarkdownContent: vi.fn(),
  destroy: vi.fn(),
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return {
    ...actual,
    useParams: () => ({ docId: documentId, projectId }),
  }
})

vi.mock('convex/react', async () => {
  const actual = await vi.importActual<typeof import('convex/react')>(
    'convex/react',
  )
  return {
    ...actual,
    useMutation: vi.fn(),
    useQuery: vi.fn(),
  }
})

vi.mock('@/components/editor/Editor', () => ({
  Editor: ({
    onChange,
    onAdapterReady,
  }: {
    onChange?: (content: DocumentContent) => void
    onAdapterReady?: (adapter: EditorAdapter) => void
  }) => {
    onAdapterReady?.(editorAdapter)
    return (
      <button
        type="button"
        onClick={() =>
          onChange?.({ type: 'json', data: { type: 'doc', changed: true } })
        }
      >
        Change editor content
      </button>
    )
  },
}))

vi.mock('@/components/editor/AISplitView', () => ({
  AISplitView: ({ onFinish }: { onFinish: () => void }) => (
    <button type="button" onClick={onFinish}>
      Finish AI edit
    </button>
  ),
}))

vi.mock('@/components/sidebar/HistoryPanel', () => ({
  HistoryPanel: () => null,
}))
vi.mock('@/components/review/ReviewPanel', () => ({
  ReviewPanel: () => null,
}))
vi.mock('@/components/review/FeedbackRequestPopover', () => ({
  FeedbackRequestPopover: ({
    onRequest,
  }: {
    onRequest: (persona: {
      name: string
      systemPrompt: string
    }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onRequest({ name: 'Editor', systemPrompt: 'Review carefully' })
      }
    >
      Request feedback
    </button>
  ),
}))
vi.mock('@/hooks/useSerializedAutosave', () => ({
  useSerializedAutosave: (options: {
    save: (value: unknown) => Promise<void>
    onError?: (error: unknown) => void
  }) => ({
    schedule: (value: unknown) => {
      void options.save(value).catch((error: unknown) => options.onError?.(error))
    },
    flush: () => Promise.resolve(),
  }),
}))
vi.mock('@/hooks/useReviewNotes', () => ({
  useReviewNotes: () => ({
    notes: [],
    dismiss: vi.fn(),
    undismiss: vi.fn(),
    clearAll: vi.fn(),
  }),
}))
vi.mock('@/hooks/useAIFeedback', () => ({
  useAIFeedback: () => ({
    requestFeedback,
    reReview: vi.fn(),
    loading: false,
    reReviewingId: null,
  }),
}))
vi.mock('@/hooks/useAISplitSession', () => ({
  useAISplitSession: () => ({
    active: true,
    isLoading: false,
    baselineText: 'original',
    chunks: [],
    selectionRange: { from: 0, to: 8 },
    documentRange: { from: 1, to: 9 },
    fullDocumentText: 'original',
    savePoints: [],
    acceptedCount: 0,
    pendingCount: 0,
    hasApiKey: true,
    enterSplitMode: vi.fn(),
    acceptChunk: vi.fn(),
    rejectChunk: vi.fn(),
    revertChunk: vi.fn(),
    acceptAll: vi.fn(),
    regenerate: vi.fn(),
    undoRegeneration: vi.fn(),
    finish,
    cancelAll: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

describe('EditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    updateDocument.mockResolvedValue(undefined)
    createRevision.mockResolvedValue('revision-test')
    ;(useQuery as ReturnType<typeof vi.fn>).mockImplementation(
      (functionReference: Parameters<typeof getFunctionName>[0]) => {
        const name = getFunctionName(functionReference)
        if (name === 'documents:get') return document
        if (name === 'projects:get') return project
        if (name === 'personas:listForProject') return []
        return undefined
      },
    )
    ;(useMutation as ReturnType<typeof vi.fn>).mockImplementation(
      (functionReference: Parameters<typeof getFunctionName>[0]) =>
        getFunctionName(functionReference) === 'documents:update'
          ? updateDocument
          : createRevision,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the editor unchanged when revision creation fails', async () => {
    createRevision.mockRejectedValue(new Error('revision failed'))
    render(<EditorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Finish AI edit' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to save revision history',
      )
    })
    expect(finish).not.toHaveBeenCalled()
    expect(replaceRange).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalledWith('AI edits applied')
  })

  it('reports rejected content saves', async () => {
    updateDocument.mockRejectedValue(new Error('content save failed'))
    render(<EditorPage />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change editor content',
        hidden: true,
      }),
    )

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save')
    })
  })

  it('reports rejected description saves', async () => {
    updateDocument.mockRejectedValue(new Error('description save failed'))
    render(<EditorPage />)

    fireEvent.change(
      screen.getByPlaceholderText('Document description (optional)'),
      { target: { value: 'Changed description' } },
    )

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save description')
    })
  })

  it('uses the unsaved description value for feedback', async () => {
    render(<EditorPage />)
    fireEvent.change(
      screen.getByPlaceholderText('Document description (optional)'),
      { target: { value: 'Current unsaved description' } },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Request feedback' }))

    expect(requestFeedback).toHaveBeenCalledWith(
      'original',
      { name: 'Editor', systemPrompt: 'Review carefully' },
      { documentDescription: 'Current unsaved description' },
    )
  })

  it('persists the revision before applying the edit', async () => {
    let resolveRevision: (() => void) | undefined
    createRevision.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRevision = resolve
      }),
    )
    render(<EditorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Finish AI edit' }))
    expect(createRevision).toHaveBeenCalledOnce()
    expect(replaceRange).not.toHaveBeenCalled()

    resolveRevision?.()
    await waitFor(() => {
      expect(replaceRange).toHaveBeenCalledWith(1, 9, 'replacement')
    })
    expect(finish).toHaveBeenCalledOnce()
    expect(createRevision.mock.invocationCallOrder[0]).toBeLessThan(
      replaceRange.mock.invocationCallOrder[0] ?? 0,
    )
  })
})
