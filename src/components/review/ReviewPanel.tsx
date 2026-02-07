import { useState } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewNoteCard } from './ReviewNoteCard'
import { X, Eye, EyeOff, Trash2 } from 'lucide-react'

type Severity = 'info' | 'suggestion' | 'warning'

interface ReviewNote {
  _id: Id<'reviewNotes'>
  personaName: string
  severity: Severity
  category?: string
  comment: string
  dismissed: boolean
  createdAt: number
}

interface ReviewPanelProps {
  notes: ReviewNote[]
  loading: boolean
  onDismiss: (id: Id<'reviewNotes'>) => void
  onUndismiss: (id: Id<'reviewNotes'>) => void
  onClearAll: () => void
  onClose: () => void
  onApplySuggestion?: (comment: string) => void
  onReReview?: (noteId: Id<'reviewNotes'>) => void
  reReviewingId?: Id<'reviewNotes'> | null
}

export function ReviewPanel({
  notes,
  loading,
  onDismiss,
  onUndismiss,
  onClearAll,
  onClose,
  onApplySuggestion,
  onReReview,
  reReviewingId,
}: ReviewPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')
  const [showDismissed, setShowDismissed] = useState(false)

  const filtered = notes.filter((n) => {
    if (!showDismissed && n.dismissed) return false
    if (severityFilter !== 'all' && n.severity !== severityFilter) return false
    return true
  })

  const activeCount = notes.filter((n) => !n.dismissed).length

  return (
    <div className="review-panel-enter flex h-full w-96 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Review Notes</h2>
          {activeCount > 0 && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white"
              style={{ background: 'var(--review-accent)' }}
            >
              {activeCount}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b px-3 py-1.5">
        {(['all', 'info', 'suggestion', 'warning'] as const).map((s) => (
          <Button
            key={s}
            variant={severityFilter === s ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setSeverityFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowDismissed(!showDismissed)}
            title={showDismissed ? 'Hide dismissed' : 'Show dismissed'}
          >
            {showDismissed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          {notes.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={onClearAll}
              title="Clear all notes"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {loading && (
            <>
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
            </>
          )}
          {filtered.map((note) => (
            <ReviewNoteCard
              key={note._id}
              note={note}
              onDismiss={onDismiss}
              onUndismiss={onUndismiss}
              {...(onApplySuggestion ? { onApply: onApplySuggestion } : {})}
              {...(onReReview ? { onReReview, isReReviewing: reReviewingId === note._id } : {})}
            />
          ))}
          {!loading && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {notes.length === 0
                ? 'No review notes yet. Request feedback from a persona to get started.'
                : 'No notes match current filters.'}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
