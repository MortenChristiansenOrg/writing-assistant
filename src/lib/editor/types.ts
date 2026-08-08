export interface Selection {
  text: string
  from: number
  to: number
}

export interface TextSelectionContext {
  /** Plain-text offsets used to place the selection in the split-view preview. */
  from: number
  to: number
  text: string
  fullText: string
  /** ProseMirror positions captured when the AI session starts. */
  editorFrom: number
  editorTo: number
}

export type DocumentContent =
  | {
      type: 'json'
      data: Record<string, unknown>
    }
  | {
      type: 'html'
      data: string
    }

export interface EditorAdapter {
  getContent(): DocumentContent
  setContent(content: DocumentContent): void
  getSelection(): Selection | null
  replaceSelection(text: string): void
  insertAtCursor(text: string): void
  focus(): void
  onContentChange(callback: (content: DocumentContent) => void): () => void
  onSelectionChange(callback: (selection: Selection | null) => void): () => void
  getCharacterCount(): number
  getWordCount(): number
  getPlainText(): string
  getMarkdown(): string
  getSelectedMarkdown(): string | null
  getTextInRange(from: number, to: number): string
  getTextOffsetRange(): TextSelectionContext | null
  getDocumentRange(): { from: number; to: number }
  replaceRange(from: number, to: number, content: string): void
  setMarkdownContent(markdown: string): void
  destroy(): void
}
