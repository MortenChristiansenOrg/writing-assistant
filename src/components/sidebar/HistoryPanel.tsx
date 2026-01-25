import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { History, RotateCcw, Bot, User, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface HistoryPanelProps {
  documentId: Id<'documents'>
}

type ChangeType = 'manual' | 'ai_rewrite' | 'ai_insert' | 'restore'

interface Revision {
  _id: Id<'revisions'>
  changeType: ChangeType
  description?: string
  createdAt: number
}

const changeTypeIcons: Record<ChangeType, typeof User> = {
  manual: User,
  ai_rewrite: Bot,
  ai_insert: Bot,
  restore: RefreshCw,
}

const changeTypeLabels: Record<ChangeType, string> = {
  manual: 'Manual edit',
  ai_rewrite: 'AI rewrite',
  ai_insert: 'AI insert',
  restore: 'Restored',
}

export function HistoryPanel({ documentId }: HistoryPanelProps) {
  const revisions = useQuery(api.revisions.list, { documentId }) as
    | Revision[]
    | undefined
  const restore = useMutation(api.revisions.restore)

  const handleRestore = async (revisionId: Id<'revisions'>) => {
    try {
      await restore({ revisionId })
      toast.success('Document restored')
    } catch {
      toast.error('Failed to restore')
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Document History</SheetTitle>
          <SheetDescription>
            View and restore previous versions of your document.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(100vh-200px)]">
          <div className="space-y-3 pr-4">
            {revisions?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No revisions yet. Changes will appear here.
              </p>
            )}
            {revisions?.map((revision: Revision) => {
              const Icon = changeTypeIcons[revision.changeType]
              return (
                <div
                  key={revision._id}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {changeTypeLabels[revision.changeType]}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(revision.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {revision.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {revision.description}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void handleRestore(revision._id)}
                  >
                    <RotateCcw className="mr-2 h-3 w-3" />
                    Restore
                  </Button>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
