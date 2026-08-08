import { useCallback, useReducer } from 'react'
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

export interface TextRange {
  from: number
  to: number
}

interface SessionState {
  active: boolean
  baselineText: string
  chunks: DiffChunk[]
  selectionRange: TextRange | null
  documentRange: TextRange | null
  fullDocumentText: string
  savePoints: SavePoint[]
  customPrompt?: string
}

type SessionAction =
  | {
      type: 'enter'
      baselineText: string
      selectionRange: TextRange
      documentRange: TextRange
      fullDocumentText: string
      customPrompt?: string
    }
  | { type: 'complete'; result: string }
  | {
      type: 'set_chunk_status'
      id: string
      status: 'accepted' | 'rejected' | 'pending'
    }
  | { type: 'accept_all' }
  | { type: 'regenerate' }
  | { type: 'undo_regeneration' }
  | { type: 'close' }

const INITIAL_STATE: SessionState = {
  active: false,
  baselineText: '',
  chunks: [],
  selectionRange: null,
  documentRange: null,
  fullDocumentText: '',
  savePoints: [],
}

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'enter':
      return {
        active: true,
        baselineText: action.baselineText,
        chunks: [],
        selectionRange: action.selectionRange,
        documentRange: action.documentRange,
        fullDocumentText: action.fullDocumentText,
        savePoints: [],
        ...(action.customPrompt === undefined
          ? {}
          : { customPrompt: action.customPrompt }),
      }
    case 'complete':
      if (!state.active) return state
      return {
        ...state,
        chunks: computeDiffChunks(state.baselineText, action.result),
      }
    case 'set_chunk_status':
      return {
        ...state,
        chunks: state.chunks.map((chunk) =>
          chunk.id === action.id ? { ...chunk, status: action.status } : chunk
        ),
      }
    case 'accept_all':
      return {
        ...state,
        chunks: state.chunks.map((chunk) =>
          chunk.type !== 'equal' && chunk.status === 'pending'
            ? { ...chunk, status: 'accepted' }
            : chunk
        ),
      }
    case 'regenerate': {
      const merged = applyAcceptedChunks(state.chunks)
      return {
        ...state,
        baselineText: merged,
        chunks: [],
        savePoints: [
          ...state.savePoints,
          { baselineText: state.baselineText, chunks: state.chunks },
        ],
      }
    }
    case 'undo_regeneration': {
      const previous = state.savePoints.at(-1)
      if (!previous) return state
      return {
        ...state,
        baselineText: previous.baselineText,
        chunks: previous.chunks,
        savePoints: state.savePoints.slice(0, -1),
      }
    }
    case 'close':
      return INITIAL_STATE
  }
}

export interface AISplitSession {
  active: boolean
  isLoading: boolean
  baselineText: string
  chunks: DiffChunk[]
  selectionRange: TextRange | null
  documentRange: TextRange | null
  fullDocumentText: string
  savePoints: SavePoint[]
  acceptedCount: number
  pendingCount: number
  hasApiKey: boolean
  enterSplitMode: (
    selectedText: string,
    range: TextRange,
    documentRange: TextRange,
    action: AIAction,
    fullText: string,
    customPrompt?: string
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
  const [state, dispatch] = useReducer(sessionReducer, INITIAL_STATE)

  const { isLoading, runAction, clear, hasApiKey } = useAI({
    onComplete: (result) => {
      dispatch({ type: 'complete', result })
    },
  })

  const enterSplitMode = useCallback(
    (
      selectedText: string,
      range: TextRange,
      documentRange: TextRange,
      action: AIAction,
      fullText: string,
      customPrompt?: string
    ) => {
      dispatch({
        type: 'enter',
        baselineText: selectedText,
        selectionRange: range,
        documentRange,
        fullDocumentText: fullText,
        ...(customPrompt === undefined ? {} : { customPrompt }),
      })
      clear()
      void runAction(action, selectedText, undefined, customPrompt)
    },
    [clear, runAction]
  )

  const acceptChunk = useCallback((id: string) => {
    dispatch({ type: 'set_chunk_status', id, status: 'accepted' })
  }, [])

  const rejectChunk = useCallback((id: string) => {
    dispatch({ type: 'set_chunk_status', id, status: 'rejected' })
  }, [])

  const revertChunk = useCallback((id: string) => {
    dispatch({ type: 'set_chunk_status', id, status: 'pending' })
  }, [])

  const acceptAll = useCallback(() => {
    dispatch({ type: 'accept_all' })
  }, [])

  const regenerate = useCallback(
    (action: AIAction) => {
      const merged = applyAcceptedChunks(state.chunks)
      dispatch({ type: 'regenerate' })
      clear()
      void runAction(action, merged, undefined, state.customPrompt)
    },
    [clear, runAction, state.chunks, state.customPrompt]
  )

  const undoRegeneration = useCallback(() => {
    if (state.savePoints.length === 0) return
    dispatch({ type: 'undo_regeneration' })
    clear()
  }, [clear, state.savePoints.length])

  const finish = useCallback((): string | null => {
    if (!state.selectionRange || !state.documentRange) return null
    const mergedSelection = applyAcceptedChunks(state.chunks)
    dispatch({ type: 'close' })
    clear()
    return mergedSelection
  }, [clear, state.chunks, state.documentRange, state.selectionRange])

  const cancelAll = useCallback(() => {
    dispatch({ type: 'close' })
    clear()
  }, [clear])

  return {
    active: state.active,
    isLoading,
    baselineText: state.baselineText,
    chunks: state.chunks,
    selectionRange: state.selectionRange,
    documentRange: state.documentRange,
    fullDocumentText: state.fullDocumentText,
    savePoints: state.savePoints,
    acceptedCount: countAcceptedEdits(state.chunks),
    pendingCount: state.chunks.filter(
      (chunk) => chunk.type !== 'equal' && chunk.status === 'pending'
    ).length,
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
