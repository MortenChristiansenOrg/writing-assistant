import type { Id } from '../../../convex/_generated/dataModel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, X, RotateCcw, Wand2, RefreshCw, Loader2 } from 'lucide-react'

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
  onApply?: (comment: string) => void
  onReReview?: (noteId: Id<'reviewNotes'>) => void
  isReReviewing?: boolean
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

export function ReviewNoteCard({ note, onDismiss, onUndismiss, onApply, onReReview, isReReviewing }: ReviewNoteCardProps) {
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
        <div className="flex shrink-0 gap-0.5">
          {onApply && !note.dismissed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              title="Apply suggestion"
              onClick={() => onApply(note.comment)}
            >
              <Wand2 className="h-3 w-3" />
            </Button>
          )}
          {onReReview && !note.dismissed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              title="Re-review"
              disabled={isReReviewing}
              onClick={() => onReReview(note._id)}
            >
              {isReReviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => note.dismissed ? onUndismiss(note._id) : onDismiss(note._id)}
          >
            {note.dismissed ? <RotateCcw className="h-3 w-3" /> : <X className="h-3 w-3" />}
          </Button>
        </div>
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
