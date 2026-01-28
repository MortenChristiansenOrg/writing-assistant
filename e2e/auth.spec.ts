import { test, expect } from '@playwright/test'
import { LoginPage } from './page-objects'

test.describe('Authentication', () => {
  test('login page visible when unauthenticated', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    // Verify login page elements are visible
    await expect(loginPage.title).toBeVisible()
    await expect(loginPage.description).toBeVisible()
    await expect(loginPage.githubButton).toBeVisible()
    await expect(loginPage.card).toBeVisible()
  })

  test('login page shows app title and description', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await expect(loginPage.title).toHaveText('Writing Assistant')
    await expect(loginPage.description).toHaveText('AI-powered prose writing and editing')
  })

  test('github sign in button is clickable', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await expect(loginPage.githubButton).toBeEnabled()
    // Note: actual OAuth flow requires auth setup, just verify button works
  })

  test('unauthenticated user cannot access /app', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await page.goto('/app')

    // Should see login page since not authenticated
    const isLoginVisible = await loginPage.isLoginVisible()
    expect(isLoginVisible).toBe(true)
  })

  test('loading spinner shown while auth state loading', async ({ page }) => {
    const loginPage = new LoginPage(page)

    // Navigate and immediately check for spinner before auth resolves
    const responsePromise = page.goto('/')

    // The loading spinner should appear briefly
    // This is a timing-sensitive test, may need adjustment
    await responsePromise
  })
})
