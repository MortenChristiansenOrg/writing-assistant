import type { EditorAdapter } from '@/lib/editor'
import type { ToolApplyRequest } from './types'

type DraftAdapter = Pick<
  EditorAdapter,
  'getMarkdown' | 'getTextInRange' | 'getDocumentRange' | 'replaceRange'
>

export function validateToolApply(
  adapter: DraftAdapter,
  request: ToolApplyRequest,
): string | null {
  if (adapter.getMarkdown() !== request.snapshot.documentText) {
    return 'The draft changed while the tool was open. Run it again with fresh context.'
  }
  if (request.operation === 'replace') {
    const selection = request.snapshot.selection
    if (!selection) return 'There is no captured selection to replace.'
    if (adapter.getTextInRange(selection.from, selection.to) !== selection.text) {
      return 'The selected passage changed. Run this tool again before replacing it.'
    }
  }
  return null
}

export function applyToolText(adapter: DraftAdapter, request: ToolApplyRequest): void {
  if (request.operation === 'replace') {
    if (!request.snapshot.selection) {
      throw new Error('There is no captured selection to replace.')
    }
    adapter.replaceRange(
      request.snapshot.selection.from,
      request.snapshot.selection.to,
      request.text,
    )
    return
  }
  if (request.operation === 'insert') {
    adapter.replaceRange(request.snapshot.cursor, request.snapshot.cursor, request.text)
    return
  }
  const range = adapter.getDocumentRange()
  adapter.replaceRange(range.to, range.to, `\n\n${request.text}`)
}
