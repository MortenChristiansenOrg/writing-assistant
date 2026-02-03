import DiffMatchPatch from 'diff-match-patch'

export type DiffChunkStatus = 'pending' | 'accepted' | 'rejected'

export interface DiffChunk {
  id: string
  type: 'equal' | 'add' | 'remove'
  text: string
  status: DiffChunkStatus
}

const dmp = new DiffMatchPatch()

export function computeDiffChunks(
  original: string,
  suggestion: string
): DiffChunk[] {
  const diffs = dmp.diff_main(original, suggestion)
  dmp.diff_cleanupSemantic(diffs)

  return diffs.map((diff, i) => ({
    id: `chunk-${i}`,
    type: diff[0] === 0 ? 'equal' : diff[0] === 1 ? 'add' : 'remove',
    text: diff[1],
    status: diff[0] === 0 ? 'accepted' : 'pending',
  }))
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
