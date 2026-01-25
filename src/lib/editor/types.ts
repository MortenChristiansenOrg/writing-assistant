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
  destroy(): void
}
