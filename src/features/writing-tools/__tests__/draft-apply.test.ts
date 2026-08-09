import { describe, expect, it, vi } from 'vitest'
import { applyToolText, validateToolApply } from '../draft-apply'
import type { ToolApplyRequest } from '../types'

function createAdapter(markdown = 'A quiet sentence.') {
  return {
    getMarkdown: vi.fn(() => markdown),
    getTextInRange: vi.fn(() => 'quiet'),
    getDocumentRange: vi.fn(() => ({ from: 0, to: 19 })),
    replaceRange: vi.fn(),
  }
}

const replaceRequest: ToolApplyRequest = {
  operation: 'replace',
  text: 'restless',
  snapshot: {
    documentText: 'A quiet sentence.',
    selection: { text: 'quiet', from: 3, to: 8 },
    cursor: 8,
  },
}

describe('writing tool draft application', () => {
  it('refuses a stale document snapshot', () => {
    const adapter = createAdapter('A changed sentence.')
    expect(validateToolApply(adapter, replaceRequest)).toContain('draft changed')
    expect(adapter.replaceRange).not.toHaveBeenCalled()
  })

  it('refuses a stale captured selection', () => {
    const adapter = createAdapter()
    adapter.getTextInRange.mockReturnValue('other')
    expect(validateToolApply(adapter, replaceRequest)).toContain('selected passage changed')
  })

  it('replaces only the captured selection after validation', () => {
    const adapter = createAdapter()
    expect(validateToolApply(adapter, replaceRequest)).toBeNull()
    applyToolText(adapter, replaceRequest)
    expect(adapter.replaceRange).toHaveBeenCalledWith(3, 8, 'restless')
  })

  it('supports captured cursor insertion and document append', () => {
    const adapter = createAdapter()
    applyToolText(adapter, { ...replaceRequest, operation: 'insert' })
    applyToolText(adapter, { ...replaceRequest, operation: 'append' })
    expect(adapter.replaceRange).toHaveBeenNthCalledWith(1, 8, 8, 'restless')
    expect(adapter.replaceRange).toHaveBeenNthCalledWith(2, 19, 19, '\n\nrestless')
  })

  it('never treats a replace request without a selection as an append', () => {
    const adapter = createAdapter()
    const invalidRequest: ToolApplyRequest = {
      ...replaceRequest,
      snapshot: { ...replaceRequest.snapshot, selection: null },
    }

    expect(() => applyToolText(adapter, invalidRequest)).toThrow('no captured selection')
    expect(adapter.replaceRange).not.toHaveBeenCalled()
  })
})
