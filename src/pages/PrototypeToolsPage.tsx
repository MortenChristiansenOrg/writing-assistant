import { useCallback, useRef, useState } from 'react'
import { BookOpen, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { Editor } from '@/components/editor/Editor'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { DocumentContent, EditorAdapter } from '@/lib/editor'
import { ProjectCategorySelect } from '@/features/writing-tools/ProjectCategorySelect'
import {
  WritingToolsSheet,
  type ToolApplyRequest,
} from '@/features/writing-tools/WritingToolsSheet'
import { getProjectCategory } from '@/features/writing-tools/catalog'
import type {
  ProjectCategoryId,
  ToolContextSnapshot,
} from '@/features/writing-tools/types'
import { applyToolText, validateToolApply } from '@/features/writing-tools/draft-apply'
import { runPrototypeTool } from '@/features/writing-tools/prototype-runner'

const prototypeDocument: DocumentContent = {
  type: 'json',
  data: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'The key at midnight' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Mara held out her hand. “You said you trusted me.” Ivo looked toward the locked door, then folded the key into his fist.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'The station clock began to strike twelve. Neither of them moved.',
          },
        ],
      },
    ],
  },
}

export function PrototypeToolsPage() {
  const adapterRef = useRef<EditorAdapter | null>(null)
  const toolsOpenRef = useRef(false)
  const [category, setCategory] = useState<ProjectCategoryId>('fiction')
  const [toolsOpen, setToolsOpen] = useState(false)
  const [context, setContext] = useState<ToolContextSnapshot | null>(null)
  const [initialToolId, setInitialToolId] = useState<string | null>(null)

  const handleAdapterReady = useCallback((adapter: EditorAdapter) => {
    adapterRef.current = adapter
  }, [])

  const refreshToolContext = useCallback(() => {
    if (!toolsOpenRef.current) return
    const adapter = adapterRef.current
    if (!adapter) return
    setContext({
      documentText: adapter.getMarkdown(),
      selection: adapter.getSelection(),
      cursor: adapter.getCursorPosition(),
      cursorContext: adapter.getCursorContext(),
    })
  }, [])

  const handleToolsOpenChange = useCallback((open: boolean) => {
    toolsOpenRef.current = open
    setToolsOpen(open)
  }, [])

  const openTools = useCallback((toolId?: string) => {
    const adapter = adapterRef.current
    if (!adapter) return
    setContext({
      documentText: adapter.getMarkdown(),
      selection: adapter.getSelection(),
      cursor: adapter.getCursorPosition(),
      cursorContext: adapter.getCursorContext(),
    })
    setInitialToolId(toolId ?? null)
    toolsOpenRef.current = true
    setToolsOpen(true)
  }, [])

  const apply = useCallback(async ({ operation, text, snapshot }: ToolApplyRequest) => {
    const adapter = adapterRef.current
    if (!adapter) return false
    const request = { operation, text, snapshot }
    const validationError = validateToolApply(adapter, request)
    if (validationError) {
      toast.error(validationError)
      return false
    }
    applyToolText(adapter, request)
    toast.success('Prototype draft updated')
    return true
  }, [])

  const categoryDefinition = getProjectCategory(category)

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 flex-col gap-6 border-r bg-muted/20 p-5 md:flex">
        <div className="flex items-center gap-2 font-semibold">
          <BookOpen className="size-5" />
          Writing Assistant
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="prototype-category-desktop">Project category</Label>
          <ProjectCategorySelect
            id="prototype-category-desktop"
            value={category}
            onValueChange={setCategory}
          />
        </div>
        <Alert className="mt-auto">
          <AlertTitle>UX evaluation route</AlertTitle>
          <AlertDescription>This local page uses the production editor and tool surfaces without account or AI setup.</AlertDescription>
        </Alert>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-w-0 flex-wrap items-center gap-2 border-b px-3 py-2 max-sm:[&_button]:min-h-11 max-sm:[&_button]:min-w-11 sm:px-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-medium sm:text-lg">The key at midnight</h1>
            <p className="truncate text-xs text-muted-foreground">{categoryDefinition.name} · UX prototype</p>
          </div>
          <Button variant={toolsOpen ? 'secondary' : 'outline'} size="sm" onClick={() => openTools()}>
            <Wrench data-icon="inline-start" />
            Tools
          </Button>
        </header>

        <div className="border-b p-3 md:hidden">
          <Label htmlFor="prototype-category-mobile" className="sr-only">Project category</Label>
          <ProjectCategorySelect
            id="prototype-category-mobile"
            value={category}
            onValueChange={setCategory}
          />
        </div>

        <div className="min-h-0 flex-1">
          <Editor
            content={prototypeDocument}
            contentKey="writing-tools-prototype"
            onChange={refreshToolContext}
            onSelectionChange={refreshToolContext}
            onAdapterReady={handleAdapterReady}
            onWritingTool={(toolId) => openTools(toolId)}
            placeholder="Start writing…"
          />
        </div>
      </main>

      {context && (
        <WritingToolsSheet
          key={`${toolsOpen ? 'open' : 'closed'}-${category}-${initialToolId ?? 'catalog'}`}
          open={toolsOpen}
          onOpenChange={handleToolsOpenChange}
          category={category}
          context={context}
          initialToolId={initialToolId}
          executionMode="prototype"
          onRun={runPrototypeTool}
          onApply={apply}
        />
      )}
    </div>
  )
}
