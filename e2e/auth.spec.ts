import { test, expect } from '@playwright/test'
import { LoginPage } from './page-objects'

test.describe('Authentication', () => {
  test('login page visible when unauthenticated', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    // Verify login page elements are visible
    await expect(loginPage.title).toBeVisible()
    await expect(loginPage.description).toBeVisible()
    await expect(loginPage.signInButton).toBeVisible()
    await expect(loginPage.card).toBeVisible()
  })

  test('login page shows app title and description', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await expect(loginPage.title).toHaveText('Writing Assistant')
    await expect(loginPage.description).toHaveText('AI-powered prose writing and editing')
  })

  test('Clerk sign in button is clickable', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await expect(loginPage.signInButton).toBeEnabled()
  })

  test('unauthenticated user cannot access /app', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await page.goto('/app')

    // Should see login page since not authenticated
    const isLoginVisible = await loginPage.isLoginVisible()
    expect(isLoginVisible).toBe(true)
  })

  test('page loads without error during auth resolution', async ({ page }) => {
    await page.goto('/')

    // Auth resolves to either login page or app - either is valid
    const loginPage = new LoginPage(page)
    const isLoginVisible = await loginPage.isLoginVisible()
    const isAppVisible = await page.locator('[data-testid="sidebar"], .ProseMirror').first().isVisible().catch(() => false)
    expect(isLoginVisible || isAppVisible).toBe(true)
  })
})
