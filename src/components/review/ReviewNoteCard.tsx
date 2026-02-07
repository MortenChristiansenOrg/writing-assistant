import type { Id } from '../../../convex/_generated/dataModel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, X, RotateCcw } from 'lucide-react'

interface ReviewNote {
  _id: Id<'reviewNotes'>
  personaName: string
  severity: 'info' | 'suggestion' | 'warning'
  category?: string
  comment: string
  dismissed: boolean
  createdAt: number
}

interface ReviewNoteCardProps {
  note: ReviewNote
  onDismiss: (id: Id<'reviewNotes'>) => void
  onUndismiss: (id: Id<'reviewNotes'>) => void
}

const severityColors: Record<string, string> = {
  info: 'var(--review-info)',
  suggestion: 'var(--review-suggestion)',
  warning: 'var(--review-warning)',
}

const severityLabels: Record<string, string> = {
  info: 'Info',
  suggestion: 'Suggestion',
  warning: 'Warning',
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function ReviewNoteCard({ note, onDismiss, onUndismiss }: ReviewNoteCardProps) {
  return (
    <div
      className={`review-note-card rounded-md border bg-card p-3 ${note.dismissed ? 'dismissed' : ''}`}
      style={{ borderLeftWidth: 3, borderLeftColor: severityColors[note.severity] }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="font-medium">{note.personaName}</span>
          <span>&middot;</span>
          <span>{timeAgo(note.createdAt)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => note.dismissed ? onUndismiss(note._id) : onDismiss(note._id)}
        >
          {note.dismissed ? <RotateCcw className="h-3 w-3" /> : <X className="h-3 w-3" />}
        </Button>
      </div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0"
          style={{ borderColor: severityColors[note.severity], color: severityColors[note.severity] }}
        >
          {severityLabels[note.severity]}
        </Badge>
        {note.category && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {note.category}
          </Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed">{note.comment}</p>
    </div>
  )
}
