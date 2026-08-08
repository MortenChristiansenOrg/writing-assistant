import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

export class LoginPage extends BasePage {
  readonly card: Locator
  readonly title: Locator
  readonly description: Locator
  readonly signInButton: Locator

  constructor(page: Page) {
    super(page)
    this.card = page.locator('.max-w-sm')
    this.title = page.getByRole('heading', { name: 'Writing Assistant' })
    this.description = page.getByText('AI-powered prose writing and editing')
    this.signInButton = page.getByRole('button', {
      name: /Sign in or create an account/i,
    })
  }

  async goto(): Promise<void> {
    await super.goto('/')
  }

  async isLoginVisible(): Promise<boolean> {
    return this.isVisible(this.signInButton)
  }

  async openSignIn(): Promise<void> {
    await this.signInButton.click()
  }

  async continueAsTestUser(): Promise<void> {
    await this.page.goto('/app')
    await expect(this.page).toHaveURL(/\/app/, { timeout: 15000 })
  }
}
