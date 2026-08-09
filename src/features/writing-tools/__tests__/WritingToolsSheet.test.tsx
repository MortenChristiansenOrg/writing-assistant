import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/test/test-utils'
import { WritingToolsSheet } from '../WritingToolsSheet'
import type { ToolContextSnapshot } from '../types'

const context: ToolContextSnapshot = {
  documentText: 'A quiet sentence becomes a decision.',
  selection: { text: 'quiet sentence', from: 3, to: 17 },
  cursor: 36,
}

describe('WritingToolsSheet', () => {
  it('explains a tool before running it and applies only after confirmation', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn().mockResolvedValue(true)
    render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="fiction"
        context={context}
        initialToolId="alternate-pov"
        onApply={onApply}
      />,
    )

    expect(screen.getByText('Draft impact')).toBeInTheDocument()
    expect(screen.getByText(/Nothing changes until/)).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Run prototype' }))
    expect(await screen.findByText('Prototype result')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Replace selection' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'replace',
      snapshot: context,
    }))
  })

  it('keeps unavailable tools discoverable and gives recovery guidance', async () => {
    const user = userEvent.setup()
    render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="general"
        context={{ documentText: '', selection: null, cursor: 1 }}
        initialToolId="alternate-pov"
        onApply={vi.fn().mockResolvedValue(true)}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Run prototype' }))
    expect(screen.getByText(/Select a passage in the editor/)).toBeInTheDocument()
  })

  it('resets result-local state when the same tool is run again', async () => {
    const user = userEvent.setup()
    render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="fiction"
        context={context}
        initialToolId="what-if"
        onApply={vi.fn().mockResolvedValue(true)}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Run prototype' }))
    expect(await screen.findByText('Prototype result')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Pin' })[0]!)
    expect(screen.getByText('Pinned')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Run again' }))
    expect(screen.getByRole('button', { name: 'Creating preview…' })).toBeDisabled()
    await waitFor(() => expect(screen.queryByText('Pinned')).not.toBeInTheDocument())
  })
})
