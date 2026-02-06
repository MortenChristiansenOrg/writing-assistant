import { describe, it, expect } from 'vitest'
import {
  computeDiffChunks,
  applyAcceptedChunks,
  countAcceptedEdits,
  hasEditableChunks,
} from '../diff-engine'

describe('computeDiffChunks', () => {
  it('returns single equal chunk for identical text', () => {
    const chunks = computeDiffChunks('hello', 'hello')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual({
      id: 'chunk-0',
      type: 'equal',
      text: 'hello',
      status: 'accepted',
    })
  })

  it('splits multi-paragraph additions into separate chunks', () => {
    const original = ''
    const suggestion = 'Para 1\n\nPara 2\n\nPara 3'

    const chunks = computeDiffChunks(original, suggestion)
    const addChunks = chunks.filter((c) => c.type === 'add')

    // Paragraph breaks attached to following text for proper spacing on accept
    expect(addChunks).toHaveLength(3)
    expect(addChunks[0]!.text).toBe('Para 1')
    expect(addChunks[1]!.text).toBe('\n\nPara 2')
    expect(addChunks[2]!.text).toBe('\n\nPara 3')
    expect(addChunks.every((c) => c.status === 'pending')).toBe(true)
  })

  it('splits multi-paragraph removals into separate chunks', () => {
    const original = 'Para 1\n\nPara 2\n\nPara 3'
    const suggestion = ''

    const chunks = computeDiffChunks(original, suggestion)
    const removeChunks = chunks.filter((c) => c.type === 'remove')

    // Paragraph breaks attached to following text
    expect(removeChunks).toHaveLength(3)
    expect(removeChunks[0]!.text).toBe('Para 1')
    expect(removeChunks[1]!.text).toBe('\n\nPara 2')
    expect(removeChunks[2]!.text).toBe('\n\nPara 3')
  })

  it('does not split equal chunks by paragraph', () => {
    const text = 'Para 1\n\nPara 2\n\nPara 3'
    const chunks = computeDiffChunks(text, text)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.type).toBe('equal')
    expect(chunks[0]!.text).toBe(text)
  })

  it('handles single paragraph change without splitting', () => {
    const original = 'hello world'
    const suggestion = 'hello there world'

    const chunks = computeDiffChunks(original, suggestion)
    const nonEqualChunks = chunks.filter((c) => c.type !== 'equal')

    // Should have changes but not multiple paragraphs
    expect(nonEqualChunks.length).toBeGreaterThan(0)
  })

  it('assigns unique IDs to each chunk', () => {
    const chunks = computeDiffChunks('', 'Para 1\n\nPara 2')
    const ids = chunks.map((c) => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('keeps paragraph break with added paragraph for proper spacing', () => {
    // When AI adds a paragraph at the end, the break should be with the new content
    const original = 'Existing text'
    const suggestion = 'Existing text\n\nNew paragraph'

    const chunks = computeDiffChunks(original, suggestion)
    const addChunk = chunks.find((c) => c.type === 'add')

    // The added chunk should include the paragraph break so accepting it adds proper spacing
    expect(addChunk?.text).toBe('\n\nNew paragraph')
  })
})

describe('applyAcceptedChunks', () => {
  it('includes accepted additions', () => {
    const chunks = [
      { id: '1', type: 'add' as const, text: 'hello', status: 'accepted' as const },
    ]
    expect(applyAcceptedChunks(chunks)).toBe('hello')
  })

  it('excludes rejected additions', () => {
    const chunks = [
      { id: '1', type: 'add' as const, text: 'hello', status: 'rejected' as const },
    ]
    expect(applyAcceptedChunks(chunks)).toBe('')
  })

  it('removes text for accepted removals', () => {
    const chunks = [
      { id: '1', type: 'remove' as const, text: 'hello', status: 'accepted' as const },
    ]
    expect(applyAcceptedChunks(chunks)).toBe('')
  })

  it('keeps text for rejected removals', () => {
    const chunks = [
      { id: '1', type: 'remove' as const, text: 'hello', status: 'rejected' as const },
    ]
    expect(applyAcceptedChunks(chunks)).toBe('hello')
  })

  it('always includes equal chunks', () => {
    const chunks = [
      { id: '1', type: 'equal' as const, text: 'hello', status: 'accepted' as const },
    ]
    expect(applyAcceptedChunks(chunks)).toBe('hello')
  })

  it('handles selective paragraph acceptance', () => {
    // Paragraph breaks attached to following text
    const chunks = [
      { id: '1', type: 'add' as const, text: 'Para 1', status: 'accepted' as const },
      { id: '2', type: 'add' as const, text: '\n\nPara 2', status: 'rejected' as const },
      { id: '3', type: 'add' as const, text: '\n\nPara 3', status: 'accepted' as const },
    ]
    expect(applyAcceptedChunks(chunks)).toBe('Para 1\n\nPara 3')
  })
})

describe('countAcceptedEdits', () => {
  it('counts only accepted non-equal chunks', () => {
    const chunks = [
      { id: '1', type: 'equal' as const, text: 'a', status: 'accepted' as const },
      { id: '2', type: 'add' as const, text: 'b', status: 'accepted' as const },
      { id: '3', type: 'remove' as const, text: 'c', status: 'pending' as const },
    ]
    expect(countAcceptedEdits(chunks)).toBe(1)
  })
})

describe('hasEditableChunks', () => {
  it('returns true when there are non-equal chunks', () => {
    const chunks = [
      { id: '1', type: 'equal' as const, text: 'a', status: 'accepted' as const },
      { id: '2', type: 'add' as const, text: 'b', status: 'pending' as const },
    ]
    expect(hasEditableChunks(chunks)).toBe(true)
  })

  it('returns false when all chunks are equal', () => {
    const chunks = [
      { id: '1', type: 'equal' as const, text: 'a', status: 'accepted' as const },
    ]
    expect(hasEditableChunks(chunks)).toBe(false)
  })
})
