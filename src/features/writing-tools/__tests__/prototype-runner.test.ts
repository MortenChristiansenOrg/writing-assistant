import { describe, expect, it } from 'vitest'
import { WRITING_TOOLS } from '../catalog'
import { runPrototypeTool } from '../prototype-runner'
import type { ToolContextSnapshot } from '../types'

const context: ToolContextSnapshot = {
  documentText: 'Mara asks for the key. Ivo looks toward the locked door.',
  selection: { text: 'Ivo looks toward the locked door.', from: 22, to: 57 },
  cursor: 58,
}

function tool(id: string) {
  return WRITING_TOOLS.find((candidate) => candidate.id === id)!
}

describe('prototype tool runner', () => {
  it('returns a non-destructive transform contract', async () => {
    const result = await runPrototypeTool(tool('alternate-pov'), context, {})
    expect(result.kind).toBe('transform')
    if (result.kind === 'transform') {
      expect(result.original).toBe(context.selection?.text)
      expect(result.suggestion).not.toBe(result.original)
    }
  })

  it('returns structured review notes', async () => {
    const result = await runPrototypeTool(tool('dialogue-audit'), context, {})
    expect(result.kind).toBe('review')
    if (result.kind === 'review') expect(result.items).toHaveLength(3)
  })

  it('returns remixable option cards', async () => {
    const result = await runPrototypeTool(tool('what-if'), context, { question: 'What if Mara lies?' })
    expect(result.kind).toBe('options')
    if (result.kind === 'options') {
      expect(result.items).toHaveLength(3)
      expect(result.items[0]?.body).toContain('Mara lies')
    }
  })

  it('turns guided parameters into an editable append scratchpad', async () => {
    const result = await runPrototypeTool(tool('scene-blueprint'), context, {
      goal: 'Get the key',
      obstacle: 'Ivo refuses',
      turn: 'The door opens itself',
    })
    expect(result.kind).toBe('scratchpad')
    if (result.kind === 'scratchpad') {
      expect(result.preferredApply).toBe('append')
      expect(result.text).toContain('Get the key')
    }
  })

  it('returns cursor insertion content as a scratchpad', async () => {
    const result = await runPrototypeTool(tool('continue-scene'), context, {})
    expect(result.kind).toBe('scratchpad')
    if (result.kind === 'scratchpad') expect(result.preferredApply).toBe('insert')
  })
})
