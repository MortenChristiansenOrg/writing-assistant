import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class EditorPage extends BasePage {
  readonly editorContainer: Locator
  readonly editorContent: Locator
  readonly wordCount: Locator
  readonly documentTitle: Locator
  readonly historyButton: Locator
  readonly aiButton: Locator
  readonly bubbleMenu: Locator
  readonly aiSplitToolbar: Locator
  readonly aiAcceptButton: Locator
  readonly aiCancelButton: Locator
  readonly loadingIndicator: Locator
  // Keep old names as aliases for backward compat in specs
  readonly aiPreviewDialog: Locator

  constructor(page: Page) {
    super(page)
    this.editorContainer = page.locator('.ProseMirror').first()
    this.editorContent = page.locator('.ProseMirror')
    this.wordCount = page.locator('text=/\\d+ words/')
    this.documentTitle = page.locator('header h1')
    this.historyButton = page.getByRole('button', { name: /History/i })
    this.aiButton = page.getByRole('button', { name: /AI/i })
    this.bubbleMenu = page.locator('.rounded-lg.border.bg-popover')
    this.aiSplitToolbar = page.getByText(/Reviewing AI suggestions|Generating suggestion/)
    this.aiAcceptButton = page.getByRole('button', { name: /Apply/i })
    this.aiCancelButton = page.getByRole('button', { name: /Cancel/i })
    this.loadingIndicator = page.getByText('Generating suggestion...')
    // Split view toolbar acts as the "dialog" presence indicator
    this.aiPreviewDialog = this.aiSplitToolbar
  }

  async gotoDocument(projectId: string, docId: string) {
    await super.goto(`/app/project/${projectId}/doc/${docId}`)
    await this.waitForLoaded()
  }

  async typeText(text: string) {
    await this.editorContent.click()
    await this.page.keyboard.type(text, { delay: 50 })
  }

  async clearAndType(text: string) {
    await this.editorContent.click()
    await this.page.keyboard.press('ControlOrMeta+a')
    await this.page.keyboard.type(text, { delay: 50 })
  }

  async getEditorText(): Promise<string> {
    return (await this.editorContent.first().textContent()) ?? ''
  }

  async getWordCount(): Promise<string> {
    return (await this.wordCount.textContent()) ?? ''
  }

  async selectAllText() {
    await this.editorContent.click()
    await this.page.keyboard.press('ControlOrMeta+a')
  }

  async selectText(text: string) {
    const textLocator = this.editorContent.getByText(text, { exact: true })
    await textLocator.click({ clickCount: 3 })
  }

  async waitForBubbleMenu() {
    await this.bubbleMenu.waitFor({ state: 'visible', timeout: 5000 })
  }

  async clickAIButton() {
    await this.aiButton.click()
  }

  async selectAIAction(action: 'Rewrite' | 'Shorter' | 'Expand' | 'More formal' | 'More casual' | 'Fix grammar') {
    await this.page.getByRole('menuitem', { name: action }).click()
  }

  async waitForAIPreviewDialog() {
    // Wait for split view toolbar to appear
    await this.aiSplitToolbar.waitFor({ state: 'visible', timeout: 10000 })
  }

  async waitForAICompletion() {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
  }

  async acceptAISuggestion() {
    await this.aiAcceptButton.click()
  }

  async rejectAISuggestion() {
    await this.aiCancelButton.click()
  }

  async waitForAutosave() {
    await this.page.waitForResponse(
      (resp) => resp.url().includes('convex') && resp.status() === 200,
      { timeout: 5000 }
    ).catch(async () => {
      await this.page.waitForLoadState('networkidle').catch(() => {})
    })
  }

  async openHistory() {
    await this.historyButton.click()
  }

  async isHistoryPanelVisible(): Promise<boolean> {
    const historyPanel = this.page.getByText('Document History')
    return this.isVisible(historyPanel)
  }
}
