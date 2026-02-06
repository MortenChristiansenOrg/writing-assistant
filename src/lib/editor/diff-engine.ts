import DiffMatchPatch from 'diff-match-patch'

export type DiffChunkStatus = 'pending' | 'accepted' | 'rejected'

export interface DiffChunk {
  id: string
  type: 'equal' | 'add' | 'remove'
  text: string
  status: DiffChunkStatus
}

const dmp = new DiffMatchPatch()

/**
 * Split a chunk's text by paragraph boundaries (double newlines).
 * Each paragraph becomes its own chunk to allow individual accept/reject.
 * The paragraph break (\n\n) is attached to the FOLLOWING text so that
 * accepting a paragraph also accepts the spacing that precedes it.
 */
function splitByParagraphs(text: string): string[] {
  if (!text.includes('\n\n')) return [text]

  const parts: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    const idx = remaining.indexOf('\n\n')
    if (idx === -1) {
      parts.push(remaining)
      break
    }
    // Text before the paragraph break (if any)
    if (idx > 0) {
      parts.push(remaining.slice(0, idx))
    }
    // Include the paragraph break with the following text
    remaining = remaining.slice(idx)
    const nextIdx = remaining.indexOf('\n\n', 2)
    if (nextIdx === -1) {
      parts.push(remaining)
      break
    }
    parts.push(remaining.slice(0, nextIdx))
    remaining = remaining.slice(nextIdx)
  }

  return parts.filter((p) => p.length > 0)
}

export function computeDiffChunks(
  original: string,
  suggestion: string
): DiffChunk[] {
  const diffs = dmp.diff_main(original, suggestion)
  dmp.diff_cleanupSemantic(diffs)

  const chunks: DiffChunk[] = []
  let chunkIndex = 0

  for (const diff of diffs) {
    const type = diff[0] === 0 ? 'equal' : diff[0] === 1 ? 'add' : 'remove'
    const status = diff[0] === 0 ? 'accepted' : 'pending'

    // Split non-equal chunks by paragraph to allow granular accept/reject
    const parts = type !== 'equal' ? splitByParagraphs(diff[1]) : [diff[1]]

    for (const part of parts) {
      chunks.push({
        id: `chunk-${chunkIndex++}`,
        type,
        text: part,
        status,
      })
    }
  }

  return chunks
}

export function applyAcceptedChunks(chunks: DiffChunk[]): string {
  let result = ''
  for (const chunk of chunks) {
    if (chunk.type === 'equal') {
      result += chunk.text
    } else if (chunk.type === 'add' && chunk.status === 'accepted') {
      result += chunk.text
    } else if (chunk.type === 'remove' && chunk.status === 'accepted') {
      // accepted removal = text is removed, don't include it
    } else if (chunk.type === 'remove' && chunk.status !== 'accepted') {
      // rejected or pending removal = keep original text
      result += chunk.text
    }
    // pending or rejected add = don't include
  }
  return result
}

export function countAcceptedEdits(chunks: DiffChunk[]): number {
  return chunks.filter(
    (c) => c.type !== 'equal' && c.status === 'accepted'
  ).length
}

export function hasEditableChunks(chunks: DiffChunk[]): boolean {
  return chunks.some((c) => c.type !== 'equal')
}
