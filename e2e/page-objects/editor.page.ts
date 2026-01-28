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
  readonly aiPreviewDialog: Locator
  readonly aiPreviewOriginal: Locator
  readonly aiPreviewSuggested: Locator
  readonly aiAcceptButton: Locator
  readonly aiRejectButton: Locator
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    super(page)
    this.editorContainer = page.locator('.ProseMirror').first()
    this.editorContent = page.locator('.ProseMirror')
    this.wordCount = page.locator('text=/\\d+ words/')
    this.documentTitle = page.locator('header h1')
    this.historyButton = page.getByRole('button', { name: /History/i })
    this.aiButton = page.getByRole('button', { name: /AI/i })
    this.bubbleMenu = page.locator('.rounded-lg.border.bg-popover')
    this.aiPreviewDialog = page.getByRole('dialog')
    this.aiPreviewOriginal = page.locator('text=Original').locator('..')
    this.aiPreviewSuggested = page.locator('text=Suggested').locator('..')
    this.aiAcceptButton = page.getByRole('button', { name: 'Accept' })
    this.aiRejectButton = page.getByRole('button', { name: 'Reject' })
    this.loadingIndicator = page.locator('text=Generating...')
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
    await this.page.keyboard.press('Control+a')
    await this.page.keyboard.type(text, { delay: 50 })
  }

  async getEditorText(): Promise<string> {
    return this.editorContent.textContent() ?? ''
  }

  async getWordCount(): Promise<string> {
    return this.wordCount.textContent() ?? ''
  }

  async selectAllText() {
    await this.editorContent.click()
    await this.page.keyboard.press('Control+a')
  }

  async selectText(text: string) {
    const content = await this.getEditorText()
    const startIndex = content.indexOf(text)
    if (startIndex === -1) throw new Error(`Text "${text}" not found in editor`)

    await this.editorContent.click()
    // Triple click to select paragraph, then use keyboard
    await this.page.keyboard.press('Control+a')
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
    await this.aiPreviewDialog.waitFor({ state: 'visible', timeout: 10000 })
  }

  async waitForAICompletion() {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
  }

  async acceptAISuggestion() {
    await this.aiAcceptButton.click()
  }

  async rejectAISuggestion() {
    await this.aiRejectButton.click()
  }

  async openHistory() {
    await this.historyButton.click()
  }

  async isHistoryPanelVisible(): Promise<boolean> {
    const historyPanel = this.page.getByText('Document History')
    return this.isVisible(historyPanel)
  }
}
