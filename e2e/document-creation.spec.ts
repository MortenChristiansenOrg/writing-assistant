import { test, expect } from '@playwright/test'
import { SidebarPage, EditorPage } from './page-objects'

// Note: These tests require authenticated session
// In CI, use playwright auth state or mock auth
test.describe('Document Creation', () => {
  test.skip('create project and document', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()

    // Create new project
    const projectName = `Test Project ${Date.now()}`
    await sidebar.createProject(projectName)

    // Verify project appears in sidebar
    await expect(page.getByRole('button', { name: projectName })).toBeVisible()

    // Create new document
    const docTitle = `Test Document ${Date.now()}`
    await sidebar.createDocument(docTitle)

    // Verify document appears in sidebar
    await expect(page.getByRole('button', { name: docTitle })).toBeVisible()

    // Verify editor loads
    await expect(editor.editorContainer).toBeVisible()
  })

  test.skip('type in editor and verify content', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()

    // Create project and document
    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    // Type text
    const testText = 'Hello, this is a test document.'
    await editor.typeText(testText)

    // Verify text appears
    const content = await editor.getEditorText()
    expect(content).toContain(testText)
  })

  test.skip('word count updates while typing', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    // Initially 0 words
    await expect(editor.wordCount).toContainText('0 words')

    // Type some words
    await editor.typeText('One two three four five')

    // Word count should update
    await expect(editor.wordCount).toContainText('5 words')
  })

  test.skip('autosave triggers after typing', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    // Type text
    const testText = 'Autosave test content'
    await editor.typeText(testText)

    // Wait for autosave to complete
    await editor.waitForAutosave()

    // Reload page
    await page.reload()
    await editor.waitForLoaded()

    // Verify content persisted
    const content = await editor.getEditorText()
    expect(content).toContain(testText)
  })

  test.skip('content persists after reload', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`Project ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    // Type content
    const paragraph = 'This is a paragraph that should persist after page reload.'
    await editor.typeText(paragraph)

    // Wait for autosave to complete
    await editor.waitForAutosave()

    // Store current URL
    const url = page.url()

    // Reload
    await page.reload()
    await editor.waitForLoaded()

    // Verify URL unchanged
    expect(page.url()).toBe(url)

    // Verify content
    const content = await editor.getEditorText()
    expect(content).toContain(paragraph)
  })

  test.skip('multiple documents maintain separate content', async ({ page }) => {
    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.goto()
    await sidebar.createProject(`Project ${Date.now()}`)

    // Create first document
    await sidebar.createDocument(`Doc A ${Date.now()}`)
    await editor.typeText('Content for document A')
    await editor.waitForAutosave()

    // Create second document
    await sidebar.createDocument(`Doc B ${Date.now()}`)
    await editor.clearAndType('Content for document B')
    await editor.waitForAutosave()

    // Navigate back to first document
    const docA = page.getByRole('button', { name: /Doc A/ })
    await docA.click()
    await editor.waitForLoaded()

    // Verify first document content
    const contentA = await editor.getEditorText()
    expect(contentA).toContain('Content for document A')
  })
})
