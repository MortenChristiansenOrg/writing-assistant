import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export class AIPreviewDialogComponent {
  get dialog() {
    return screen.queryByRole('dialog')
  }

  get title() {
    return screen.queryByRole('heading', { name: /ai suggestion/i })
  }

  get description() {
    return screen.queryByText(/review the ai/i)
  }

  get originalLabel() {
    return screen.queryByText('Original')
  }

  get suggestedLabel() {
    return screen.queryByText('Suggested')
  }

  get loadingIndicator() {
    return screen.queryByText(/generating/i)
  }

  get waitingText() {
    return screen.queryByText(/waiting for response/i)
  }

  get acceptButton() {
    return screen.queryByRole('button', { name: /accept/i })
  }

  get rejectButton() {
    return screen.queryByRole('button', { name: /reject/i })
  }

  get closeButton() {
    return screen.queryByRole('button', { name: /close/i })
  }

  getOriginalText(text: string) {
    return screen.queryByText(text)
  }

  getPreviewText(text: string) {
    return screen.queryByText(text)
  }

  async clickAccept() {
    const button = this.acceptButton
    if (button) {
      await userEvent.click(button)
    }
  }

  async clickReject() {
    const button = this.rejectButton
    if (button) {
      await userEvent.click(button)
    }
  }

  async clickClose() {
    const button = this.closeButton
    if (button) {
      await userEvent.click(button)
    }
  }

  isAcceptDisabled() {
    return this.acceptButton?.hasAttribute('disabled') ?? true
  }
}
