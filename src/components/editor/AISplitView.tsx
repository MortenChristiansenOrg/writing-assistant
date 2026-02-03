import { useEffect, useState, useCallback, useMemo } from 'react'
import { AISplitToolbar } from './AISplitToolbar'
import type { DiffChunk } from '@/lib/editor/diff-engine'
import type { AIAction } from '@/hooks/useAI'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface AISplitViewProps {
  originalDocumentText: string
  baselineText: string
  selectionRange: { from: number; to: number }
  chunks: DiffChunk[]
  isLoading: boolean
  acceptedCount: number
  pendingCount: number
  canUndo: boolean
  lastAction: AIAction
  onAcceptChunk: (id: string) => void
  onRevertChunk: (id: string) => void
  onAcceptAll: () => void
  onRegenerate: (action: AIAction) => void
  onUndo: () => void
  onFinish: () => void
  onCancel: () => void
}

export function AISplitView({
  originalDocumentText,
  baselineText,
  selectionRange,
  chunks,
  isLoading,
  acceptedCount,
  pendingCount,
  canUndo,
  lastAction,
  onAcceptChunk,
  onRevertChunk,
  onAcceptAll,
  onRegenerate,
  onUndo,
  onFinish,
  onCancel,
}: AISplitViewProps) {
  const [visible, setVisible] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Left panel: applyAcceptedChunks result with accepted adds highlighted
  const leftPanelHtml = useMemo(() => {
    const before = originalDocumentText.slice(0, selectionRange.from)
    const after = originalDocumentText.slice(selectionRange.to)

    let selectionMd = ''
    if (chunks.length === 0) {
      selectionMd = escapeHtml(baselineText)
    } else {
      for (const chunk of chunks) {
        if (chunk.type === 'equal') {
          selectionMd += escapeHtml(chunk.text)
        } else if (chunk.type === 'add' && chunk.status === 'accepted') {
          selectionMd += `<span class="diff-accepted-left" data-chunk-id="${chunk.id}">${escapeHtml(chunk.text)}</span>`
        } else if (chunk.type === 'remove' && chunk.status === 'accepted') {
          selectionMd += `<span class="diff-remove-left" data-chunk-id="${chunk.id}">${escapeHtml(chunk.text)}</span>`
        } else if (chunk.type === 'remove' && chunk.status !== 'accepted') {
          selectionMd += escapeHtml(chunk.text)
        }
      }
    }

    const deempBefore = before
      ? `<span class="diff-deemphasized">${escapeHtml(before)}</span>`
      : ''
    const deempAfter = after
      ? `<span class="diff-deemphasized">${escapeHtml(after)}</span>`
      : ''

    return deempBefore + selectionMd + deempAfter
  }, [originalDocumentText, selectionRange, chunks, baselineText])

  // Right panel: suggestions always visible, click pending to accept
  const rightPanelHtml = useMemo(() => {
    if (isLoading && chunks.length === 0) return ''

    const before = originalDocumentText.slice(0, selectionRange.from)
    const after = originalDocumentText.slice(selectionRange.to)

    let selectionHtml = ''
    for (const chunk of chunks) {
      if (chunk.type === 'equal') {
        selectionHtml += escapeHtml(chunk.text)
      } else if (chunk.type === 'add') {
        if (chunk.status === 'accepted') {
          selectionHtml +=
            `<span class="diff-accepted">${escapeHtml(chunk.text)}</span>`
        } else if (chunk.status === 'pending') {
          selectionHtml +=
            `<span class="diff-add diff-chunk-interactive" data-chunk-id="${chunk.id}" data-action="accept" title="Click to accept">${escapeHtml(chunk.text)}</span>`
        }
      } else if (chunk.type === 'remove') {
        if (chunk.status === 'accepted') {
          selectionHtml +=
            `<span class="diff-remove-accepted">${escapeHtml(chunk.text)}</span>`
        } else if (chunk.status === 'pending') {
          selectionHtml +=
            `<span class="diff-remove diff-chunk-interactive" data-chunk-id="${chunk.id}" data-action="accept" title="Click to accept removal">${escapeHtml(chunk.text)}</span>`
        } else if (chunk.status === 'rejected') {
          selectionHtml += escapeHtml(chunk.text)
        }
      }
    }

    const deempBefore = before
      ? `<span class="diff-deemphasized">${escapeHtml(before)}</span>`
      : ''
    const deempAfter = after
      ? `<span class="diff-deemphasized">${escapeHtml(after)}</span>`
      : ''

    return deempBefore + selectionHtml + deempAfter
  }, [originalDocumentText, selectionRange, chunks, isLoading])

  // Click-to-unaccept on left panel
  const handleLeftClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      const chunkId = target.closest('[data-chunk-id]')?.getAttribute('data-chunk-id')
      if (chunkId) {
        onRevertChunk(chunkId)
      }
    },
    [onRevertChunk]
  )

  // Event delegation on right panel: click pending chunk to accept
  const handleRightClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      const actionEl = target.closest('[data-action]') as HTMLElement | null
      if (!actionEl) return
      const chunkId = actionEl.getAttribute('data-chunk-id')
      if (!chunkId) return

      onAcceptChunk(chunkId)
    },
    [onAcceptChunk]
  )

  const handleCancel = () => {
    if (acceptedCount > 0) {
      setConfirmOpen(true)
    } else {
      onCancel()
    }
  }

  const handleConfirmDiscard = () => {
    setConfirmOpen(false)
    onCancel()
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease-out',
      }}
    >
      <AISplitToolbar
        isLoading={isLoading}
        acceptedCount={acceptedCount}
        pendingCount={pendingCount}
        canUndo={canUndo}
        onRegenerate={() => onRegenerate(lastAction)}
        onUndo={onUndo}
        onAcceptAll={onAcceptAll}
        onCancel={handleCancel}
        onFinish={onFinish}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div
          className="w-1/2 overflow-auto"
          style={{ borderRight: '1px solid var(--split-divider)' }}
          onClick={handleLeftClick}
        >
          <pre
            className="whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: leftPanelHtml }}
          />
        </div>

        {/* Right panel */}
        <div
          className="w-1/2 overflow-auto"
          style={{
            transform: visible ? 'translateX(0)' : 'translateX(20px)',
            transition: 'transform 300ms ease-out',
          }}
          onClick={handleRightClick}
        >
          {isLoading && chunks.length === 0 ? (
            <div className="p-4">
              <div className="space-y-2">
                <span className="diff-deemphasized whitespace-pre-wrap text-sm">
                  {originalDocumentText.slice(0, selectionRange.from)}
                </span>
                <div className="my-2 space-y-2">
                  <div className="diff-shimmer h-4 w-full" />
                  <div className="diff-shimmer h-4 w-4/5" />
                  <div className="diff-shimmer h-4 w-3/5" />
                </div>
                <span className="diff-deemphasized whitespace-pre-wrap text-sm">
                  {originalDocumentText.slice(selectionRange.to)}
                </span>
              </div>
            </div>
          ) : (
            <pre
              className="whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: rightPanelHtml }}
            />
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard AI edits?</DialogTitle>
            <DialogDescription>
              You have {acceptedCount} accepted edit
              {acceptedCount !== 1 && 's'}. Discarding will revert all changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={handleConfirmDiscard}>
              Discard edits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
