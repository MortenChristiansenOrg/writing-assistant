import { describe, expect, it } from 'vitest'
import {
  getAvailableTools,
  getDisabledReason,
  getRecommendationReason,
  WRITING_TOOLS,
} from '../catalog'
import type { ToolContextSnapshot } from '../types'

const emptyContext: ToolContextSnapshot = {
  documentText: '',
  selection: null,
  cursor: 1,
}

describe('writing tool catalog', () => {
  it('offers every result interaction pattern in each project category', () => {
    for (const category of ['general', 'fiction', 'screenplay', 'poetry'] as const) {
      const resultKinds = new Set(getAvailableTools(category).map((tool) => tool.resultKind))
      expect(resultKinds).toEqual(new Set(['transform', 'review', 'options', 'scratchpad']))
    }
  })

  it('explains why tools cannot run instead of hiding them', () => {
    const transform = WRITING_TOOLS.find((tool) => tool.id === 'alternate-pov')!
    const continueTool = WRITING_TOOLS.find((tool) => tool.id === 'continue-scene')!

    expect(getDisabledReason(transform, emptyContext)).toContain('Select a passage')
    expect(getDisabledReason(continueTool, emptyContext)).toContain('cursor')
  })

  it('makes recommendation rationale explicit', () => {
    const transform = WRITING_TOOLS.find((tool) => tool.id === 'alternate-pov')!
    const context = {
      documentText: 'Some draft text',
      selection: { text: 'draft', from: 6, to: 11 },
      cursor: 11,
    }

    expect(getRecommendationReason(transform, 'fiction', context)).toBe(
      'Recommended because text is selected.',
    )
  })

  it('requires a caret rather than an active selection for cursor tools', () => {
    const continueTool = WRITING_TOOLS.find((tool) => tool.id === 'continue-scene')!
    const context = {
      documentText: 'Some draft text',
      selection: { text: 'draft', from: 6, to: 11 },
      cursor: 6,
    }

    expect(getDisabledReason(continueTool, context)).toContain('without selecting text')
  })
})
