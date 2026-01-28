import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export class EditorComponent {
  get root() {
    return screen.queryByRole('textbox')
  }

  get loadingSpinner() {
    return screen.queryByRole('status')
  }

  get wordCount() {
    return screen.queryByText(/\d+ words/i)
  }

  get editorContent() {
    return document.querySelector('.ProseMirror')
  }

  get bubbleMenu() {
    return document.querySelector('[data-tippy-root]')
  }

  getWordCountValue() {
    const match = this.wordCount?.textContent?.match(/(\d+) words/i)
    return match ? parseInt(match[1], 10) : 0
  }

  hasPlaceholder(text: string) {
    const placeholder = document.querySelector('.is-empty.is-editor-empty')
    return placeholder !== null
  }

  async typeText(text: string) {
    const editor = this.editorContent
    if (editor) {
      await userEvent.click(editor)
      await userEvent.type(editor, text)
    }
  }

  async focus() {
    const editor = this.editorContent
    if (editor) {
      await userEvent.click(editor)
    }
  }
}
