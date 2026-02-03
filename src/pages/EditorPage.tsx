import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Editor } from '@/components/editor/Editor'
import { AISplitView } from '@/components/editor/AISplitView'
import type { DocumentContent, EditorAdapter } from '@/lib/editor'
import { useRef, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AIAction } from '@/hooks/useAI'
import { useAISplitSession } from '@/hooks/useAISplitSession'
import { HistoryPanel } from '@/components/sidebar/HistoryPanel'

const AUTOSAVE_DELAY = 500

export function EditorPage() {
  const { docId } = useParams()
  const document = useQuery(
    api.documents.get,
    docId ? { id: docId as Id<'documents'> } : 'skip'
  )
  const updateDocument = useMutation(api.documents.update)
  const createRevision = useMutation(api.revisions.create)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentRef = useRef<DocumentContent | null>(null)
  const editorAdapterRef = useRef<EditorAdapter | null>(null)

  const [lastAction, setLastAction] = useState<AIAction>('rewrite')

  const session = useAISplitSession()

  const handleContentChange = (content: DocumentContent) => {
    if (!docId) return

    pendingContentRef.current = content

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (pendingContentRef.current) {
        updateDocument({
          id: docId as Id<'documents'>,
          content: pendingContentRef.current.data,
        })
          .then(() => {
            pendingContentRef.current = null
          })
          .catch((err) => {
            toast.error('Failed to save')
            console.error(err)
          })
      }
    }, AUTOSAVE_DELAY)
  }

  const handleAIAction = (action: AIAction, _selectedText: string) => {
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
      action,
      range.fullText
    )
  }

  const handleFinish = () => {
    const adapter = editorAdapterRef.current
    const range = session.selectionRange
    if (!adapter || !range || !docId) return

    const mergedText = session.finish()
    if (!mergedText) return

    // Create revision before replacing
    const currentContent = adapter.getContent()
    void createRevision({
      documentId: docId as Id<'documents'>,
      content: currentContent.data,
      changeType: 'ai_rewrite',
      description: `AI rewrite`,
    })

    // Build full markdown with merged selection replacing original range
    const fullMd = session.fullDocumentText
    const before = fullMd.slice(0, range.from)
    const after = fullMd.slice(range.to)
    adapter.setMarkdownContent(before + mergedText + after)
    toast.success('AI edits applied')
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

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

  const initialContent: DocumentContent = {
    type: 'json',
    data: document.content as Record<string, unknown>,
  }

  if (session.active) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2">
          <h1 className="text-lg font-medium">{document.title}</h1>
          <HistoryPanel documentId={docId as Id<'documents'>} />
        </header>
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
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-medium">{document.title}</h1>
        <HistoryPanel documentId={docId as Id<'documents'>} />
      </header>
      <div className="flex-1 overflow-auto">
        <Editor
          content={initialContent}
          onChange={handleContentChange}
          onAdapterReady={(adapter) => {
            editorAdapterRef.current = adapter
          }}
          onAIAction={handleAIAction}
        />
      </div>
    </div>
  )
}
