import { RotateCw, Undo2, X, Check, CheckCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AISplitToolbarProps {
  isLoading: boolean
  acceptedCount: number
  pendingCount: number
  canUndo: boolean
  onRegenerate: () => void
  onUndo: () => void
  onAcceptAll: () => void
  onCancel: () => void
  onFinish: () => void
}

export function AISplitToolbar({
  isLoading,
  acceptedCount,
  pendingCount,
  canUndo,
  onRegenerate,
  onUndo,
  onAcceptAll,
  onCancel,
  onFinish,
}: AISplitToolbarProps) {
  return (
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-1 border-b bg-secondary/50 px-2 py-1 max-sm:[&_button]:min-h-11 max-sm:[&_button]:min-w-11 sm:px-3">
      <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
        <span
          className="inline-block size-2 rounded-full"
          style={{
            backgroundColor: isLoading
              ? 'var(--diff-add-border)'
              : 'var(--diff-accepted-bg)',
            animation: isLoading ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}
        />
        <span>
          {isLoading ? 'Generating suggestion...' : 'Reviewing AI suggestions'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          aria-label="Regenerate suggestion"
          onClick={onRegenerate}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCw className="size-3.5" />
          )}
          <span className="hidden sm:inline">Regenerate</span>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Revert to previous suggestion</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 border-l" />

        <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Cancel AI review">
          <X className="size-3.5" />
          <span className="hidden sm:inline">Cancel</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          aria-label="Accept all suggestions"
          onClick={onAcceptAll}
          disabled={isLoading || pendingCount === 0}
        >
          <CheckCheck className="size-3.5" />
          <span className="hidden sm:inline">Accept All</span>
        </Button>

        <Button variant="default" size="sm" onClick={onFinish}>
          <Check className="size-3.5" />
          Apply{' '}
          {acceptedCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {acceptedCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  )
}
