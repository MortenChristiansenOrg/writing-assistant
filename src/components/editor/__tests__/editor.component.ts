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
    return match?.[1] ? parseInt(match[1], 10) : 0
  }

  hasPlaceholder(_text: string) {
    return document.querySelector('.is-empty.is-editor-empty') !== null
  }

  async typeText(text: string) {
    const el = this.editorContent
    if (el) {
      await userEvent.click(el)
      await userEvent.type(el, text)
    }
  }

  async focus() {
    const editor = this.editorContent
    if (editor) {
      await userEvent.click(editor)
    }
  }
}
