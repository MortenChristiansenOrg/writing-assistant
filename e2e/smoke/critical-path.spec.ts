import { test, expect } from '@playwright/test'
import { LoginPage, SidebarPage, EditorPage } from '../page-objects'

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

  test.skip('authenticated user sees sidebar', async ({ page }) => {
    // Note: Requires auth setup in playwright config
    const sidebar = new SidebarPage(page)
    await sidebar.goto()

    await expect(sidebar.header).toBeVisible()
    await expect(sidebar.projectsLabel).toBeVisible()
    await expect(sidebar.newProjectButton).toBeVisible()
  })

  test.skip('editor container renders', async ({ page }) => {
    // Note: Requires auth and existing document
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`Smoke Test ${Date.now()}`)
    await sidebar.createDocument(`Test Doc ${Date.now()}`)

    await expect(editor.editorContainer).toBeVisible()
    await expect(editor.wordCount).toBeVisible()
  })

  test.skip('typing in editor works', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`Typing Test ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    await editor.typeText('Smoke test typing')

    const content = await editor.getEditorText()
    expect(content).toContain('Smoke test typing')
  })

  test.skip('AI menu accessible from editor', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`AI Test ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    await editor.typeText('Text for AI menu test')
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    await expect(editor.aiButton).toBeVisible()

    await editor.clickAIButton()

    // AI menu options should appear
    await expect(page.getByRole('menuitem', { name: 'Rewrite' })).toBeVisible()
  })

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

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
