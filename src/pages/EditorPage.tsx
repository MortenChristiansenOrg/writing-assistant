import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { Editor } from '@/components/editor/Editor'
import { AISplitView } from '@/components/editor/AISplitView'
import type { DocumentContent, EditorAdapter } from '@/lib/editor'
import { useRef, useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import type { AIAction } from '@/hooks/useAI'
import { useAISplitSession } from '@/hooks/useAISplitSession'
import { HistoryPanel } from '@/components/sidebar/HistoryPanel'
import { useReviewNotes } from '@/hooks/useReviewNotes'
import { useAIFeedback } from '@/hooks/useAIFeedback'
import { ReviewPanel } from '@/components/review/ReviewPanel'
import { FeedbackRequestPopover } from '@/components/review/FeedbackRequestPopover'
import { MessageSquareText, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSerializedAutosave } from '@/hooks/useSerializedAutosave'
import {
  WritingToolsSheet,
  type ToolApplyRequest,
} from '@/features/writing-tools/WritingToolsSheet'
import { readProjectCategory } from '@/features/writing-tools/project-category'
import type {
  ProjectCategoryId,
  ToolContextSnapshot,
} from '@/features/writing-tools/types'
import { applyToolText, validateToolApply } from '@/features/writing-tools/draft-apply'

const AUTOSAVE_DELAY = 500

export function EditorPage() {
  const { docId, projectId } = useParams()
  const document = useQuery(
    api.documents.get,
    docId ? { id: docId as Id<'documents'> } : 'skip'
  )
  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId as Id<'projects'> } : 'skip'
  )
  if (!docId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No document selected</p>
      </div>
    )
  }

  if (document === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (document === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    )
  }

  if (document._id !== docId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <LoadedEditorPage
      key={docId}
      docId={docId as Id<'documents'>}
      projectId={projectId as Id<'projects'> | undefined}
      document={document}
      project={project?._id === projectId ? project : undefined}
    />
  )
}

interface LoadedEditorPageProps {
  docId: Id<'documents'>
  projectId: Id<'projects'> | undefined
  document: Doc<'documents'>
  project: Doc<'projects'> | null | undefined
}

function LoadedEditorPage({
  docId,
  projectId,
  document,
  project,
}: LoadedEditorPageProps) {
  const personas = useQuery(
    api.personas.listForProject,
    projectId ? { projectId } : 'skip'
  )
  const updateDocument = useMutation(api.documents.update)
  const createRevision = useMutation(api.revisions.create)
  const editorAdapterRef = useRef<EditorAdapter | null>(null)

  const [lastAction, setLastAction] = useState<AIAction>('rewrite')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [descriptionValue, setDescriptionValue] = useState(
    () => document.description ?? ''
  )
  const [toolsOpen, setToolsOpen] = useState(false)
  const [toolContext, setToolContext] = useState<ToolContextSnapshot | null>(null)
  const [initialToolId, setInitialToolId] = useState<string | null>(null)
  const [projectCategory, setProjectCategory] = useState<ProjectCategoryId>(() =>
    readProjectCategory(projectId),
  )

  const session = useAISplitSession()
  const review = useReviewNotes(docId)
  const feedback = useAIFeedback(docId)

  useEffect(() => {
    const syncCategory = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId: string }>).detail
      if (detail.projectId === projectId) setProjectCategory(readProjectCategory(projectId))
    }
    window.addEventListener('project-category-changed', syncCategory)
    return () => window.removeEventListener('project-category-changed', syncCategory)
  }, [projectId])

  const saveDocument = useCallback(
    async (
      value:
        | { id: Id<'documents'>; content: Record<string, unknown> | string }
        | { id: Id<'documents'>; description: string },
    ): Promise<void> => {
      await updateDocument(value)
    },
    [updateDocument],
  )
  const handleContentSaveError = useCallback((error: unknown): void => {
    toast.error('Failed to save')
    console.error(error)
  }, [])
  const handleDescriptionSaveError = useCallback((error: unknown): void => {
    toast.error('Failed to save description')
    console.error(error)
  }, [])

  const contentAutosave = useSerializedAutosave<{
    id: Id<'documents'>
    content: Record<string, unknown> | string
  }>({
    delay: AUTOSAVE_DELAY,
    save: saveDocument,
    onError: handleContentSaveError,
  })

  const descriptionAutosave = useSerializedAutosave<{
    id: Id<'documents'>
    description: string
  }>({
    delay: AUTOSAVE_DELAY,
    save: saveDocument,
    onError: handleDescriptionSaveError,
  })

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescriptionValue(value)
      descriptionAutosave.schedule({ id: docId, description: value })
    },
    [descriptionAutosave, docId]
  )

  const handleContentChange = useCallback(
    (content: DocumentContent) => {
      contentAutosave.schedule({ id: docId, content: content.data })
    },
    [contentAutosave, docId]
  )

  const handleAdapterReady = useCallback((adapter: EditorAdapter) => {
    editorAdapterRef.current = adapter
  }, [])

  const handleOpenWritingTools = useCallback((toolId?: string) => {
    const adapter = editorAdapterRef.current
    if (!adapter) return
    setToolContext({
      documentText: adapter.getMarkdown(),
      selection: adapter.getSelection(),
      cursor: adapter.getCursorPosition(),
    })
    setInitialToolId(toolId ?? null)
    setToolsOpen(true)
  }, [])

  const handleToolApply = useCallback(async ({
    operation,
    text,
    snapshot,
  }: ToolApplyRequest): Promise<boolean> => {
    const adapter = editorAdapterRef.current
    if (!adapter) return false

    const request = { operation, text, snapshot }
    const validationError = validateToolApply(adapter, request)
    if (validationError) {
      toast.error(validationError)
      return false
    }

    try {
      await createRevision({
        documentId: docId,
        content: adapter.getContent().data,
        changeType: 'ai_rewrite',
        description: `Writing tool: ${operation}`,
      })
    } catch (error) {
      toast.error('Failed to save revision history')
      console.error(error)
      return false
    }

    applyToolText(adapter, request)
    toast.success(operation === 'replace' ? 'Selection replaced' : operation === 'insert' ? 'Text inserted' : 'Text appended')
    return true
  }, [createRevision, docId])

  const handleAIAction = (action: AIAction) => {
    if (!session.hasApiKey) {
      toast.error('Please add your OpenRouter API key in settings')
      return
    }
    const adapter = editorAdapterRef.current
    if (!adapter) return

    const range = adapter.getTextOffsetRange()
    if (!range) return

    setLastAction(action)
    session.enterSplitMode(
      range.text,
      { from: range.from, to: range.to },
      { from: range.editorFrom, to: range.editorTo },
      action,
      range.fullText
    )
  }

  const handleFinish = async (): Promise<void> => {
    const adapter = editorAdapterRef.current
    const range = session.documentRange
    if (!adapter || !range) return

    // Create revision before replacing
    const currentContent = adapter.getContent()
    try {
      await createRevision({
        documentId: docId,
        content: currentContent.data,
        changeType: 'ai_rewrite',
        description: 'AI rewrite',
      })
    } catch (error) {
      toast.error('Failed to save revision history')
      console.error(error)
      return
    }

    const mergedText = session.finish()
    if (mergedText === null) return
    adapter.replaceRange(range.from, range.to, mergedText)
    toast.success('AI edits applied')
  }

  const handleFeedbackRequest = (persona: {
    id?: Id<'personas'>
    name: string
    systemPrompt: string
    model?: string
  }, focusArea?: string) => {
    const adapter = editorAdapterRef.current
    if (!adapter) return
    const text = adapter.getMarkdown()
    if (!text.trim() && !focusArea?.trim()) {
      toast.error('Provide text or a focus area for feedback')
      return
    }
    setReviewOpen(true)
    const opts: { projectDescription?: string; documentDescription?: string; focusArea?: string } = {}
    if (project?.description) opts.projectDescription = project.description
    const docDesc = descriptionValue
    if (docDesc) opts.documentDescription = docDesc
    if (focusArea) opts.focusArea = focusArea
    void feedback.requestFeedback(text, persona, opts)
  }

  const handleApplySuggestion = (comment: string) => {
    if (!session.hasApiKey) {
      toast.error('Please add your OpenRouter API key in settings')
      return
    }
    const adapter = editorAdapterRef.current
    if (!adapter) return

    const fullText = adapter.getMarkdown()
    if (!fullText.trim()) return

    setReviewOpen(false)
    setLastAction('rewrite')
    session.enterSplitMode(
      fullText,
      { from: 0, to: fullText.length },
      adapter.getDocumentRange(),
      'rewrite',
      fullText,
      `Apply this editorial suggestion to the text:\n\n${comment}`
    )
  }

  const handleReReview = (noteId: Id<'reviewNotes'>) => {
    const adapter = editorAdapterRef.current
    if (!adapter) return
    const text = adapter.getMarkdown()
    if (!text.trim()) return

    const note = review.notes.find((n) => n._id === noteId)
    if (!note) return

    // If note has a persona but personas haven't loaded yet, wait
    if (note.personaId && !personas) {
      toast.error('Personas still loading, try again shortly')
      return
    }

    const persona = note.personaId ? personas?.find((p) => p._id === note.personaId) : undefined
    if (note.personaId && !persona) {
      toast.error('Persona no longer exists')
      return
    }
    void feedback.reReview(
      noteId,
      note.comment,
      text,
      persona?.systemPrompt ?? '',
      note.model
    )
  }

  const initialContent: DocumentContent = {
    type: 'json',
    data: document.content as Record<string, unknown>,
  }

  const activeNoteCount = review.notes.filter((n) => !n.dismissed).length

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <h1 className="min-w-0 flex-1 truncate text-base font-medium sm:text-lg">{document.title}</h1>
          <div className="flex items-center gap-1 max-sm:[&_button]:min-h-11 max-sm:[&_button]:min-w-11 sm:gap-2">
            <Button variant={toolsOpen ? 'secondary' : 'outline'} size="sm" onClick={() => handleOpenWritingTools()}>
              <Wrench data-icon="inline-start" />
              Tools
            </Button>
            <FeedbackRequestPopover
              {...(projectId ? { projectId } : {})}
              loading={feedback.loading}
              onRequest={handleFeedbackRequest}
            />
            <Button
              variant={reviewOpen ? 'secondary' : 'ghost'}
              size="sm"
              aria-label="Toggle review notes"
              onClick={() => setReviewOpen((open) => !open)}
            >
              <MessageSquareText data-icon="inline-start" />
              <span className="hidden sm:inline">Review</span>
              {activeNoteCount > 0 && (
                <span
                  className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white"
                  style={{ background: 'var(--review-accent)' }}
                >
                  {activeNoteCount}
                </span>
              )}
            </Button>
            <HistoryPanel documentId={docId} />
          </div>
        </div>
        <Input
          value={descriptionValue}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Document description (optional)"
          className="mt-1 h-7 border-none bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
        />
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {session.active && (
            <div className="flex-1 overflow-hidden">
              <AISplitView
                originalDocumentText={session.fullDocumentText}
                baselineText={session.baselineText}
                selectionRange={session.selectionRange!}
                chunks={session.chunks}
                isLoading={session.isLoading}
                acceptedCount={session.acceptedCount}
                pendingCount={session.pendingCount}
                canUndo={session.savePoints.length > 0}
                lastAction={lastAction}
                onAcceptChunk={session.acceptChunk}
                onRevertChunk={session.revertChunk}
                onAcceptAll={session.acceptAll}
                onRegenerate={session.regenerate}
                onUndo={session.undoRegeneration}
                onFinish={handleFinish}
                onCancel={session.cancelAll}
              />
            </div>
          )}

          <div
            className="flex-1 overflow-auto"
            style={{ display: session.active ? 'none' : undefined }}
          >
            <Editor
              key={docId}
              content={initialContent}
              contentKey={docId}
              onChange={handleContentChange}
              onAdapterReady={handleAdapterReady}
              onAIAction={handleAIAction}
              onWritingTool={(toolId) => handleOpenWritingTools(toolId)}
            />
          </div>
        </div>

        {reviewOpen && !session.active && (
          <ReviewPanel
            notes={review.notes}
            loading={feedback.loading}
            onDismiss={review.dismiss}
            onUndismiss={review.undismiss}
            onClearAll={review.clearAll}
            onClose={() => setReviewOpen(false)}
            onApplySuggestion={handleApplySuggestion}
            onReReview={handleReReview}
            reReviewingId={feedback.reReviewingId}
          />
        )}
      </div>
      {toolContext && (
        <WritingToolsSheet
          key={`${toolsOpen ? 'open' : 'closed'}-${projectCategory}-${toolContext.cursor}-${initialToolId ?? 'catalog'}`}
          open={toolsOpen}
          onOpenChange={setToolsOpen}
          category={projectCategory}
          context={toolContext}
          initialToolId={initialToolId}
          onApply={handleToolApply}
        />
      )}
    </div>
  )
}
