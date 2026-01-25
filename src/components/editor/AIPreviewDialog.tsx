import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

interface AIPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  originalText: string
  previewText: string
  isLoading: boolean
  onAccept: () => void
  onReject: () => void
}

export function AIPreviewDialog({
  open,
  onOpenChange,
  originalText,
  previewText,
  isLoading,
  onAccept,
  onReject,
}: AIPreviewDialogProps) {
  const handleReject = () => {
    onReject()
    onOpenChange(false)
  }

  const handleAccept = () => {
    onAccept()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Suggestion</DialogTitle>
          <DialogDescription>
            Review the AI&apos;s suggestion before applying it to your document.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Original
            </h4>
            <ScrollArea className="h-32 rounded-md border bg-muted/50 p-3">
              <p className="text-sm">{originalText}</p>
            </ScrollArea>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Suggested
            </h4>
            <ScrollArea className="h-32 rounded-md border bg-primary/5 p-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </div>
              ) : (
                <p className="text-sm">{previewText || 'Waiting for response...'}</p>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReject}>
            Reject
          </Button>
          <Button onClick={handleAccept} disabled={isLoading || !previewText}>
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
