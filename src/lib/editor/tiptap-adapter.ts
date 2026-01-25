import type { Editor } from '@tiptap/react'
import type { DocumentContent, EditorAdapter, Selection } from './types'

export class TipTapAdapter implements EditorAdapter {
  private editor: Editor
  private contentCallbacks: Set<(content: DocumentContent) => void> = new Set()
  private selectionCallbacks: Set<(selection: Selection | null) => void> =
    new Set()

  constructor(editor: Editor) {
    this.editor = editor

    this.editor.on('update', () => {
      const content = this.getContent()
      this.contentCallbacks.forEach((cb) => cb(content))
    })

    this.editor.on('selectionUpdate', () => {
      const selection = this.getSelection()
      this.selectionCallbacks.forEach((cb) => cb(selection))
    })
  }

  getContent(): DocumentContent {
    return {
      type: 'json',
      data: this.editor.getJSON() as Record<string, unknown>,
    }
  }

  setContent(content: DocumentContent): void {
    if (content.type === 'json') {
      this.editor.commands.setContent(content.data)
    } else {
      this.editor.commands.setContent(content.data)
    }
  }

  getSelection(): Selection | null {
    const { from, to } = this.editor.state.selection
    if (from === to) return null

    const text = this.editor.state.doc.textBetween(from, to, ' ')
    if (!text.trim()) return null

    return { text, from, to }
  }

  replaceSelection(text: string): void {
    const { from, to } = this.editor.state.selection
    this.editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent(text)
      .run()
  }

  insertAtCursor(text: string): void {
    this.editor.chain().focus().insertContent(text).run()
  }

  focus(): void {
    this.editor.commands.focus()
  }

  onContentChange(callback: (content: DocumentContent) => void): () => void {
    this.contentCallbacks.add(callback)
    return () => this.contentCallbacks.delete(callback)
  }

  onSelectionChange(
    callback: (selection: Selection | null) => void
  ): () => void {
    this.selectionCallbacks.add(callback)
    return () => this.selectionCallbacks.delete(callback)
  }

  getCharacterCount(): number {
    return this.editor.storage.characterCount?.characters() ?? 0
  }

  getWordCount(): number {
    return this.editor.storage.characterCount?.words() ?? 0
  }

  destroy(): void {
    this.contentCallbacks.clear()
    this.selectionCallbacks.clear()
  }
}
