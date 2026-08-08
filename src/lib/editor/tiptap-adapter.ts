import type { Editor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import type {
  DocumentContent,
  EditorAdapter,
  Selection,
  TextSelectionContext,
} from './types'

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

    const text = this.editor.state.doc.textBetween(from, to, '\n')
    if (!text.trim()) return null

    return { text, from, to }
  }

  replaceSelection(text: string): void {
    const { from, to } = this.editor.state.selection
    this.replaceRange(from, to, text)
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

  getPlainText(): string {
    return this.editor.state.doc.textBetween(
      0,
      this.editor.state.doc.content.size,
      '\n'
    )
  }

  getMarkdown(): string {
    return this.editor.getMarkdown?.() ?? this.getPlainText()
  }

  getSelectedMarkdown(): string | null {
    const { from, to } = this.editor.state.selection
    if (from === to) return null
    // Get text with newline block separator for proper markdown
    return this.editor.state.doc.textBetween(from, to, '\n')
  }

  getTextInRange(from: number, to: number): string {
    return this.editor.state.doc.textBetween(from, to, '\n')
  }

  getTextOffsetRange(): TextSelectionContext | null {
    const { from, to } = this.editor.state.selection
    if (from === to) return null

    const sep = '\n\n'
    const text = this.editor.state.doc.textBetween(from, to, sep)
    if (!text.trim()) return null

    const before = this.editor.state.doc.textBetween(0, from, sep)
    const fullText = this.editor.state.doc.textBetween(
      0,
      this.editor.state.doc.content.size,
      sep
    )

    return {
      from: before.length,
      to: before.length + text.length,
      text,
      fullText,
      editorFrom: from,
      editorTo: to,
    }
  }

  getDocumentRange(): { from: number; to: number } {
    return { from: 0, to: this.editor.state.doc.content.size }
  }

  replaceRange(from: number, to: number, content: string): void {
    const parsed = this.editor.markdown?.parse(content)
    const parsedContent = parsed?.content
    const sharedMarks = this.getSharedMarks(from, to)
    if (parsedContent === undefined) {
      this.editor
        .chain()
        .insertContentAt({ from, to }, content, { contentType: 'markdown' })
        .focus()
        .run()
      return
    }

    const insertion =
      parsedContent.length === 1 && parsedContent[0]?.type === 'paragraph'
        ? (parsedContent[0].content ?? []).map((node) =>
            this.applySharedMarks(node, sharedMarks)
          )
        : parsedContent

    this.editor
      .chain()
      .insertContentAt({ from, to }, insertion)
      .focus()
      .run()
  }

  private getSharedMarks(
    from: number,
    to: number
  ): NonNullable<JSONContent['marks']> {
    let sharedMarks: NonNullable<JSONContent['marks']> | undefined

    this.editor.state.doc.nodesBetween(from, to, (node) => {
      if (!node.isText) return

      const nodeMarks = node.marks.map((mark) => mark.toJSON())
      sharedMarks =
        sharedMarks === undefined
          ? nodeMarks
          : sharedMarks.filter((sharedMark) =>
              nodeMarks.some((nodeMark) =>
                this.marksMatch(sharedMark, nodeMark)
              )
            )
    })

    return sharedMarks ?? []
  }

  private applySharedMarks(
    node: JSONContent,
    sharedMarks: NonNullable<JSONContent['marks']>
  ): JSONContent {
    if (node.type !== 'text' || sharedMarks.length === 0) return node

    const existingMarks = node.marks ?? []
    const missingMarks = sharedMarks.filter(
      (sharedMark) =>
        !existingMarks.some((existingMark) =>
          this.marksMatch(sharedMark, existingMark)
        )
    )

    return { ...node, marks: [...existingMarks, ...missingMarks] }
  }

  private marksMatch(
    first: NonNullable<JSONContent['marks']>[number],
    second: NonNullable<JSONContent['marks']>[number]
  ): boolean {
    return (
      first.type === second.type &&
      JSON.stringify(first.attrs ?? {}) === JSON.stringify(second.attrs ?? {})
    )
  }

  setMarkdownContent(markdown: string): void {
    this.editor.commands.setContent(markdown, { contentType: 'markdown' })
  }

  destroy(): void {
    this.contentCallbacks.clear()
    this.selectionCallbacks.clear()
  }
}
