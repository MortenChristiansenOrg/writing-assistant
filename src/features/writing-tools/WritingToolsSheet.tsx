import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bookmark,
  Check,
  Clipboard,
  FilePenLine,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  MousePointer2,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  getAvailableTools,
  getDisabledReason,
  getProjectCategory,
  getRecommendationReason,
  TOOL_STAGES,
} from './catalog'
import { runPrototypeTool } from './prototype-runner'
import type {
  OptionItem,
  OptionsResult,
  ProjectCategoryId,
  ReviewResult,
  ScratchpadResult,
  ToolContextSnapshot,
  ToolDefinition,
  ToolParameters,
  ToolResult,
  ToolStage,
  TransformResult,
  ToolApplyRequest,
} from './types'

export type { ToolApplyRequest } from './types'

interface WritingToolsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ProjectCategoryId
  context: ToolContextSnapshot
  initialToolId?: string | null
  onApply: (request: ToolApplyRequest) => Promise<boolean>
}

function DetailRow({ label, children }: { label: string; children: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-relaxed">{children}</dd>
    </div>
  )
}

function ToolCard({
  tool,
  reason,
  disabledReason,
  onUse,
  onDetails,
}: {
  tool: ToolDefinition
  reason: string | null
  disabledReason: string | null
  onUse: () => void
  onDetails: () => void
}) {
  return (
    <Card className="gap-4 py-4 shadow-none">
      <CardHeader className="gap-1 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{tool.name}</CardTitle>
          <Badge variant="outline" className="capitalize">{tool.stage}</Badge>
        </div>
        <CardDescription>{tool.summary}</CardDescription>
      </CardHeader>
      {(reason || disabledReason) && (
        <CardContent className="px-4">
          <p className={disabledReason ? 'text-sm text-muted-foreground' : 'text-sm text-primary'}>
            {disabledReason ?? reason}
          </p>
        </CardContent>
      )}
      <CardFooter className="justify-end gap-2 px-4">
        <Button variant="outline" size="sm" onClick={onDetails}>
          Details
        </Button>
        <Button size="sm" onClick={onUse} disabled={disabledReason !== null}>
          Use tool
        </Button>
      </CardFooter>
    </Card>
  )
}

function TransformToolResult({
  result,
  onReplace,
}: {
  result: TransformResult
  onReplace: (text: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="suggestion">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="original">Original</TabsTrigger>
          <TabsTrigger value="suggestion">Suggestion</TabsTrigger>
        </TabsList>
        <TabsContent value="original" className="mt-2 rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
          {result.original}
        </TabsContent>
        <TabsContent value="suggestion" className="mt-2 rounded-lg border p-4 text-sm leading-relaxed">
          {result.suggestion}
        </TabsContent>
      </Tabs>
      <Alert>
        <FilePenLine />
        <AlertTitle>Explicit draft change</AlertTitle>
        <AlertDescription>Replace only the passage captured when you opened this tool.</AlertDescription>
      </Alert>
      <Button onClick={() => onReplace(result.suggestion)}>
        <Check data-icon="inline-start" />
        Replace selection
      </Button>
    </div>
  )
}

function ReviewToolResult({ result }: { result: ReviewResult }) {
  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <Lightbulb />
        <AlertTitle>Read-only review</AlertTitle>
        <AlertDescription>{result.summary}</AlertDescription>
      </Alert>
      {result.items.map((item) => (
        <Card key={item.id} className="gap-3 py-4 shadow-none">
          <CardHeader className="px-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm">{item.title}</CardTitle>
              <Badge variant={item.severity === 'opportunity' ? 'default' : 'secondary'}>
                {item.severity}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 text-sm leading-relaxed text-muted-foreground">
            {item.body}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function OptionsToolResult({
  result,
  onScratchpad,
}: {
  result: OptionsResult
  onScratchpad: (option: OptionItem) => void
}) {
  const [items, setItems] = useState(result.items)
  const [pinned, setPinned] = useState<Set<string>>(() => new Set())

  if (items.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Lightbulb /></EmptyMedia>
          <EmptyTitle>No paths left</EmptyTitle>
          <EmptyDescription>Run the tool again to start with a fresh set of directions.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <Card key={item.id} className="gap-4 py-4 shadow-none">
          <CardHeader className="px-4">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base">{item.title}</CardTitle>
              {pinned.has(item.id) && <Badge>Pinned</Badge>}
            </div>
            <CardDescription>{item.rationale}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 text-sm leading-relaxed">{item.body}</CardContent>
          <CardFooter className="flex-wrap gap-2 px-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPinned((current) => {
                const next = new Set(current)
                if (next.has(item.id)) next.delete(item.id)
                else next.add(item.id)
                return next
              })}
            >
              <Bookmark data-icon="inline-start" />
              {pinned.has(item.id) ? 'Unpin' : 'Pin'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onScratchpad(item)}>
              <Send data-icon="inline-start" />
              Scratchpad
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItems((current) => current.map((candidate) =>
                candidate.id === item.id
                  ? { ...candidate, body: `${candidate.body} Now invert who has the most to lose.` }
                  : candidate
              ))}
            >
              <RefreshCw data-icon="inline-start" />
              Remix
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Dismiss ${item.title}`}
              onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}
            >
              <Trash2 />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function ScratchpadToolResult({
  result,
  onApply,
}: {
  result: ScratchpadResult
  onApply: (operation: 'insert' | 'append', text: string) => void
}) {
  const [text, setText] = useState(result.text)

  const copyToClipboard = async (): Promise<void> => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch (clipboardError) {
      console.error(clipboardError)
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="tool-scratchpad">Scratchpad</FieldLabel>
        <Textarea
          id="tool-scratchpad"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={13}
          className="resize-y leading-relaxed"
        />
        <FieldDescription>Edit freely. This text is separate from your manuscript.</FieldDescription>
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          onClick={() => void copyToClipboard()}
        >
          <Clipboard data-icon="inline-start" />
          Copy
        </Button>
        <Button onClick={() => onApply(result.preferredApply, text)} disabled={!text.trim()}>
          <Send data-icon="inline-start" />
          {result.preferredApply === 'insert' ? 'Insert at captured cursor' : 'Append to draft'}
        </Button>
      </div>
    </div>
  )
}

export function WritingToolsSheet({
  open,
  onOpenChange,
  category,
  context,
  initialToolId,
  onApply,
}: WritingToolsSheetProps) {
  const tools = getAvailableTools(category)
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(() =>
    initialToolId ? tools.find((tool) => tool.id === initialToolId) ?? null : null,
  )
  const [result, setResult] = useState<ToolResult | null>(null)
  const [runContext, setRunContext] = useState<ToolContextSnapshot | null>(null)
  const [resultVersion, setResultVersion] = useState<number>(0)
  const [parameters, setParameters] = useState<ToolParameters>({})
  const [query, setQuery] = useState<string>('')
  const [stage, setStage] = useState<'all' | ToolStage>('all')
  const [running, setRunning] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const interactingOutsideRef = useRef<boolean>(false)
  const isMobile = useIsMobile()

  const visibleTools = useMemo(() => tools.filter((tool) => {
    const matchesStage = stage === 'all' || tool.stage === stage
    const haystack = `${tool.name} ${tool.summary} ${tool.helpsWith}`.toLowerCase()
    return matchesStage && haystack.includes(query.trim().toLowerCase())
  }), [query, stage, tools])

  const run = async (
    tool: ToolDefinition | null = selectedTool,
    toolParameters: ToolParameters = parameters,
  ) => {
    if (!tool) return
    const disabledReason = getDisabledReason(tool, context)
    if (disabledReason) {
      setError(disabledReason)
      return
    }
    const missing = tool.parameters?.find(
      (parameter) => parameter.required && !toolParameters[parameter.id]?.trim(),
    )
    if (missing) {
      setError(`${missing.label} is required.`)
      return
    }
    setError(null)
    setRunning(true)
    try {
      const executionContext = context
      const nextResult = await runPrototypeTool(tool, executionContext, toolParameters)
      setRunContext(executionContext)
      setResult(nextResult)
      setResultVersion((version) => version + 1)
    } catch (runError) {
      console.error(runError)
      setError('The prototype could not produce a result. Try again.')
    } finally {
      setRunning(false)
    }
  }

  const apply = async (operation: ToolApplyRequest['operation'], text: string) => {
    if (!runContext) {
      setError('Run the tool again before changing the draft.')
      return
    }
    const applied = await onApply({ operation, text, snapshot: runContext })
    if (applied) onOpenChange(false)
  }

  const categoryDefinition = getProjectCategory(category)

  const showToolDetails = (tool: ToolDefinition): void => {
    setSelectedTool(tool)
    setResult(null)
    setRunContext(null)
    setParameters({})
    setError(null)
  }

  const launchTool = (tool: ToolDefinition): void => {
    showToolDetails(tool)
    const needsConfiguration = tool.parameters?.some((parameter) => parameter.required) ?? false
    if (!needsConfiguration) void run(tool, {})
  }

  const selectedToolDisabledReason = selectedTool
    ? getDisabledReason(selectedTool, context)
    : null

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && interactingOutsideRef.current) return
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
      <SheetContent
        side={isMobile && !result ? 'bottom' : 'right'}
        showOverlay={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={() => {
          interactingOutsideRef.current = true
          window.setTimeout(() => {
            interactingOutsideRef.current = false
          }, 0)
        }}
        className={`${isMobile && !result ? 'h-[48dvh] max-h-[48dvh] w-full rounded-t-2xl' : 'w-full sm:max-w-md'} gap-0 p-0 max-sm:[&_button]:min-h-11 max-sm:[&_button]:min-w-11 max-sm:[&_input]:min-h-11`}
        aria-describedby="writing-tools-description"
      >
        <SheetHeader className="shrink-0 border-b pr-12">
          <div className="flex items-center gap-2">
            {(selectedTool || result) && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to tools"
                onClick={() => {
                  setSelectedTool(null)
                  setResult(null)
                  setRunContext(null)
                  setError(null)
                }}
              >
                <ArrowLeft />
              </Button>
            )}
            <div className="min-w-0">
              <SheetTitle>{selectedTool?.name ?? 'Writing tools'}</SheetTitle>
              <SheetDescription id="writing-tools-description">
                {selectedTool ? selectedTool.summary : `${categoryDefinition.name} · choose support for this moment`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          {!selectedTool && (
            <div className="flex flex-col gap-4">
              <Alert>
                <MousePointer2 />
                <AlertTitle>Tools follow your editor</AlertTitle>
                <AlertDescription>
                  {context.selection
                    ? `${context.selection.text.length} characters selected. Selection tools are ready.`
                    : 'Keep Tools open, then select text or place the cursor in the editor. Tool availability updates immediately.'}
                </AlertDescription>
              </Alert>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by goal or tool"
                  className="pl-9"
                  aria-label="Search writing tools"
                />
              </div>
              <Tabs value={stage} onValueChange={(value) => setStage(value as 'all' | ToolStage)}>
                <TabsList className="grid w-full grid-cols-4">
                  {TOOL_STAGES.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}
                </TabsList>
              </Tabs>
              <div className="flex flex-col gap-3">
                {visibleTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    reason={getRecommendationReason(tool, category, context)}
                    disabledReason={getDisabledReason(tool, context)}
                    onUse={() => launchTool(tool)}
                    onDetails={() => showToolDetails(tool)}
                  />
                ))}
                {visibleTools.length === 0 && (
                  <Empty className="border">
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><Search /></EmptyMedia>
                      <EmptyTitle>No matching tools</EmptyTitle>
                      <EmptyDescription>Try another stage or a broader search.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            </div>
          )}

          {selectedTool && !result && (
            <div className="flex flex-col gap-5">
              <dl className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4">
                <DetailRow label="Helps with">{selectedTool.helpsWith}</DetailRow>
                <DetailRow label="Best time">{selectedTool.bestTime}</DetailRow>
                <DetailRow label="Needs">{selectedTool.needs}</DetailRow>
                <DetailRow label="Produces">{selectedTool.produces}</DetailRow>
                <DetailRow label="Draft impact">{selectedTool.draftImpact}</DetailRow>
              </dl>
              <Alert>
                <ListChecks />
                <AlertTitle>How to use this tool</AlertTitle>
                <AlertDescription>
                  <ol className="flex list-decimal flex-col gap-2 pl-5">
                    {selectedTool.howToUse.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </AlertDescription>
              </Alert>
              {selectedTool.parameters && (
                <FieldGroup>
                  {selectedTool.parameters.map((parameter) => (
                    <Field key={parameter.id}>
                      <FieldLabel htmlFor={`tool-parameter-${parameter.id}`}>
                        {parameter.label}{parameter.required ? ' *' : ''}
                      </FieldLabel>
                      {parameter.multiline ? (
                        <Textarea
                          id={`tool-parameter-${parameter.id}`}
                          value={parameters[parameter.id] ?? ''}
                          onChange={(event) => setParameters((current) => ({ ...current, [parameter.id]: event.target.value }))}
                          placeholder={parameter.placeholder}
                        />
                      ) : (
                        <Input
                          id={`tool-parameter-${parameter.id}`}
                          value={parameters[parameter.id] ?? ''}
                          onChange={(event) => setParameters((current) => ({ ...current, [parameter.id]: event.target.value }))}
                          placeholder={parameter.placeholder}
                        />
                      )}
                      <FieldDescription>{parameter.description}</FieldDescription>
                    </Field>
                  ))}
                </FieldGroup>
              )}
              {selectedToolDisabledReason && (
                <Alert>
                  <MousePointer2 />
                  <AlertTitle>Choose context in the editor</AlertTitle>
                  <AlertDescription>{selectedToolDisabledReason} This button updates automatically.</AlertDescription>
                </Alert>
              )}
              {error && <Alert variant="destructive"><AlertTitle>Cannot run this tool</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
              <Button onClick={() => void run()} disabled={running || selectedToolDisabledReason !== null} className="sticky bottom-0 min-h-11">
                {running ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
                {running ? 'Working…' : 'Use tool'}
              </Button>
            </div>
          )}

          {selectedTool && result && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Prototype result</p>
                  <p className="text-xs text-muted-foreground">Review and edit before changing your draft.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void run()} disabled={running}>
                  {running ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                  {running ? 'Creating preview…' : 'Run again'}
                </Button>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Cannot run this tool</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {result.kind === 'transform' && <TransformToolResult result={result} onReplace={(text) => void apply('replace', text)} />}
              {result.kind === 'review' && <ReviewToolResult result={result} />}
              {result.kind === 'options' && (
                <OptionsToolResult
                  key={`options-${resultVersion}`}
                  result={result}
                  onScratchpad={(option) => {
                    setResult({ kind: 'scratchpad', text: `${option.title}\n\n${option.body}\n\nWhy it may work: ${option.rationale}`, preferredApply: 'append' })
                    setResultVersion((version) => version + 1)
                  }}
                />
              )}
              {result.kind === 'scratchpad' && (
                <ScratchpadToolResult
                  key={`scratchpad-${resultVersion}`}
                  result={result}
                  onApply={(operation, text) => void apply(operation, text)}
                />
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
