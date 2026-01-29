import { test, expect } from '@playwright/test'
import { LoginPage, SidebarPage, EditorPage } from './page-objects'

test.describe('AI User Flow (Password Auth)', () => {
  test('login as test user and access app', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await loginPage.loginAsTestUser('Alice')

    // Should see the sidebar after login
    const sidebar = new SidebarPage(page)
    await expect(sidebar.header).toBeVisible()
  })

  test('create project and document after login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.loginAsTestUser('Alice')

    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    const projectName = `E2E Project ${Date.now()}`
    await sidebar.createProject(projectName)
    await expect(page.getByRole('button', { name: projectName })).toBeVisible()

    const docTitle = `E2E Doc ${Date.now()}`
    await sidebar.createDocument(docTitle)
    await expect(editor.editorContainer).toBeVisible()
  })

  test('type in editor after password auth', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.loginAsTestUser('Bob')

    const sidebar = new SidebarPage(page)
    const editor = new EditorPage(page)

    await sidebar.createProject(`Typing Test ${Date.now()}`)
    await sidebar.createDocument(`Doc ${Date.now()}`)

    await editor.typeText('Hello from password-authenticated user.')
    const content = await editor.getEditorText()
    expect(content).toContain('Hello from password-authenticated user.')
  })
})
