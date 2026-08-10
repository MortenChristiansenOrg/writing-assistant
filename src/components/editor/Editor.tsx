import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Markdown } from '@tiptap/markdown'
import { useEffect, useRef, useState } from 'react'
import { TipTapAdapter } from '@/lib/editor'
import type { EditorAdapter, DocumentContent, Selection } from '@/lib/editor'
import { AIBubbleMenu, type AIAction } from './AIBubbleMenu'

interface EditorProps {
  content?: DocumentContent
  contentKey: string
  onChange?: (content: DocumentContent) => void
  onSelectionChange?: (selection: Selection | null) => void
  onAdapterReady?: (adapter: EditorAdapter) => void
  onAIAction?: (action: AIAction, selectedText: string) => void
  onWritingTool?: (toolId: string) => void
  placeholder?: string
  editable?: boolean
  extraExtensions?: import('@tiptap/core').Extension[]
  className?: string
}

export function Editor({
  content,
  contentKey,
  onChange,
  onSelectionChange,
  onAdapterReady,
  onAIAction,
  onWritingTool,
  placeholder = 'Start writing...',
  editable = true,
  extraExtensions = [],
  className,
}: EditorProps) {
  const initializedRef = useRef(false)
  const contentKeyRef = useRef(contentKey)
  const [wordCount, setWordCount] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Markdown,
      ...extraExtensions,
    ],
    content: content?.type === 'json' ? content.data : content?.data ?? '',
    editable,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none min-h-[500px] focus:outline-none p-4',
      },
    },
  })

  useEffect(() => {
    if (!editor) return

    const updateWordCount = () => {
      setWordCount(editor.storage.characterCount?.words() ?? 0)
    }

    updateWordCount()
    editor.on('update', updateWordCount)

    return () => {
      editor.off('update', updateWordCount)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const adapter = new TipTapAdapter(editor)
    onAdapterReady?.(adapter)

    const unsubscribeContent = onChange
      ? adapter.onContentChange(onChange)
      : undefined
    const unsubscribeSelection = onSelectionChange
      ? adapter.onSelectionChange(onSelectionChange)
      : undefined

    return () => {
      unsubscribeContent?.()
      unsubscribeSelection?.()
      adapter.destroy()
    }
  }, [editor, onChange, onSelectionChange, onAdapterReady])

  // Sync only when the logical document changes. Server echoes from autosave must
  // not replace newer local edits for the same document.
  useEffect(() => {
    if (!editor || !content) return

    const contentChanged = contentKeyRef.current !== contentKey
    if (initializedRef.current && !contentChanged) return

    if (content.type === 'json') {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(content.data)) {
        editor.commands.setContent(content.data, { emitUpdate: false })
      }
    } else {
      if (editor.getHTML() !== content.data) {
        editor.commands.setContent(content.data, { emitUpdate: false })
      }
    }

    contentKeyRef.current = contentKey
    initializedRef.current = true
  }, [content, contentKey, editor])

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className={`flex h-full flex-col${className ? ` ${className}` : ''}`}>
      <BubbleMenu
        editor={editor}
        className="flex gap-1 rounded-lg border bg-popover p-1 shadow-md"
      >
        {(onAIAction || onWritingTool) && (
          <AIBubbleMenu
            editor={editor}
            {...(onAIAction ? { onAction: onAIAction } : {})}
            {...(onWritingTool ? { onWritingTool } : {})}
          />
        )}
      </BubbleMenu>
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
      <div className="border-t px-4 py-1 text-right text-xs text-muted-foreground">
        {wordCount} words
      </div>
    </div>
  )
}
