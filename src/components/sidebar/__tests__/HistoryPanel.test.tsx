import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@/test/test-utils'
import { HistoryPanel } from '../HistoryPanel'
import { HistoryPanelComponent } from './history-panel.component'
import type { Id } from '../../../../convex/_generated/dataModel'

// Mock Convex hooks
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()

vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react')
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
    useMutation: () => mockUseMutation,
  }
})

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('HistoryPanel', () => {
  let component: HistoryPanelComponent
  const mockDocumentId = 'doc123' as Id<'documents'>

  beforeEach(() => {
    component = new HistoryPanelComponent()
    mockUseQuery.mockReturnValue(undefined)
    mockUseMutation.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger button', () => {
    render(<HistoryPanel documentId={mockDocumentId} />)

    expect(component.triggerButton).toBeInTheDocument()
    expect(component.triggerButton).toHaveTextContent('History')
  })

  it('opens sheet on click', async () => {
    render(<HistoryPanel documentId={mockDocumentId} />)

    expect(component.sheetTitle).not.toBeInTheDocument()

    await component.openPanel()

    expect(component.sheetTitle).toBeInTheDocument()
    expect(component.sheetDescription).toBeInTheDocument()
  })

  it('shows empty state when no revisions', async () => {
    mockUseQuery.mockReturnValue([])

    render(<HistoryPanel documentId={mockDocumentId} />)

    await component.openPanel()

    expect(component.emptyStateMessage).toBeInTheDocument()
  })

  it('displays revision list', async () => {
    const mockRevisions = [
      {
        _id: 'rev1' as Id<'revisions'>,
        changeType: 'manual' as const,
        description: 'Added introduction',
        createdAt: 2000,
      },
      {
        _id: 'rev2' as Id<'revisions'>,
        changeType: 'ai_rewrite' as const,
        description: 'Improved paragraph',
        createdAt: 1000,
      },
    ]
    mockUseQuery.mockReturnValue(mockRevisions)

    render(<HistoryPanel documentId={mockDocumentId} />)

    await component.openPanel()

    expect(component.getRevisionByType('Manual edit')).toBeInTheDocument()
    expect(component.getRevisionByType('AI rewrite')).toBeInTheDocument()
    expect(component.getRevisionDescription('Added introduction')).toBeInTheDocument()
    expect(component.getRevisionDescription('Improved paragraph')).toBeInTheDocument()
    expect(component.getAllRestoreButtons()).toHaveLength(2)
  })

  it('shows all change type labels', async () => {
    const mockRevisions = [
      { _id: 'rev1' as Id<'revisions'>, changeType: 'manual' as const, createdAt: 1000 },
      { _id: 'rev2' as Id<'revisions'>, changeType: 'ai_rewrite' as const, createdAt: 2000 },
      { _id: 'rev3' as Id<'revisions'>, changeType: 'ai_insert' as const, createdAt: 3000 },
      { _id: 'rev4' as Id<'revisions'>, changeType: 'restore' as const, createdAt: 4000 },
    ]
    mockUseQuery.mockReturnValue(mockRevisions)

    render(<HistoryPanel documentId={mockDocumentId} />)

    await component.openPanel()

    expect(component.getRevisionByType('Manual edit')).toBeInTheDocument()
    expect(component.getRevisionByType('AI rewrite')).toBeInTheDocument()
    expect(component.getRevisionByType('AI insert')).toBeInTheDocument()
    expect(component.getRevisionByType('Restored')).toBeInTheDocument()
  })

  it('calls restore mutation when restore clicked', async () => {
    const mockRevisions = [
      {
        _id: 'rev1' as Id<'revisions'>,
        changeType: 'manual' as const,
        createdAt: 1000,
      },
    ]
    mockUseQuery.mockReturnValue(mockRevisions)

    render(<HistoryPanel documentId={mockDocumentId} />)

    await component.openPanel()
    await component.clickRestoreButton(0)

    expect(mockUseMutation).toHaveBeenCalledWith({ revisionId: 'rev1' })
  })

  it('shows success toast on restore', async () => {
    const { toast } = await import('sonner')
    const mockRevisions = [
      {
        _id: 'rev1' as Id<'revisions'>,
        changeType: 'manual' as const,
        createdAt: 1000,
      },
    ]
    mockUseQuery.mockReturnValue(mockRevisions)
    mockUseMutation.mockResolvedValue(undefined)

    render(<HistoryPanel documentId={mockDocumentId} />)

    await component.openPanel()
    await component.clickRestoreButton(0)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Document restored')
    })
  })

  it('shows error toast on restore failure', async () => {
    const { toast } = await import('sonner')
    const mockRevisions = [
      {
        _id: 'rev1' as Id<'revisions'>,
        changeType: 'manual' as const,
        createdAt: 1000,
      },
    ]
    mockUseQuery.mockReturnValue(mockRevisions)
    mockUseMutation.mockRejectedValue(new Error('Failed'))

    render(<HistoryPanel documentId={mockDocumentId} />)

    await component.openPanel()
    await component.clickRestoreButton(0)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to restore')
    })
  })
})
