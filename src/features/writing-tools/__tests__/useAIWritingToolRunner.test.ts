import { act, renderHook } from '@testing-library/react'
import { useAuth } from '@clerk/react'
import { useQuery } from 'convex/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WRITING_TOOLS } from '../catalog'
import {
  useAIWritingToolRunner,
  writingToolOutputBudget,
} from '../useAIWritingToolRunner'
import type { ToolContextSnapshot } from '../types'

vi.mock('@clerk/react', () => ({ useAuth: vi.fn() }))
vi.mock('convex/react', () => ({ useQuery: vi.fn() }))
vi.mock('@/lib/convex-url', () => ({ convexSiteUrl: 'https://test.convex.site' }))

const context: ToolContextSnapshot = {
  documentText: 'Mara asks for the key.',
  selection: null,
  cursor: 23,
  cursorContext: { before: 'Mara asks for the key.', after: '' },
}

function tool(id: string) {
  return WRITING_TOOLS.find((candidate) => candidate.id === id)!
}

function successfulAIResponse(text: string): Response {
  return Response.json({ text })
}

describe('useAIWritingToolRunner', () => {
  const getToken = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    getToken.mockResolvedValue('clerk-token')
    ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ getToken })
    ;(useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      hasOpenRouterKey: true,
      defaultModel: 'anthropic/claude-sonnet-5',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs through the authenticated AI endpoint and returns generated prose', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      successfulAIResponse('Mara heard the lock turn from the other side.'),
    )
    const { result } = renderHook(() => useAIWritingToolRunner('fiction'))

    let output: Awaited<ReturnType<typeof result.current>> | undefined
    await act(async () => {
      output = await result.current(tool('continue-scene'), context, {})
    })

    expect(output).toEqual({
      kind: 'scratchpad',
      text: 'Mara heard the lock turn from the other side.',
      preferredApply: 'insert',
    })
    expect(request).toHaveBeenCalledWith(
      'https://test.convex.site/ai/tools/run',
      expect.objectContaining({ method: 'POST' }),
    )
    const init = request.mock.calls[0]?.[1]
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer clerk-token')
    const body = JSON.parse(String(init?.body)) as {
      text: string
      model: string
      instructions: string
      maxOutputTokens: number
    }
    expect(body).toEqual(expect.objectContaining({
      model: 'anthropic/claude-sonnet-5',
      instructions: expect.stringContaining('Continue the manuscript exactly at the cursor'),
      maxOutputTokens: 512,
    }))
    expect(body.text.startsWith('<before-cursor>')).toBe(true)
    expect(body.text.length).toBeLessThan(1_000)
  })

  it('uses bounded budgets appropriate for each tool output', () => {
    expect(writingToolOutputBudget('continue-scene')).toBe(512)
    expect(writingToolOutputBudget('alternate-pov')).toBe(1_536)
    expect(writingToolOutputBudget('dialogue-audit')).toBe(768)
    expect(writingToolOutputBudget('what-if')).toBe(768)
    expect(writingToolOutputBudget('scene-blueprint')).toBe(768)
  })

  it.each([
    {
      toolId: 'alternate-pov',
      toolContext: {
        ...context,
        selection: { text: 'Mara asks for the key.', from: 1, to: 23 },
      },
      parameters: {},
      response: 'I ask Ivo for the key.',
      expectedKind: 'transform',
    },
    {
      toolId: 'dialogue-audit',
      toolContext: context,
      parameters: {},
      response: '{"summary":"The exchange is tense.","items":[{"title":"Avoided answer","body":"Ivo redirects Mara with silence.","severity":"opportunity"}]}',
      expectedKind: 'review',
    },
    {
      toolId: 'what-if',
      toolContext: context,
      parameters: { question: 'What changes the balance?' },
      response: '{"items":[{"title":"The key is fake","body":"Mara tests it.","rationale":"It makes the refusal a trap."},{"title":"The door opens","body":"Someone exits.","rationale":"It interrupts the standoff."},{"title":"Ivo bargains","body":"He names a price.","rationale":"It clarifies his motive."}]}',
      expectedKind: 'options',
    },
    {
      toolId: 'scene-blueprint',
      toolContext: context,
      parameters: { goal: 'Get the key', obstacle: 'Ivo refuses', turn: 'The door opens' },
      response: 'Key scene\n- Mara asks.\n- Ivo refuses.\n- The door opens.',
      expectedKind: 'scratchpad',
    },
    {
      toolId: 'continue-scene',
      toolContext: context,
      parameters: {},
      response: 'The lock answered before Ivo could.',
      expectedKind: 'scratchpad',
    },
  ])('turns live endpoint output into a $expectedKind result for $toolId', async ({
    toolId,
    toolContext,
    parameters,
    response,
    expectedKind,
  }) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulAIResponse(response))
    const { result } = renderHook(() => useAIWritingToolRunner('fiction'))

    let output: Awaited<ReturnType<typeof result.current>> | undefined
    await act(async () => {
      output = await result.current(tool(toolId), toolContext, parameters)
    })

    expect(output?.kind).toBe(expectedKind)
  })

  it('requires the user to configure an OpenRouter key', async () => {
    ;(useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      hasOpenRouterKey: false,
      defaultModel: 'anthropic/claude-sonnet-5',
    })
    const request = vi.spyOn(globalThis, 'fetch')
    const { result } = renderHook(() => useAIWritingToolRunner('fiction'))

    await expect(result.current(tool('continue-scene'), context, {})).rejects.toThrow(
      'Add your OpenRouter API key',
    )
    expect(request).not.toHaveBeenCalled()
  })

  it('surfaces provider errors returned by the writing-tool endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { error: 'OpenRouter rejected the request because the key has insufficient credits.' },
        { status: 502 },
      ),
    )
    const { result } = renderHook(() => useAIWritingToolRunner('fiction'))

    await expect(result.current(tool('continue-scene'), context, {})).rejects.toThrow(
      'insufficient credits',
    )
  })
})
