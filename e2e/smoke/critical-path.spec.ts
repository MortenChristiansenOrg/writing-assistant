import { test, expect } from '@playwright/test'
import { LoginPage } from '../page-objects'

test.describe('Critical Path Smoke Tests', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('/')

    // Page should load without errors
    await expect(page).not.toHaveTitle(/error/i)

    // Either login page or app should be visible
    const loginPage = new LoginPage(page)
    const hasLoginButton = await loginPage.isLoginVisible()

    // App loaded successfully if we see login or sidebar
    expect(hasLoginButton).toBe(true)
  })

  test('login page renders correctly', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    // Core elements present
    await expect(loginPage.title).toBeVisible()
    await expect(loginPage.githubButton).toBeVisible()

    // Button is interactive
    await expect(loginPage.githubButton).toBeEnabled()
  })

  test('navigation to /app shows login for unauthenticated user', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await page.goto('/app')

    // Should redirect to login or show login inline
    const isLoginVisible = await loginPage.isLoginVisible()
    expect(isLoginVisible).toBe(true)
  })

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('load')

    // Filter out expected errors (like auth-related in test env)
    const criticalErrors = errors.filter(
      (e) => !e.includes('Failed to fetch') && !e.includes('net::ERR')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('page is responsive', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(loginPage.githubButton).toBeVisible()

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(loginPage.githubButton).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(loginPage.githubButton).toBeVisible()
  })
})
