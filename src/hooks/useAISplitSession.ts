import { useState, useCallback, useRef } from 'react'
import { useAI, type AIAction } from './useAI'
import {
  computeDiffChunks,
  applyAcceptedChunks,
  countAcceptedEdits,
  type DiffChunk,
} from '@/lib/editor/diff-engine'

export interface SavePoint {
  baselineText: string
  chunks: DiffChunk[]
}

export interface AISplitSession {
  active: boolean
  isLoading: boolean
  baselineText: string
  chunks: DiffChunk[]
  selectionRange: { from: number; to: number } | null
  fullDocumentText: string
  savePoints: SavePoint[]
  acceptedCount: number
  pendingCount: number
  hasApiKey: boolean
  enterSplitMode: (
    selectedText: string,
    range: { from: number; to: number },
    action: AIAction,
    fullText: string
  ) => void
  acceptChunk: (id: string) => void
  rejectChunk: (id: string) => void
  revertChunk: (id: string) => void
  acceptAll: () => void
  regenerate: (action: AIAction) => void
  undoRegeneration: () => void
  finish: () => string | null
  cancelAll: () => void
}

export function useAISplitSession(): AISplitSession {
  const [active, setActive] = useState(false)
  const [baselineText, setBaselineText] = useState('')
  const [chunks, setChunks] = useState<DiffChunk[]>([])
  const [savePoints, setSavePoints] = useState<SavePoint[]>([])
  const [selectionRange, setSelectionRange] = useState<{
    from: number
    to: number
  } | null>(null)
  const [fullDocumentText, setFullDocumentText] = useState('')

  const actionRef = useRef<AIAction>('rewrite')

  const { isLoading, runAction, clear, hasApiKey } = useAI({
    onComplete: (result) => {
      const newChunks = computeDiffChunks(baselineTextRef.current, result)
      setChunks(newChunks)
    },
  })

  // Keep a ref in sync for the callback
  const baselineTextRef = useRef(baselineText)
  baselineTextRef.current = baselineText

  const enterSplitMode = useCallback(
    (
      selectedText: string,
      range: { from: number; to: number },
      action: AIAction,
      fullText: string
    ) => {
      setActive(true)
      setBaselineText(selectedText)
      baselineTextRef.current = selectedText
      setSelectionRange(range)
      setFullDocumentText(fullText)
      setChunks([])
      setSavePoints([])
      actionRef.current = action
      clear()
      void runAction(action, selectedText)
    },
    [clear, runAction]
  )

  const acceptChunk = useCallback((id: string) => {
    setChunks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'accepted' as const } : c))
    )
  }, [])

  const rejectChunk = useCallback((id: string) => {
    setChunks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'rejected' as const } : c))
    )
  }, [])

  const revertChunk = useCallback((id: string) => {
    setChunks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'pending' as const } : c))
    )
  }, [])

  const acceptAll = useCallback(() => {
    setChunks((prev) =>
      prev.map((c) =>
        c.type !== 'equal' && c.status === 'pending'
          ? { ...c, status: 'accepted' as const }
          : c
      )
    )
  }, [])

  const regenerate = useCallback(
    (action: AIAction) => {
      // Push save point
      setSavePoints((prev) => [
        ...prev,
        { baselineText: baselineTextRef.current, chunks },
      ])

      // Merge accepted into new baseline
      const merged = applyAcceptedChunks(chunks)
      setBaselineText(merged)
      baselineTextRef.current = merged
      setChunks([])
      actionRef.current = action
      clear()
      void runAction(action, merged)
    },
    [chunks, clear, runAction]
  )

  const undoRegeneration = useCallback(() => {
    if (savePoints.length === 0) return
    const prev = savePoints[savePoints.length - 1]!
    setSavePoints((sp) => sp.slice(0, -1))
    setBaselineText(prev.baselineText)
    baselineTextRef.current = prev.baselineText
    setChunks(prev.chunks)
    clear()
  }, [savePoints, clear])

  const finish = useCallback((): string | null => {
    if (!selectionRange) return null
    const mergedSelection = applyAcceptedChunks(chunks)
    // Build full document with the merged selection replacing the original range
    setActive(false)
    setChunks([])
    setSavePoints([])
    setSelectionRange(null)
    clear()
    return mergedSelection
  }, [chunks, selectionRange, fullDocumentText, clear])

  const cancelAll = useCallback(() => {
    setActive(false)
    setChunks([])
    setSavePoints([])
    setSelectionRange(null)
    setBaselineText('')
    clear()
  }, [clear])

  return {
    active,
    isLoading,
    baselineText,
    chunks,
    selectionRange,
    fullDocumentText,
    savePoints,
    acceptedCount: countAcceptedEdits(chunks),
    pendingCount: chunks.filter((c) => c.type !== 'equal' && c.status === 'pending').length,
    hasApiKey,
    enterSplitMode,
    acceptChunk,
    rejectChunk,
    revertChunk,
    acceptAll,
    regenerate,
    undoRegeneration,
    finish,
    cancelAll,
  }
}
