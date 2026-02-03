export interface Selection {
  text: string
  from: number
  to: number
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
  getTextOffsetRange(): {
    from: number
    to: number
    text: string
    fullText: string
  } | null
  replaceRange(from: number, to: number, content: string): void
  setMarkdownContent(markdown: string): void
  destroy(): void
}
