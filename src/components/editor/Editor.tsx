import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect, useRef } from 'react'
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
}

export function Editor({
  content,
  onChange,
  onAdapterReady,
  onAIAction,
  placeholder = 'Start writing...',
  editable = true,
}: EditorProps) {
  const adapterRef = useRef<TipTapAdapter | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
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

  useEffect(() => {
    if (!editor || !content) return

    const currentContent = editor.getJSON()
    const newContent = content.type === 'json' ? content.data : null

    if (
      newContent &&
      JSON.stringify(currentContent) !== JSON.stringify(newContent)
    ) {
      editor.commands.setContent(newContent)
    }
  }, [editor, content])

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <BubbleMenu
        editor={editor}
        className="flex gap-1 rounded-lg border bg-popover p-1 shadow-md"
      >
        {onAIAction && <AIBubbleMenu editor={editor} onAction={onAIAction} />}
      </BubbleMenu>
      <EditorContent editor={editor} className="h-full" />
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
        {editor.storage.characterCount?.words() ?? 0} words
      </div>
    </div>
  )
}
