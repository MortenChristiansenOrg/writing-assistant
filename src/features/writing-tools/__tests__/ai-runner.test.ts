import { describe, expect, it } from 'vitest'
import { WRITING_TOOLS } from '../catalog'
import {
  buildAIWritingToolRequest,
  parseAIWritingToolResult,
} from '../ai-runner'
import type { ToolContextSnapshot } from '../types'

const context: ToolContextSnapshot = {
  documentText: 'Mara asks for the key. Ivo looks toward the locked door.',
  selection: { text: 'Ivo looks toward the locked door.', from: 22, to: 57 },
  cursor: 58,
  cursorContext: {
    before: 'Mara asks for the key.',
    after: 'Ivo looks toward the locked door.',
  },
}

function tool(id: string) {
  return WRITING_TOOLS.find((candidate) => candidate.id === id)!
}

describe('AI writing tool request and response contracts', () => {
  it('grounds continuation at the captured cursor', () => {
    const request = buildAIWritingToolRequest(
      tool('continue-scene'),
      'fiction',
      { ...context, selection: null },
      {},
    )

    expect(request.text).toContain('<before-cursor>\nMara asks for the key.')
    expect(request.text).toContain('<after-cursor>\nIvo looks toward the locked door.')
    expect(request.customPrompt).toContain('match the established voice')
  })

  it('keeps writer parameters in quoted input rather than instructions', () => {
    const request = buildAIWritingToolRequest(tool('scene-blueprint'), 'fiction', context, {
      goal: 'Get the key',
      obstacle: 'Ivo refuses',
      turn: 'The door opens itself',
    })

    expect(request.text).toContain('<scene-goal>\nGet the key\n</scene-goal>')
    expect(request.customPrompt).not.toContain('Get the key')
  })

  it('keeps large manuscript requests within the existing AI endpoint limit', () => {
    const request = buildAIWritingToolRequest(
      tool('what-if'),
      'fiction',
      {
        documentText: 'draft '.repeat(20_000),
        selection: null,
        cursor: 1,
      },
      { question: 'question '.repeat(2_000) },
    )

    expect(request.text.length).toBeLessThan(100_000)
    expect(request.text).toContain('[Later text omitted]')
  })

  it('parses specific structured dialogue notes', () => {
    const result = parseAIWritingToolResult(
      tool('dialogue-audit'),
      context,
      '```json\n{"summary":"The refusal shifts the power.","items":[{"title":"The key is leverage","body":"Ivo answers with an action rather than a denial.","severity":"opportunity"}]}\n```',
    )

    expect(result).toEqual({
      kind: 'review',
      summary: 'The refusal shifts the power.',
      items: [{
        id: 'review-0',
        title: 'The key is leverage',
        body: 'Ivo answers with an action rather than a denial.',
        severity: 'opportunity',
      }],
    })
  })

  it('parses manuscript-specific output for every remaining result contract', () => {
    expect(parseAIWritingToolResult(
      tool('alternate-pov'),
      context,
      'The locked door watched Ivo hesitate.',
    )).toEqual({
      kind: 'transform',
      original: 'Ivo looks toward the locked door.',
      suggestion: 'The locked door watched Ivo hesitate.',
    })

    expect(parseAIWritingToolResult(
      tool('what-if'),
      context,
      '{"items":[{"title":"One","body":"Mara lies.","rationale":"Raises the cost."},{"title":"Two","body":"Ivo leaves.","rationale":"Shifts control."},{"title":"Three","body":"The lock turns.","rationale":"Adds an unseen actor."}]}',
    )).toEqual(expect.objectContaining({
      kind: 'options',
      items: expect.arrayContaining([
        expect.objectContaining({ title: 'One', body: 'Mara lies.' }),
      ]),
    }))

    expect(parseAIWritingToolResult(
      tool('scene-blueprint'),
      context,
      'Blueprint\n- Mara presses Ivo.\n- The lock turns.',
    )).toEqual({
      kind: 'scratchpad',
      text: 'Blueprint\n- Mara presses Ivo.\n- The lock turns.',
      preferredApply: 'append',
    })

    expect(parseAIWritingToolResult(
      tool('continue-scene'),
      context,
      'The lock turned before Ivo answered.',
    )).toEqual({
      kind: 'scratchpad',
      text: 'The lock turned before Ivo answered.',
      preferredApply: 'insert',
    })
  })

  it('rejects malformed structured output instead of showing generic filler', () => {
    expect(() => parseAIWritingToolResult(
      tool('what-if'),
      context,
      'Here are some possibilities.',
    )).toThrow('unexpected format')
  })
})
