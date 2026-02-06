export type { DocumentContent, EditorAdapter, Selection } from './types'
export { TipTapAdapter } from './tiptap-adapter'
export {
  computeDiffChunks,
  applyAcceptedChunks,
  countAcceptedEdits,
  hasEditableChunks,
  type DiffChunk,
  type DiffChunkStatus,
} from './diff-engine'
export { DiffDecorationExtension } from './diff-decoration-extension'
