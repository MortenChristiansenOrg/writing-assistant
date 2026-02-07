import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { MessageSquarePlus, User, Loader2 } from 'lucide-react'
import { MODELS } from '@/lib/models'

interface Persona {
  _id: Id<'personas'>
  name: string
  description?: string
  systemPrompt: string
  model?: string
}

interface FeedbackRequestPopoverProps {
  loading: boolean
  onRequest: (persona: {
    id?: Id<'personas'>
    name: string
    systemPrompt: string
    model?: string
  }) => void
}

function modelLabel(modelId?: string): string {
  if (!modelId) return ''
  const found = MODELS.find((m) => m.id === modelId)
  return found ? found.name : modelId.split('/').pop() ?? ''
}

export function FeedbackRequestPopover({ loading, onRequest }: FeedbackRequestPopoverProps) {
  const personas = useQuery(api.personas.list) as Persona[] | undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
          )}
          Feedback
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
          Choose a persona to review your text
        </p>
        {(!personas || personas.length === 0) && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            No personas configured. Create one in Settings.
          </p>
        )}
        {personas?.map((p) => (
          <button
            key={p._id}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
            disabled={loading}
            onClick={() => {
              const req: { id?: Id<'personas'>; name: string; systemPrompt: string; model?: string } = {
                id: p._id,
                name: p.name,
                systemPrompt: p.systemPrompt,
              }
              if (p.model) req.model = p.model
              onRequest(req)
            }}
          >
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{p.name}</div>
              {p.model && (
                <div className="truncate text-[10px] text-muted-foreground">
                  {modelLabel(p.model)}
                </div>
              )}
            </div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
