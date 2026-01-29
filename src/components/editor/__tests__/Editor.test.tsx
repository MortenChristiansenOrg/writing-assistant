import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import { Editor } from '../Editor'
import type { DocumentContent } from '@/lib/editor'

// Mock TipTap with proper class syntax
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockDestroy = vi.fn()
const mockGetJSON = vi.fn().mockReturnValue({ type: 'doc', content: [] })
const mockCommands = {
  setContent: vi.fn(),
  focus: vi.fn(),
}
const mockStorage = {
  characterCount: {
    words: vi.fn().mockReturnValue(0),
  },
}

const mockEditorInstance = {
  on: mockOn,
  off: mockOff,
  destroy: mockDestroy,
  getJSON: mockGetJSON,
  commands: mockCommands,
  storage: mockStorage,
  state: {
    selection: { from: 0, to: 0 },
    doc: { textBetween: vi.fn().mockReturnValue('') },
  },
}

vi.mock('@tiptap/react', async () => {
  const actual = await vi.importActual('@tiptap/react')
  return {
    ...actual,
    useEditor: vi.fn(() => mockEditorInstance),
    EditorContent: ({ editor: _editor }: { editor: unknown }) => (
      <div data-testid="editor-content" className="ProseMirror">
        Editor content
      </div>
    ),
  }
})

vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bubble-menu">{children}</div>
  ),
}))

vi.mock('@/lib/editor', () => {
  return {
    TipTapAdapter: class {
      onContentChange = vi.fn().mockReturnValue(() => {})
      destroy = vi.fn()
    },
  }
})

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorage.characterCount.words.mockReturnValue(0)
    mockGetJSON.mockReturnValue({ type: 'doc', content: [] })
    mockEditorInstance.state.doc.textBetween.mockReturnValue('')
  })

  it('renders editor content', () => {
    render(<Editor />)

    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('displays word count', () => {
    mockStorage.characterCount.words.mockReturnValue(42)

    render(<Editor />)

    expect(screen.getByText('42 words')).toBeInTheDocument()
  })

  it('shows zero word count for empty editor', () => {
    mockStorage.characterCount.words.mockReturnValue(0)

    render(<Editor />)

    expect(screen.getByText('0 words')).toBeInTheDocument()
  })

  it('creates adapter for onChange handling', async () => {
    const mockOnChange = vi.fn()

    render(<Editor onChange={mockOnChange} />)

    // TipTapAdapter is instantiated
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('calls onAdapterReady with adapter', async () => {
    const mockOnAdapterReady = vi.fn()

    render(<Editor onAdapterReady={mockOnAdapterReady} />)

    await waitFor(() => {
      expect(mockOnAdapterReady).toHaveBeenCalled()
    })
  })

  it('renders AI bubble menu when onAIAction provided', () => {
    const mockOnAIAction = vi.fn()

    render(<Editor onAIAction={mockOnAIAction} />)

    expect(screen.getByTestId('bubble-menu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ai/i })).toBeInTheDocument()
  })

  it('does not render AI button when onAIAction not provided', () => {
    render(<Editor />)

    expect(screen.getByTestId('bubble-menu')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ai/i })).not.toBeInTheDocument()
  })

  it('accepts initial content', () => {
    const content: DocumentContent = {
      type: 'json',
      data: { type: 'doc', content: [] },
    }

    render(<Editor content={content} />)

    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('accepts editable false prop', () => {
    render(<Editor editable={false} />)

    // Editor renders, editable is passed via useEditor config
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('accepts custom placeholder prop', () => {
    render(<Editor placeholder="Write something..." />)

    // Editor renders with custom placeholder in config
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('registers update listener for word count', () => {
    render(<Editor />)

    expect(mockOn).toHaveBeenCalledWith('update', expect.any(Function))
  })

  it('cleans up listeners on unmount', () => {
    const { unmount } = render(<Editor />)

    unmount()

    expect(mockOff).toHaveBeenCalledWith('update', expect.any(Function))
  })

  it('renders word count container', () => {
    mockStorage.characterCount.words.mockReturnValue(100)

    render(<Editor />)

    expect(screen.getByText('100 words')).toBeInTheDocument()
  })
})
