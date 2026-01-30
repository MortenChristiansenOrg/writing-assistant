import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  Sparkles,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  PenLine,
  MessageSquare,
} from 'lucide-react'

export type AIAction =
  | 'rewrite'
  | 'shorter'
  | 'longer'
  | 'formal'
  | 'casual'
  | 'fix_grammar'

interface AIBubbleMenuProps {
  editor: Editor
  onAction?: (action: AIAction, selectedText: string) => void
}

const actions: { action: AIAction; label: string; icon: React.ReactNode }[] = [
  { action: 'rewrite', label: 'Rewrite', icon: <PenLine className="h-4 w-4" /> },
  {
    action: 'shorter',
    label: 'Shorter',
    icon: <ArrowDownNarrowWide className="h-4 w-4" />,
  },
  {
    action: 'longer',
    label: 'Expand',
    icon: <ArrowUpNarrowWide className="h-4 w-4" />,
  },
  {
    action: 'formal',
    label: 'More formal',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    action: 'casual',
    label: 'More casual',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    action: 'fix_grammar',
    label: 'Fix grammar',
    icon: <PenLine className="h-4 w-4" />,
  },
]

export function AIBubbleMenu({ editor, onAction }: AIBubbleMenuProps) {
  const handleAction = (action: AIAction) => {
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    onAction?.(action, selectedText)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <Sparkles className="h-4 w-4" />
          AI
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" disablePortal>
        {actions.map(({ action, label, icon }) => (
          <DropdownMenuItem key={action} onClick={() => handleAction(action)}>
            {icon}
            <span className="ml-2">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
