import { Page, Locator, expect } from '@playwright/test'

export class BasePage {
  readonly page: Page
  readonly loadingSpinner: Locator

  constructor(page: Page) {
    this.page = page
    this.loadingSpinner = page.locator('.animate-spin')
  }

  async goto(path: string = '/') {
    await this.page.goto(path)
  }

  async waitForLoaded() {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 })
  }

  async getToastMessage(): Promise<string> {
    const toast = this.page.locator('[data-sonner-toast]').first()
    await toast.waitFor({ state: 'visible', timeout: 5000 })
    return toast.textContent() ?? ''
  }

  async waitForNavigation(url: string | RegExp) {
    await expect(this.page).toHaveURL(url, { timeout: 10000 })
  }

  async isVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 3000 })
      return true
    } catch {
      return false
    }
  }
}
