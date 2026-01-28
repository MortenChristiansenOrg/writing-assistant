import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class LoginPage extends BasePage {
  readonly card: Locator
  readonly title: Locator
  readonly description: Locator
  readonly githubButton: Locator

  constructor(page: Page) {
    super(page)
    this.card = page.locator('.max-w-sm')
    this.title = page.getByRole('heading', { name: 'Writing Assistant' })
    this.description = page.getByText('AI-powered prose writing and editing')
    this.githubButton = page.getByRole('button', { name: /Sign in with GitHub/i })
  }

  async goto() {
    await super.goto('/')
  }

  async isLoginVisible(): Promise<boolean> {
    return this.isVisible(this.githubButton)
  }

  async clickGitHubSignIn() {
    await this.githubButton.click()
  }
}
