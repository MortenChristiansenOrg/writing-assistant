import { describe, expect, it } from 'vitest'
import { MODELS } from '../models'

describe('model catalog', () => {
  it('uses the current OpenRouter standard rates for flagship models', () => {
    expect(MODELS.find((model) => model.id === 'openai/gpt-5.6-sol')).toMatchObject({
      input: 5,
      output: 30,
    })
    expect(
      MODELS.find((model) => model.id === 'anthropic/claude-sonnet-5'),
    ).toMatchObject({ input: 2, output: 10 })
  })
})
