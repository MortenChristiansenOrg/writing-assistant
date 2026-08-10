import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, render, screen, waitFor, within } from '@/test/test-utils'
import { WritingToolsSheet } from '../WritingToolsSheet'
import { runPrototypeTool } from '../prototype-runner'
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
    const { rerender } = render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="fiction"
        context={context}
        executionMode="prototype"
        onRun={runPrototypeTool}
        initialToolId="alternate-pov"
        onApply={onApply}
      />,
    )

    expect(screen.getByText('Draft impact')).toBeInTheDocument()
    expect(screen.getByText(/Nothing changes until/)).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Use tool' }))
    expect(await screen.findByText('Prototype result')).toBeInTheDocument()
    rerender(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="fiction"
        context={{
          ...context,
          selection: { text: 'different passage', from: 18, to: 35 },
        }}
        executionMode="prototype"
        onRun={runPrototypeTool}
        initialToolId="alternate-pov"
        onApply={onApply}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Replace selection' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'replace',
      snapshot: context,
    }))
  })

  it('enables a selection tool when editor context updates while Tools stays open', async () => {
    const { rerender } = render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="general"
        context={{ documentText: '', selection: null, cursor: 1 }}
        executionMode="prototype"
        onRun={runPrototypeTool}
        initialToolId="alternate-pov"
        onApply={vi.fn().mockResolvedValue(true)}
      />,
    )

    expect(screen.getByText('Choose context in the editor')).toBeInTheDocument()
    expect(screen.getByText(/Keep Tools open, then select a passage/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use tool' })).toBeDisabled()

    rerender(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="general"
        context={context}
        executionMode="prototype"
        onRun={runPrototypeTool}
        initialToolId="alternate-pov"
        onApply={vi.fn().mockResolvedValue(true)}
      />,
    )

    expect(screen.queryByText('Choose context in the editor')).not.toBeInTheDocument()
    expect(screen.queryByText(/Keep Tools open, then select a passage/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use tool' })).toBeEnabled()
  })

  it('keeps the workspace open while the user interacts with the editor', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <div>
        <button type="button">Editor surface</button>
        <WritingToolsSheet
          open
          onOpenChange={onOpenChange}
          category="fiction"
          context={context}
          executionMode="prototype"
          onRun={runPrototypeTool}
          onApply={vi.fn().mockResolvedValue(true)}
        />
      </div>,
    )

    await user.click(screen.getByRole('button', { name: 'Editor surface' }))

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('resets result-local state when the same tool is run again', async () => {
    const user = userEvent.setup()
    render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="fiction"
        context={context}
        executionMode="prototype"
        onRun={runPrototypeTool}
        initialToolId="what-if"
        onApply={vi.fn().mockResolvedValue(true)}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Use tool' }))
    expect(await screen.findByText('Prototype result')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Pin' })[0]!)
    expect(screen.getByText('Pinned')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Run again' }))
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled()
    await waitFor(() => expect(screen.queryByText('Pinned')).not.toBeInTheDocument())
  })

  it('shows fresh scratchpad text after running a tool again', async () => {
    const user = userEvent.setup()
    const onRun = vi.fn()
      .mockResolvedValueOnce({
        kind: 'scratchpad',
        text: 'First continuation',
        preferredApply: 'insert',
      })
      .mockResolvedValueOnce({
        kind: 'scratchpad',
        text: 'A genuinely different continuation',
        preferredApply: 'insert',
      })
    render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="fiction"
        context={{ ...context, selection: null }}
        executionMode="ai"
        onRun={onRun}
        initialToolId="continue-scene"
        onApply={vi.fn().mockResolvedValue(true)}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Use tool' }))
    expect(await screen.findByDisplayValue('First continuation')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Run again' }))

    expect(await screen.findByDisplayValue('A genuinely different continuation')).toBeInTheDocument()
    expect(onRun).toHaveBeenCalledTimes(2)
  })

  it('ignores an AI response after the user leaves the running tool', async () => {
    const user = userEvent.setup()
    let resolveRun: ((result: {
      kind: 'review'
      summary: string
      items: []
    }) => void) | undefined
    const onRun = vi.fn(() => new Promise<{
      kind: 'review'
      summary: string
      items: []
    }>((resolve) => {
      resolveRun = resolve
    }))
    render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="fiction"
        context={context}
        executionMode="ai"
        onRun={onRun}
        onApply={vi.fn().mockResolvedValue(true)}
      />,
    )

    const card = screen.getByText('Dialogue audit').closest<HTMLElement>('[data-slot="card"]')
    if (!card) throw new Error('Dialogue audit card not found')
    await user.click(within(card).getByRole('button', { name: 'Use tool' }))
    expect(screen.getByRole('button', { name: 'Back to tools' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to tools' }))
    await act(async () => {
      resolveRun?.({ kind: 'review', summary: 'Late response', items: [] })
    })

    expect(screen.getByText('Writing tools')).toBeInTheDocument()
    expect(screen.queryByText('Late response')).not.toBeInTheDocument()
    expect(screen.queryByText('AI result')).not.toBeInTheDocument()
  })

  it('runs a ready tool directly from its catalog card', async () => {
    const user = userEvent.setup()
    render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="fiction"
        context={context}
        executionMode="prototype"
        onRun={runPrototypeTool}
        onApply={vi.fn().mockResolvedValue(true)}
      />,
    )

    const card = screen.getByText('Dialogue audit').closest<HTMLElement>('[data-slot="card"]')
    if (!card) throw new Error('Dialogue audit card not found')
    await user.click(within(card).getByRole('button', { name: 'Use tool' }))

    expect(await screen.findByText('Prototype result')).toBeInTheDocument()
    expect(screen.getByText('Read-only review')).toBeInTheDocument()
  })

  it('keeps details separate and opens required configuration from Use tool', async () => {
    const user = userEvent.setup()
    render(
      <WritingToolsSheet
        open
        onOpenChange={vi.fn()}
        category="fiction"
        context={context}
        executionMode="prototype"
        onRun={runPrototypeTool}
        onApply={vi.fn().mockResolvedValue(true)}
      />,
    )

    const alternateCard = screen.getByText('Alternate point of view').closest<HTMLElement>('[data-slot="card"]')
    if (!alternateCard) throw new Error('Alternate point of view card not found')
    await user.click(within(alternateCard).getByRole('button', { name: 'Details' }))
    expect(screen.getByText('Draft impact')).toBeInTheDocument()
    expect(screen.getByText('How to use this tool')).toBeInTheDocument()
    expect(screen.getByText(/Select the passage you want to experiment with/)).toBeInTheDocument()
    expect(screen.queryByText('Prototype result')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to tools' }))
    const blueprintCard = screen.getByText('Scene blueprint').closest<HTMLElement>('[data-slot="card"]')
    if (!blueprintCard) throw new Error('Scene blueprint card not found')
    await user.click(within(blueprintCard).getByRole('button', { name: 'Use tool' }))

    expect(screen.getByLabelText('Goal *')).toBeInTheDocument()
    expect(screen.queryByText('Prototype result')).not.toBeInTheDocument()
  })
})
