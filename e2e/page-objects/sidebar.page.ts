import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class SidebarPage extends BasePage {
  readonly sidebar: Locator
  readonly header: Locator
  readonly projectsLabel: Locator
  readonly documentsLabel: Locator
  readonly newProjectButton: Locator
  readonly newDocumentButton: Locator
  readonly projectDialog: Locator
  readonly documentDialog: Locator
  readonly projectNameInput: Locator
  readonly documentTitleInput: Locator
  readonly createProjectButton: Locator
  readonly createDocumentButton: Locator
  readonly settingsButton: Locator
  readonly signOutButton: Locator

  constructor(page: Page) {
    super(page)
    this.sidebar = page.locator('[data-sidebar="sidebar"]')
    this.header = page.getByRole('heading', { name: 'Writing Assistant' })
    this.projectsLabel = page.getByText('Projects')
    this.documentsLabel = page.getByText('Documents')
    this.newProjectButton = page.getByTitle('New Project')
    this.newDocumentButton = page.getByTitle('New Document')
    this.projectDialog = page.getByRole('dialog').filter({ hasText: 'New Project' })
    this.documentDialog = page.getByRole('dialog').filter({ hasText: 'New Document' })
    this.projectNameInput = page.getByPlaceholder('Project name')
    this.documentTitleInput = page.getByPlaceholder('Document title')
    this.createProjectButton = page.getByRole('button', { name: 'Create Project' })
    this.createDocumentButton = page.getByRole('button', { name: 'Create Document' })
    this.settingsButton = page.getByRole('button', { name: /Settings/i })
    this.signOutButton = page.getByRole('menuitem', { name: /Sign out/i })
  }

  async goto() {
    await super.goto('/app')
    await this.waitForLoaded()
  }

  async createProject(name: string): Promise<void> {
    await this.newProjectButton.click()
    await this.projectDialog.waitFor({ state: 'visible' })
    await this.projectNameInput.fill(name)
    await this.createProjectButton.click()
    await this.projectDialog.waitFor({ state: 'hidden' })
  }

  async createDocument(title: string): Promise<void> {
    await this.newDocumentButton.click()
    await this.documentDialog.waitFor({ state: 'visible' })
    await this.documentTitleInput.fill(title)
    await this.createDocumentButton.click()
    await this.documentDialog.waitFor({ state: 'hidden' })
  }

  async selectProject(name: string): Promise<void> {
    await this.page.getByRole('button', { name }).click()
  }

  async selectDocument(title: string): Promise<void> {
    await this.page.getByRole('button', { name: title }).click()
  }

  async getProjectList(): Promise<string[]> {
    const projects = this.page.locator('[data-sidebar="menu"] button').filter({ has: this.page.locator('svg.lucide-folder-open') })
    const count = await projects.count()
    const names: string[] = []
    for (let i = 0; i < count; i++) {
      names.push(await projects.nth(i).textContent() ?? '')
    }
    return names
  }

  async getDocumentList(): Promise<string[]> {
    const docs = this.page.locator('[data-sidebar="menu"] button').filter({ has: this.page.locator('svg.lucide-file-text') })
    const count = await docs.count()
    const titles: string[] = []
    for (let i = 0; i < count; i++) {
      titles.push(await docs.nth(i).textContent() ?? '')
    }
    return titles
  }

  async openSettingsMenu(): Promise<void> {
    await this.settingsButton.click()
  }

  async signOut(): Promise<void> {
    await this.openSettingsMenu()
    await this.signOutButton.click()
  }

  async isSidebarVisible(): Promise<boolean> {
    return this.isVisible(this.header)
  }
}
