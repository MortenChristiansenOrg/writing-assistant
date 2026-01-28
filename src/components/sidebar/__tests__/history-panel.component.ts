import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export class HistoryPanelComponent {
  get triggerButton() {
    return screen.getByRole('button', { name: /history/i })
  }

  get sheetTitle() {
    return screen.queryByRole('heading', { name: /document history/i })
  }

  get sheetDescription() {
    return screen.queryByText(/view and restore previous versions/i)
  }

  get emptyStateMessage() {
    return screen.queryByText(/no revisions yet/i)
  }

  get revisionItems() {
    return screen.queryAllByText(/restore/i).filter(el => el.tagName === 'BUTTON')
  }

  getRevisionByType(type: string) {
    return screen.queryByText(type)
  }

  getRevisionDescription(text: string) {
    return screen.queryByText(text)
  }

  getAllRestoreButtons() {
    return screen.queryAllByRole('button', { name: /restore/i })
  }

  async openPanel() {
    await userEvent.click(this.triggerButton)
  }

  async clickRestoreButton(index: number) {
    const buttons = this.getAllRestoreButtons()
    if (buttons[index]) {
      await userEvent.click(buttons[index])
    }
  }

  isSheetOpen() {
    return this.sheetTitle !== null
  }
}
