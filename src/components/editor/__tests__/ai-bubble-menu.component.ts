import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export class AIBubbleMenuComponent {
  get triggerButton() {
    return screen.getByRole('button', { name: /ai/i })
  }

  get dropdown() {
    return screen.queryByRole('menu')
  }

  get rewriteItem() {
    return screen.getByRole('menuitem', { name: /rewrite/i })
  }

  get shorterItem() {
    return screen.getByRole('menuitem', { name: /shorter/i })
  }

  get expandItem() {
    return screen.getByRole('menuitem', { name: /expand/i })
  }

  get formalItem() {
    return screen.getByRole('menuitem', { name: /more formal/i })
  }

  get casualItem() {
    return screen.getByRole('menuitem', { name: /more casual/i })
  }

  get fixGrammarItem() {
    return screen.getByRole('menuitem', { name: /fix grammar/i })
  }

  getAllMenuItems() {
    return screen.getAllByRole('menuitem')
  }

  async openDropdown() {
    await userEvent.click(this.triggerButton)
  }

  async clickRewrite() {
    await userEvent.click(this.rewriteItem)
  }

  async clickShorter() {
    await userEvent.click(this.shorterItem)
  }

  async clickExpand() {
    await userEvent.click(this.expandItem)
  }

  async clickFormal() {
    await userEvent.click(this.formalItem)
  }

  async clickCasual() {
    await userEvent.click(this.casualItem)
  }

  async clickFixGrammar() {
    await userEvent.click(this.fixGrammarItem)
  }
}
