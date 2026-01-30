import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Editor } from '@/components/editor/Editor'
import type { DocumentContent, EditorAdapter } from '@/lib/editor'
import { useRef, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAI, type AIAction } from '@/hooks/useAI'
import { AIPreviewDialog } from '@/components/editor/AIPreviewDialog'
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

  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [originalText, setOriginalText] = useState('')

  const { completion, isLoading, runAction, clear, hasApiKey } = useAI({
    onComplete: () => {
      // AI completed
    },
    onError: () => {
      // keep dialog open so user can retry or dismiss
    },
  })

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

  const handleAIAction = (action: AIAction, selectedText: string) => {
    if (!hasApiKey) {
      toast.error('Please add your OpenRouter API key in settings')
      return
    }
    setOriginalText(selectedText)
    setAiDialogOpen(true)
    clear()
    void runAction(action, selectedText)
  }

  const handleAcceptAI = () => {
    if (!completion || !editorAdapterRef.current || !docId) return

    const adapter = editorAdapterRef.current

    // Create revision before replacing
    const currentContent = adapter.getContent()
    void createRevision({
      documentId: docId as Id<'documents'>,
      content: currentContent.data,
      changeType: 'ai_rewrite',
      description: `AI rewrite of "${originalText.slice(0, 50)}..."`,
    })

    // Replace selected text with AI result
    adapter.replaceSelection(completion)
    toast.success('AI suggestion applied')
  }

  const handleRejectAI = () => {
    clear()
    toast.info('AI suggestion rejected')
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
      <AIPreviewDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        originalText={originalText}
        previewText={completion}
        isLoading={isLoading}
        onAccept={handleAcceptAI}
        onReject={handleRejectAI}
      />
    </div>
  )
}
