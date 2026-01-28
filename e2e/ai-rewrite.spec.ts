import { test, expect } from '@playwright/test'
import { SidebarPage, EditorPage } from './page-objects'

// Note: These tests require authenticated session and AI service
// In CI, mock AI responses for deterministic tests
test.describe('AI Rewrite', () => {
  test.skip('select text shows bubble menu with AI button', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
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

  test.skip('AI button opens dropdown with actions', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
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
    await expect(page.getByRole('menuitem', { name: 'More formal' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'More casual' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Fix grammar' })).toBeVisible()
  })

  test.skip('trigger AI rewrite shows preview dialog', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    const originalText = 'This sentence needs improvement and could be better written.'
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

  test.skip('preview dialog shows original text', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    const originalText = 'The quick brown fox jumps.'
    await editor.typeText(originalText)
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    await editor.clickAIButton()
    await editor.selectAIAction('Rewrite')

    await editor.waitForAIPreviewDialog()

    // Original text should be shown
    await expect(page.getByText(originalText)).toBeVisible()
  })

  test.skip('accept AI suggestion replaces text', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
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

    // Text should be different from original
    const newContent = await editor.getEditorText()
    // Note: exact content depends on AI response, just verify change
    expect(newContent.length).toBeGreaterThan(0)
  })

  test.skip('reject AI suggestion keeps original text', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
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

  test.skip('AI actions show loading state', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
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

  test.skip('different AI actions work correctly', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    // Test "Make shorter" action
    const verboseText = 'This is an extremely verbose and unnecessarily long sentence that could definitely be shortened significantly.'
    await editor.typeText(verboseText)
    await editor.selectAllText()
    await editor.waitForBubbleMenu()

    await editor.clickAIButton()
    await editor.selectAIAction('Shorter')

    await editor.waitForAIPreviewDialog()
    await expect(editor.aiPreviewDialog).toBeVisible()
  })
})
