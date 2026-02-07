import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useRef, useState } from 'react'
import { TipTapAdapter } from '@/lib/editor'
import type { EditorAdapter, DocumentContent } from '@/lib/editor'
import { AIBubbleMenu, type AIAction } from './AIBubbleMenu'

interface EditorProps {
  content?: DocumentContent
  onChange?: (content: DocumentContent) => void
  onAdapterReady?: (adapter: EditorAdapter) => void
  onAIAction?: (action: AIAction, selectedText: string) => void
  placeholder?: string
  editable?: boolean
  extraExtensions?: import('@tiptap/core').Extension[]
  className?: string
}

export function Editor({
  content,
  onChange,
  onAdapterReady,
  onAIAction,
  placeholder = 'Start writing...',
  editable = true,
  extraExtensions = [],
  className,
}: EditorProps) {
  const adapterRef = useRef<TipTapAdapter | null>(null)
  const initializedRef = useRef(false)
  const [wordCount, setWordCount] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Markdown.configure({ html: true, transformPastedText: true }),
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
    adapterRef.current = adapter

    onAdapterReady?.(adapter)

    if (onChange) {
      const unsubscribe = adapter.onContentChange(onChange)
      return () => {
        unsubscribe()
        adapter.destroy()
      }
    }

    return () => adapter.destroy()
  }, [editor, onChange, onAdapterReady])

  // Only sync content prop on initial load, not during editing
  useEffect(() => {
    if (!editor || !content || initializedRef.current) return

    const currentContent = editor.getJSON()
    const newContent = content.type === 'json' ? content.data : null

    if (
      newContent &&
      JSON.stringify(currentContent) !== JSON.stringify(newContent)
    ) {
      editor.commands.setContent(newContent)
    }
    initializedRef.current = true
  }, [editor, content])

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
        {onAIAction && <AIBubbleMenu editor={editor} onAction={onAIAction} />}
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
