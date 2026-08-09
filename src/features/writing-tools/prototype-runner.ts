import type {
  OptionItem,
  ToolContextSnapshot,
  ToolDefinition,
  ToolParameters,
  ToolResult,
} from './types'

function compactContext(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return 'the piece'
  return compact.length > 96 ? `${compact.slice(0, 93)}…` : compact
}

function makeOptions(context: ToolContextSnapshot, question: string): OptionItem[] {
  const subject = compactContext(context.documentText)
  const focus = question.trim() || 'the central choice'
  return [
    {
      id: 'reverse',
      title: 'Reverse the apparent win',
      body: `Let ${focus} succeed immediately, then reveal that the success makes the deeper problem in “${subject}” harder to solve.`,
      rationale: 'A reversal preserves momentum while changing what success means.',
    },
    {
      id: 'cost',
      title: 'Make the cost personal',
      body: `Force a choice between the current objective and a relationship, belief, or promise already implied by “${subject}”.`,
      rationale: 'A personal cost turns an external event into a character decision.',
    },
    {
      id: 'absence',
      title: 'Use what is missing',
      body: `Remove the expected source of help. Let the silence or absence around ${focus} become the pressure that drives the next move.`,
      rationale: 'Absence creates space for subtext and a less predictable response.',
    },
  ]
}

export async function runPrototypeTool(
  tool: ToolDefinition,
  context: ToolContextSnapshot,
  parameters: ToolParameters,
): Promise<ToolResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 350))

  if (tool.id === 'alternate-pov') {
    const original = context.selection?.text ?? ''
    return {
      kind: 'transform',
      original,
      suggestion: `From the edge of the moment, the same details carried a different weight: ${original}`,
    }
  }

  if (tool.id === 'dialogue-audit') {
    const text = context.selection?.text ?? context.documentText
    const hasDialogue = /[“”"']/.test(text)
    return {
      kind: 'review',
      summary: hasDialogue
        ? 'The exchange has a readable surface goal. The strongest revision opportunity is to separate what is said from what each speaker wants.'
        : 'There is little marked dialogue in this context, so these notes focus on voice and implied exchange.',
      items: [
        {
          id: 'voice',
          title: 'Differentiate the voices',
          body: 'Give one speaker a noticeably different sentence length, vocabulary, or avoidance pattern.',
          severity: 'opportunity',
        },
        {
          id: 'subtext',
          title: 'Protect the subtext',
          body: 'Find one line that states the conflict directly and let the speaker approach it indirectly instead.',
          severity: 'opportunity',
        },
        {
          id: 'turn',
          title: 'Clarify the turn',
          body: 'Mark the exact reply after which one participant changes tactic, status, or expectation.',
          severity: 'note',
        },
      ],
    }
  }

  if (tool.id === 'what-if') {
    return { kind: 'options', items: makeOptions(context, parameters.question ?? '') }
  }

  if (tool.id === 'scene-blueprint') {
    return {
      kind: 'scratchpad',
      preferredApply: 'append',
      text: `SCENE BLUEPRINT\n\nOpening pressure\n- Establish the immediate goal: ${parameters.goal}\n- Show why it matters now.\n\nEscalation\n- Introduce the obstacle: ${parameters.obstacle}\n- Let the first tactic fail or create a cost.\n- Force a more revealing second tactic.\n\nTurn\n- Change the situation: ${parameters.turn}\n- End on the new question, choice, or consequence.`,
    }
  }

  const finalLine = context.documentText.trim().split(/\n+/).at(-1) ?? ''
  return {
    kind: 'scratchpad',
    preferredApply: 'insert',
    text: `${finalLine ? 'The thought did not end there. ' : ''}A small, concrete detail interrupted the expected next move, forcing a choice that could no longer be postponed.`,
  }
}
