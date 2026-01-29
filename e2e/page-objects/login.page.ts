import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class LoginPage extends BasePage {
  readonly card: Locator
  readonly title: Locator
  readonly description: Locator
  readonly githubButton: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator

  constructor(page: Page) {
    super(page)
    this.card = page.locator('.max-w-sm')
    this.title = page.getByRole('heading', { name: 'Writing Assistant' })
    this.description = page.getByText('AI-powered prose writing and editing')
    this.githubButton = page.getByRole('button', { name: /Sign in with GitHub/i })
    this.emailInput = page.getByTestId('dev-email')
    this.passwordInput = page.getByTestId('dev-password')
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

  async loginAsTestUser(name: 'Alice' | 'Bob' | 'Carol') {
    await this.page.getByRole('button', { name }).click()
    await this.page.waitForURL(/\/app/, { timeout: 15000 })
  }

  async loginWithPassword(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.emailInput.press('Enter')
    await this.page.waitForURL(/\/app/, { timeout: 15000 })
  }
}
