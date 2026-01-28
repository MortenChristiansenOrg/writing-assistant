import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TipTapAdapter } from '../tiptap-adapter'
import type { Editor } from '@tiptap/react'

function createMockEditor(overrides: Partial<Editor> = {}): Editor {
  const listeners: Record<string, Set<() => void>> = {}

  return {
    on: vi.fn((event: string, callback: () => void) => {
      if (!listeners[event]) listeners[event] = new Set()
      listeners[event].add(callback)
    }),
    off: vi.fn(),
    getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph' }] })),
    commands: {
      setContent: vi.fn(),
      focus: vi.fn(),
    },
    chain: vi.fn(() => ({
      focus: vi.fn().mockReturnThis(),
      deleteRange: vi.fn().mockReturnThis(),
      insertContent: vi.fn().mockReturnThis(),
      run: vi.fn(),
    })),
    state: {
      selection: { from: 0, to: 0 },
      doc: {
        textBetween: vi.fn(() => ''),
      },
    },
    storage: {
      characterCount: {
        characters: vi.fn(() => 100),
        words: vi.fn(() => 20),
      },
    },
    // Helper to trigger events in tests
    _emit: (event: string) => {
      listeners[event]?.forEach((cb) => cb())
    },
    ...overrides,
  } as unknown as Editor
}

describe('TipTapAdapter', () => {
  let mockEditor: ReturnType<typeof createMockEditor>
  let adapter: TipTapAdapter

  beforeEach(() => {
    mockEditor = createMockEditor()
    adapter = new TipTapAdapter(mockEditor)
  })

  describe('constructor', () => {
    it('registers update listener', () => {
      expect(mockEditor.on).toHaveBeenCalledWith('update', expect.any(Function))
    })

    it('registers selectionUpdate listener', () => {
      expect(mockEditor.on).toHaveBeenCalledWith('selectionUpdate', expect.any(Function))
    })
  })

  describe('getContent', () => {
    it('returns json content from editor', () => {
      const content = adapter.getContent()
      expect(content).toEqual({
        type: 'json',
        data: { type: 'doc', content: [{ type: 'paragraph' }] },
      })
      expect(mockEditor.getJSON).toHaveBeenCalled()
    })
  })

  describe('setContent', () => {
    it('sets json content', () => {
      const content = { type: 'json' as const, data: { type: 'doc' } }
      adapter.setContent(content)
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith({ type: 'doc' })
    })

    it('sets html content', () => {
      const content = { type: 'html' as const, data: '<p>test</p>' }
      adapter.setContent(content)
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith('<p>test</p>')
    })
  })

  describe('getSelection', () => {
    it('returns null when no selection (cursor only)', () => {
      mockEditor.state.selection = { from: 5, to: 5 }
      expect(adapter.getSelection()).toBeNull()
    })

    it('returns null when selection is whitespace only', () => {
      mockEditor.state.selection = { from: 0, to: 5 }
      ;(mockEditor.state.doc.textBetween as ReturnType<typeof vi.fn>).mockReturnValue('   ')
      expect(adapter.getSelection()).toBeNull()
    })

    it('returns selection with text', () => {
      mockEditor.state.selection = { from: 0, to: 10 }
      ;(mockEditor.state.doc.textBetween as ReturnType<typeof vi.fn>).mockReturnValue('hello world')

      const selection = adapter.getSelection()
      expect(selection).toEqual({
        text: 'hello world',
        from: 0,
        to: 10,
      })
    })
  })

  describe('replaceSelection', () => {
    it('chains focus, deleteRange, insertContent, and run', () => {
      mockEditor.state.selection = { from: 5, to: 15 }
      const chain = mockEditor.chain()
      ;(mockEditor.chain as ReturnType<typeof vi.fn>).mockReturnValue(chain)

      adapter.replaceSelection('new text')

      expect(mockEditor.chain).toHaveBeenCalled()
      expect(chain.focus).toHaveBeenCalled()
      expect(chain.deleteRange).toHaveBeenCalledWith({ from: 5, to: 15 })
      expect(chain.insertContent).toHaveBeenCalledWith('new text')
      expect(chain.run).toHaveBeenCalled()
    })
  })

  describe('insertAtCursor', () => {
    it('chains focus, insertContent, and run', () => {
      const chain = mockEditor.chain()
      ;(mockEditor.chain as ReturnType<typeof vi.fn>).mockReturnValue(chain)

      adapter.insertAtCursor('inserted text')

      expect(mockEditor.chain).toHaveBeenCalled()
      expect(chain.focus).toHaveBeenCalled()
      expect(chain.insertContent).toHaveBeenCalledWith('inserted text')
      expect(chain.run).toHaveBeenCalled()
    })
  })

  describe('getCharacterCount', () => {
    it('returns character count from storage', () => {
      expect(adapter.getCharacterCount()).toBe(100)
    })

    it('returns 0 when storage is unavailable', () => {
      mockEditor.storage = {}
      expect(adapter.getCharacterCount()).toBe(0)
    })
  })

  describe('getWordCount', () => {
    it('returns word count from storage', () => {
      expect(adapter.getWordCount()).toBe(20)
    })

    it('returns 0 when storage is unavailable', () => {
      mockEditor.storage = {}
      expect(adapter.getWordCount()).toBe(0)
    })
  })

  describe('onContentChange', () => {
    it('registers callback and returns unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = adapter.onContentChange(callback)

      // Trigger update event
      ;(mockEditor as unknown as { _emit: (e: string) => void })._emit('update')

      expect(callback).toHaveBeenCalled()

      unsubscribe()
      callback.mockClear()

      ;(mockEditor as unknown as { _emit: (e: string) => void })._emit('update')
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('onSelectionChange', () => {
    it('registers callback and returns unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = adapter.onSelectionChange(callback)

      ;(mockEditor as unknown as { _emit: (e: string) => void })._emit('selectionUpdate')

      expect(callback).toHaveBeenCalled()

      unsubscribe()
      callback.mockClear()

      ;(mockEditor as unknown as { _emit: (e: string) => void })._emit('selectionUpdate')
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('clears all callbacks', () => {
      const contentCb = vi.fn()
      const selectionCb = vi.fn()

      adapter.onContentChange(contentCb)
      adapter.onSelectionChange(selectionCb)

      adapter.destroy()

      ;(mockEditor as unknown as { _emit: (e: string) => void })._emit('update')
      ;(mockEditor as unknown as { _emit: (e: string) => void })._emit('selectionUpdate')

      expect(contentCb).not.toHaveBeenCalled()
      expect(selectionCb).not.toHaveBeenCalled()
    })
  })

  describe('focus', () => {
    it('calls editor focus command', () => {
      adapter.focus()
      expect(mockEditor.commands.focus).toHaveBeenCalled()
    })
  })
})
