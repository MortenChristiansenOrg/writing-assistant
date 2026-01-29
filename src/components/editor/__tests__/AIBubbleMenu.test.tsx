import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@/test/test-utils'
import { AIBubbleMenu } from '../AIBubbleMenu'
import { AIBubbleMenuComponent } from './ai-bubble-menu.component'
import type { AIAction } from '../AIBubbleMenu'
import type { Editor } from '@tiptap/react'

function createMockEditor(selectedText = 'test text'): Editor {
  return {
    state: {
      selection: { from: 0, to: selectedText.length },
      doc: {
        textBetween: vi.fn().mockReturnValue(selectedText),
      },
    },
  } as unknown as Editor
}

describe('AIBubbleMenu', () => {
  let component: AIBubbleMenuComponent
  let mockEditor: Editor
  let mockOnAction: (action: AIAction, selectedText: string) => void

  beforeEach(() => {
    component = new AIBubbleMenuComponent()
    mockEditor = createMockEditor()
    mockOnAction = vi.fn() as any
  })

  it('renders trigger button', () => {
    render(<AIBubbleMenu editor={mockEditor} onAction={mockOnAction} />)

    expect(component.triggerButton).toBeInTheDocument()
    expect(component.triggerButton).toHaveTextContent('AI')
  })

  it('opens dropdown on click', async () => {
    render(<AIBubbleMenu editor={mockEditor} onAction={mockOnAction} />)

    expect(component.dropdown).not.toBeInTheDocument()

    await component.openDropdown()

    expect(component.dropdown).toBeInTheDocument()
    expect(component.getAllMenuItems()).toHaveLength(6)
  })

  it('shows all action items in dropdown', async () => {
    render(<AIBubbleMenu editor={mockEditor} onAction={mockOnAction} />)

    await component.openDropdown()

    expect(component.rewriteItem).toBeInTheDocument()
    expect(component.shorterItem).toBeInTheDocument()
    expect(component.expandItem).toBeInTheDocument()
    expect(component.formalItem).toBeInTheDocument()
    expect(component.casualItem).toBeInTheDocument()
    expect(component.fixGrammarItem).toBeInTheDocument()
  })

  it('calls onAction with rewrite action and selected text', async () => {
    const selectedText = 'hello world'
    mockEditor = createMockEditor(selectedText)

    render(<AIBubbleMenu editor={mockEditor} onAction={mockOnAction} />)

    await component.openDropdown()
    await component.clickRewrite()

    expect(mockOnAction).toHaveBeenCalledWith('rewrite', selectedText)
  })

  it('calls onAction with shorter action', async () => {
    render(<AIBubbleMenu editor={mockEditor} onAction={mockOnAction} />)

    await component.openDropdown()
    await component.clickShorter()

    expect(mockOnAction).toHaveBeenCalledWith('shorter', 'test text')
  })

  it('calls onAction with longer action', async () => {
    render(<AIBubbleMenu editor={mockEditor} onAction={mockOnAction} />)

    await component.openDropdown()
    await component.clickExpand()

    expect(mockOnAction).toHaveBeenCalledWith('longer', 'test text')
  })

  it('calls onAction with formal action', async () => {
    render(<AIBubbleMenu editor={mockEditor} onAction={mockOnAction} />)

    await component.openDropdown()
    await component.clickFormal()

    expect(mockOnAction).toHaveBeenCalledWith('formal', 'test text')
  })

  it('calls onAction with casual action', async () => {
    render(<AIBubbleMenu editor={mockEditor} onAction={mockOnAction} />)

    await component.openDropdown()
    await component.clickCasual()

    expect(mockOnAction).toHaveBeenCalledWith('casual', 'test text')
  })

  it('calls onAction with fix_grammar action', async () => {
    render(<AIBubbleMenu editor={mockEditor} onAction={mockOnAction} />)

    await component.openDropdown()
    await component.clickFixGrammar()

    expect(mockOnAction).toHaveBeenCalledWith('fix_grammar', 'test text')
  })

  it('works without onAction callback', async () => {
    render(<AIBubbleMenu editor={mockEditor} />)

    await component.openDropdown()
    await component.clickRewrite()

    // Should not throw
    expect(mockEditor.state.doc.textBetween).toHaveBeenCalled()
  })
})
