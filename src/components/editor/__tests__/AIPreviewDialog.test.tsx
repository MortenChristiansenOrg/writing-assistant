import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@/test/test-utils'
import { AIPreviewDialog } from '../AIPreviewDialog'
import { AIPreviewDialogComponent } from './ai-preview-dialog.component'

describe('AIPreviewDialog', () => {
  let component: AIPreviewDialogComponent
  let mockOnOpenChange: (open: boolean) => void
  let mockOnAccept: () => void
  let mockOnReject: () => void

  const defaultProps = {
    open: true,
    originalText: 'Original content here',
    previewText: 'Suggested content here',
    isLoading: false,
  }

  beforeEach(() => {
    component = new AIPreviewDialogComponent()
    mockOnOpenChange = vi.fn() as any
    mockOnAccept = vi.fn() as any
    mockOnReject = vi.fn() as any
  })

  it('renders when open', () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(component.dialog).toBeInTheDocument()
    expect(component.title).toBeInTheDocument()
    expect(component.description).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        open={false}
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(component.dialog).not.toBeInTheDocument()
  })

  it('displays original and suggested text', () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(component.originalLabel).toBeInTheDocument()
    expect(component.suggestedLabel).toBeInTheDocument()
    expect(component.getOriginalText('Original content here')).toBeInTheDocument()
    expect(component.getPreviewText('Suggested content here')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        isLoading={true}
        previewText=""
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(component.loadingIndicator).toBeInTheDocument()
    expect(component.isAcceptDisabled()).toBe(true)
  })

  it('shows waiting text when no preview', () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        isLoading={false}
        previewText=""
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(component.waitingText).toBeInTheDocument()
  })

  it('disables accept button when loading', () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        isLoading={true}
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(component.isAcceptDisabled()).toBe(true)
  })

  it('disables accept button when no preview text', () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        previewText=""
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(component.isAcceptDisabled()).toBe(true)
  })

  it('enables accept button when preview ready', () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(component.isAcceptDisabled()).toBe(false)
  })

  it('calls onAccept and closes dialog when accept clicked', async () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    await component.clickAccept()

    expect(mockOnAccept).toHaveBeenCalled()
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onReject and closes dialog when reject clicked', async () => {
    render(
      <AIPreviewDialog
        {...defaultProps}
        onOpenChange={mockOnOpenChange}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    await component.clickReject()

    expect(mockOnReject).toHaveBeenCalled()
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })
})
