import { test, expect, Page } from '@playwright/test'
import { LoginPage, SidebarPage, EditorPage } from './page-objects'

const MOCK_RESPONSES: Record<string, string> = {
  rewrite: 'This is a beautifully rewritten sentence.',
  shorter: 'Short version.',
  longer:
    'This is an expanded version of the text with additional detail and elaboration to make it longer and more comprehensive.',
  formal: 'I hereby present the formal rendition of the text.',
  casual: 'Hey, here is the chill version!',
  fix_grammar: 'This sentence has been corrected for grammar.',
}

/** Intercept POST /ai/stream and return a mock streamed response. */
async function mockAIStream(page: Page) {
  await page.route('**/ai/stream', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()

    let action = 'rewrite'
    try {
      const body = request.postDataJSON()
      if (body?.action && body.action in MOCK_RESPONSES) action = body.action
    } catch {
      // default to rewrite
    }

    const text = MOCK_RESPONSES[action] ?? MOCK_RESPONSES.rewrite

    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: text,
    })
  })
}

/** Login, set a fake API key in settings, then navigate back to /app. */
async function setupUser(page: Page) {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.loginAsTestUser('Alice')

  // Navigate to settings to set an API key
  await page.goto('/app/settings')
  await page.waitForLoadState('networkidle')

  // Only set key if not already configured
  const configured = page.getByText('API key configured')
  const isConfigured = await configured.isVisible().catch(() => false)
  if (!isConfigured) {
    const input = page.getByPlaceholder('sk-or-...')
    await input.fill('sk-or-fake-test-key')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('API key saved')).toBeVisible()
  }

  // Go back to main app
  await page.goto('/app')
  await page.waitForLoadState('networkidle')
}

test.describe('AI Rewrite', () => {
  test.beforeEach(async ({ page }) => {
    await mockAIStream(page)
    await setupUser(page)
  })

  test('select text shows bubble menu with AI button', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    // Type some text
    await editor.typeText('This is a sample sentence to rewrite.')

    // Select all text
    await editor.selectAllText()

    // Bubble menu should appear
    await editor.waitForBubbleMenu()
    await expect(editor.aiButton).toBeVisible()
  })

  test('AI button opens dropdown with actions', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    await editor.typeText('Text to transform.')
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    // Click AI button
    await editor.clickAIButton()

    // Verify dropdown options
    await expect(page.getByRole('menuitem', { name: 'Rewrite' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Shorter' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Expand' })).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: 'More formal' })
    ).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: 'More casual' })
    ).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: 'Fix grammar' })
    ).toBeVisible()
  })

  test('trigger AI rewrite shows preview dialog', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    const originalText =
      'This sentence needs improvement and could be better written.'
    await editor.typeText(originalText)
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    await editor.clickAIButton()
    await editor.selectAIAction('Rewrite')

    // Preview dialog should appear
    await editor.waitForAIPreviewDialog()
    await expect(editor.aiPreviewDialog).toBeVisible()
    await expect(page.getByText('AI Suggestion')).toBeVisible()
    await expect(page.getByText('Original')).toBeVisible()
    await expect(page.getByText('Suggested')).toBeVisible()
  })

  test('preview dialog shows original text', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    const originalText = 'The quick brown fox jumps.'
    await editor.typeText(originalText)
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    await editor.clickAIButton()
    await editor.selectAIAction('Rewrite')

    await editor.waitForAIPreviewDialog()

    // Original text should be shown in dialog
    await expect(editor.aiPreviewDialog.getByText(originalText)).toBeVisible()
  })

  test('accept AI suggestion replaces text', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    const originalText = 'This is bad writing that needs fixing.'
    await editor.typeText(originalText)
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    await editor.clickAIButton()
    await editor.selectAIAction('Rewrite')

    await editor.waitForAIPreviewDialog()
    await editor.waitForAICompletion()

    // Accept the suggestion
    await editor.acceptAISuggestion()

    // Dialog should close
    await expect(editor.aiPreviewDialog).not.toBeVisible()

    // Text should be the mock rewrite response
    const newContent = await editor.getEditorText()
    expect(newContent).toContain(MOCK_RESPONSES.rewrite)
  })

  test('reject AI suggestion keeps original text', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    const originalText = 'Keep this exact text unchanged.'
    await editor.typeText(originalText)
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    await editor.clickAIButton()
    await editor.selectAIAction('Rewrite')

    await editor.waitForAIPreviewDialog()
    await editor.waitForAICompletion()

    // Reject the suggestion
    await editor.rejectAISuggestion()

    // Dialog should close
    await expect(editor.aiPreviewDialog).not.toBeVisible()

    // Original text should remain
    const content = await editor.getEditorText()
    expect(content).toContain(originalText)
  })

  test('AI actions show loading state', async ({ page }) => {
    // Override route with a delayed response for this test
    await page.unrouteAll({ behavior: 'wait' })
    await page.route('**/ai/stream', async (route) => {
      // Delay to observe loading state
      await new Promise((r) => setTimeout(r, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: MOCK_RESPONSES.longer,
      })
    })

    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    await editor.typeText('Generate a longer version of this.')
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    await editor.clickAIButton()
    await editor.selectAIAction('Expand')

    await editor.waitForAIPreviewDialog()

    // Loading indicator should appear
    await expect(editor.loadingIndicator).toBeVisible()

    // Accept button should be disabled while loading
    await expect(editor.aiAcceptButton).toBeDisabled()
  })

  test('different AI actions work correctly', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    // Test "Make shorter" action
    const verboseText =
      'This is an extremely verbose and unnecessarily long sentence that could definitely be shortened significantly.'
    await editor.typeText(verboseText)
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    await editor.clickAIButton()
    await editor.selectAIAction('Shorter')

    await editor.waitForAIPreviewDialog()
    await expect(editor.aiPreviewDialog).toBeVisible()
  })
})
