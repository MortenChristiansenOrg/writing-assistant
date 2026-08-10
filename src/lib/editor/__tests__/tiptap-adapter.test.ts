import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TipTapAdapter } from '../tiptap-adapter'
import type { Editor } from '@tiptap/react'
import { Editor as CoreEditor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

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
      insertContentAt: vi.fn(),
    },
    chain: vi.fn(() => ({
      focus: vi.fn().mockReturnThis(),
      deleteRange: vi.fn().mockReturnThis(),
      insertContent: vi.fn().mockReturnThis(),
      insertContentAt: vi.fn().mockReturnThis(),
      run: vi.fn(),
    })),
    state: {
      selection: { from: 0, to: 0 },
      doc: {
        textBetween: vi.fn(() => ''),
        nodesBetween: vi.fn(),
        content: { size: 0 },
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

function setSelection(editor: Editor, from: number, to: number): void {
  const state = editor.state as unknown as {
    selection: { from: number; to: number }
  }
  state.selection = { from, to }
}

function removeStorage(editor: Editor): void {
  const mutableEditor = editor as unknown as {
    storage: Record<string, unknown>
  }
  mutableEditor.storage = {}
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
      setSelection(mockEditor, 5, 5)
      expect(adapter.getSelection()).toBeNull()
    })

    it('returns null when selection is whitespace only', () => {
      setSelection(mockEditor, 0, 5)
      ;(mockEditor.state.doc.textBetween as ReturnType<typeof vi.fn>).mockReturnValue('   ')
      expect(adapter.getSelection()).toBeNull()
    })

    it('returns selection with text', () => {
      setSelection(mockEditor, 0, 10)
      ;(mockEditor.state.doc.textBetween as ReturnType<typeof vi.fn>).mockReturnValue('hello world')

      const selection = adapter.getSelection()
      expect(selection).toEqual({
        text: 'hello world',
        from: 0,
        to: 10,
      })
    })
  })

  describe('getCursorContext', () => {
    it('captures text immediately before and after the cursor', () => {
      setSelection(mockEditor, 12, 12)
      const document = mockEditor.state.doc
      ;(document.content as { size: number }).size = 30
      ;(document.textBetween as ReturnType<typeof vi.fn>).mockImplementation(
        (from: number, to: number) => from === 0 && to === 12
          ? 'Before cursor'
          : 'After cursor',
      )

      expect(adapter.getCursorContext()).toEqual({
        before: 'Before cursor',
        after: 'After cursor',
      })
      expect(document.textBetween).toHaveBeenCalledWith(0, 12, '\n\n')
      expect(document.textBetween).toHaveBeenCalledWith(12, 30, '\n\n')
    })
  })

  describe('replaceSelection', () => {
    it('replaces the captured editor range and focuses the editor', () => {
      setSelection(mockEditor, 5, 15)
      const chain = mockEditor.chain()
      ;(mockEditor.chain as ReturnType<typeof vi.fn>).mockReturnValue(chain)

      adapter.replaceSelection('new text')

      expect(chain.insertContentAt).toHaveBeenCalledWith(
        { from: 5, to: 15 },
        'new text',
        { contentType: 'markdown' },
      )
      expect(chain.focus).toHaveBeenCalled()
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
      removeStorage(mockEditor)
      expect(adapter.getCharacterCount()).toBe(0)
    })
  })

  describe('getWordCount', () => {
    it('returns word count from storage', () => {
      expect(adapter.getWordCount()).toBe(20)
    })

    it('returns 0 when storage is unavailable', () => {
      removeStorage(mockEditor)
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

  describe('AI replacement ranges', () => {
    it('keeps preview offsets separate from ProseMirror positions', () => {
      setSelection(mockEditor, 8, 14)
      ;(
        mockEditor.state.doc.textBetween as ReturnType<typeof vi.fn>
      ).mockImplementation((from: number, to: number) => {
        if (from === 8 && to === 14) return 'chosen'
        if (from === 0 && to === 8) return 'Before '
        return 'Before chosen after'
      })

      expect(adapter.getTextOffsetRange()).toEqual({
        from: 7,
        to: 13,
        text: 'chosen',
        fullText: 'Before chosen after',
        editorFrom: 8,
        editorTo: 14,
      })
    })

    it('replaces only the original rich-text selection', () => {
      const editor = new CoreEditor({
        extensions: [StarterKit, Markdown],
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [
                { type: 'text', text: 'Before ' },
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'chosen',
                },
                { type: 'text', text: ' after' },
              ],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Untouched paragraph' }],
            },
          ],
        },
      })
      const richTextAdapter = new TipTapAdapter(editor)

      richTextAdapter.replaceRange(8, 14, '**replacement**')

      expect(editor.getJSON()).toEqual({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [
              { type: 'text', text: 'Before ' },
              {
                type: 'text',
                marks: [{ type: 'bold' }],
                text: 'replacement',
              },
              { type: 'text', text: ' after' },
            ],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Untouched paragraph' }],
          },
        ],
      })

      richTextAdapter.destroy()
      editor.destroy()
    })

    it('can accept an AI edit that deletes the entire selection', () => {
      const editor = new CoreEditor({
        extensions: [StarterKit, Markdown],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Keep remove keep' }],
            },
          ],
        },
      })
      const richTextAdapter = new TipTapAdapter(editor)

      richTextAdapter.replaceRange(6, 12, '')

      expect(editor.getText()).toBe('Keep  keep')

      richTextAdapter.destroy()
      editor.destroy()
    })

    it('keeps marks shared by the entire original selection', () => {
      const editor = new CoreEditor({
        extensions: [StarterKit, Markdown],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Before ' },
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'chosen',
                },
                { type: 'text', text: ' after' },
              ],
            },
          ],
        },
      })
      const richTextAdapter = new TipTapAdapter(editor)

      richTextAdapter.replaceRange(8, 14, 'replacement')

      expect(editor.getJSON().content?.[0]?.content?.[1]).toEqual({
        type: 'text',
        marks: [{ type: 'bold' }],
        text: 'replacement',
      })

      richTextAdapter.destroy()
      editor.destroy()
    })
  })
})
