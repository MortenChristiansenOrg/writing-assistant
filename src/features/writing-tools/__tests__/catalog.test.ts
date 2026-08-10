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

  it('gives every tool practical application instructions', () => {
    for (const tool of WRITING_TOOLS) {
      expect(tool.howToUse.length).toBeGreaterThanOrEqual(3)
      expect(tool.howToUse.every((step) => step.trim().length > 0)).toBe(true)
    }
  })

  it('explains why tools cannot run instead of hiding them', () => {
    const transform = WRITING_TOOLS.find((tool) => tool.id === 'alternate-pov')!
    const continueTool = WRITING_TOOLS.find((tool) => tool.id === 'continue-scene')!

    expect(getDisabledReason(transform, emptyContext)).toContain('Keep Tools open')
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

  it('prevents passage rewrites that cannot fit in one complete AI response', () => {
    const transform = WRITING_TOOLS.find((tool) => tool.id === 'alternate-pov')!
    const oversizedPassage = 'a'.repeat(12_001)

    expect(getDisabledReason(transform, {
      documentText: oversizedPassage,
      selection: { text: oversizedPassage, from: 1, to: 12_002 },
      cursor: 12_002,
    })).toContain('shorter than 12,000 characters')
  })
})
