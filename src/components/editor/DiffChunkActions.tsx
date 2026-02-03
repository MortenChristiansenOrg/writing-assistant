import { Check, X, Undo2 } from 'lucide-react'
import type { DiffChunk } from '@/lib/editor/diff-engine'

interface DiffChunkActionsProps {
  chunk: DiffChunk
  style?: React.CSSProperties
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onRevert: (id: string) => void
}

export function DiffChunkActions({
  chunk,
  style,
  onAccept,
  onReject,
  onRevert,
}: DiffChunkActionsProps) {
  if (chunk.type === 'equal') return null

  return (
    <div
      className="z-10 flex items-center gap-0.5 rounded-full border bg-popover px-1 py-0.5 shadow-sm"
      style={style}
    >
      {chunk.status === 'accepted' ? (
        <button
          className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => onRevert(chunk.id)}
          title="Revert"
        >
          <Undo2 className="size-3" />
        </button>
      ) : (
        <>
          <button
            className="flex size-5 items-center justify-center rounded-full hover:bg-accent"
            style={{ color: 'var(--diff-add-border)' }}
            onClick={() => onAccept(chunk.id)}
            title="Accept"
          >
            <Check className="size-3" />
          </button>
          <button
            className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => onReject(chunk.id)}
            title="Reject"
          >
            <X className="size-3" />
          </button>
        </>
      )}
    </div>
  )
}
