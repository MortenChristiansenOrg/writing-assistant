import type {
  ProjectCategoryDefinition,
  ProjectCategoryId,
  ToolContextSnapshot,
  ToolDefinition,
  ToolStage,
} from './types'

export const PROJECT_CATEGORIES: ProjectCategoryDefinition[] = [
  {
    id: 'general',
    name: 'General writing',
    summary: 'Flexible support for essays, articles, notes, and mixed projects.',
    examples: 'Articles, essays, newsletters',
  },
  {
    id: 'fiction',
    name: 'Fiction',
    summary: 'Tools focused on character, scene, voice, and narrative momentum.',
    examples: 'Novels, short stories, serials',
  },
  {
    id: 'screenplay',
    name: 'Screenplay',
    summary: 'Scene and dialogue tools for scripts and other performance writing.',
    examples: 'Film, television, stage',
  },
  {
    id: 'poetry',
    name: 'Poetry',
    summary: 'Support for imagery, voice, compression, sound, and revision.',
    examples: 'Poems, spoken word, lyrics',
  },
]

const allCategories: ProjectCategoryId[] = [
  'general',
  'fiction',
  'screenplay',
  'poetry',
]

export const WRITING_TOOLS: ToolDefinition[] = [
  {
    id: 'alternate-pov',
    name: 'Alternate point of view',
    summary: 'Preview the selected passage from a different narrative distance.',
    helpsWith: 'Testing voice, empathy, and what a scene reveals or conceals.',
    bestTime: 'While revising a passage whose perspective feels flat or distant.',
    needs: 'A text selection.',
    produces: 'A non-destructive rewrite beside the original.',
    draftImpact: 'Nothing changes until you choose Replace selection.',
    target: 'selection',
    resultKind: 'transform',
    stage: 'revise',
    categories: allCategories,
    featuredFor: ['fiction', 'poetry'],
  },
  {
    id: 'dialogue-audit',
    name: 'Dialogue audit',
    summary: 'Check whether voices, subtext, and conversational turns are distinct.',
    helpsWith: 'Finding exposition, repeated rhythms, and missed subtext.',
    bestTime: 'After drafting a conversation and before line-level polishing.',
    needs: 'A selection, or the current document if nothing is selected.',
    produces: 'Read-only observations and focused revision opportunities.',
    draftImpact: 'Review only—your draft is never edited.',
    target: 'document',
    resultKind: 'review',
    stage: 'revise',
    categories: allCategories,
    featuredFor: ['screenplay', 'fiction'],
  },
  {
    id: 'what-if',
    name: 'What-if paths',
    summary: 'Generate several meaningfully different directions for the piece.',
    helpsWith: 'Escaping the first obvious idea and comparing consequences.',
    bestTime: 'During development or whenever the draft feels boxed in.',
    needs: 'Some document context and an optional question.',
    produces: 'Three option cards you can pin, remix, or move to a scratchpad.',
    draftImpact: 'Ideas stay outside the draft until you explicitly append one.',
    target: 'document',
    resultKind: 'options',
    stage: 'develop',
    categories: allCategories,
    featuredFor: allCategories,
    parameters: [
      {
        id: 'question',
        label: 'What are you exploring?',
        description: 'Optional. Name a constraint, character choice, or direction.',
        placeholder: 'What if the apparent win creates a worse problem?',
      },
    ],
  },
  {
    id: 'scene-blueprint',
    name: 'Scene blueprint',
    summary: 'Turn a goal, obstacle, and turn into an editable scene scaffold.',
    helpsWith: 'Giving a scene movement before spending time on polished prose.',
    bestTime: 'Before drafting a new scene or when rebuilding one structurally.',
    needs: 'A goal, an obstacle, and the change that ends the scene.',
    produces: 'An editable scratchpad outline with beats and prompts.',
    draftImpact: 'The scaffold remains separate until you choose Append to draft.',
    target: 'document',
    resultKind: 'scratchpad',
    stage: 'develop',
    categories: allCategories,
    featuredFor: ['fiction', 'screenplay'],
    parameters: [
      {
        id: 'goal',
        label: 'Goal',
        description: 'What does the viewpoint character want right now?',
        placeholder: 'Get the witness to reveal what they saw',
        required: true,
      },
      {
        id: 'obstacle',
        label: 'Obstacle',
        description: 'What makes the goal difficult or costly?',
        placeholder: 'The witness will only talk if offered protection',
        required: true,
      },
      {
        id: 'turn',
        label: 'Turn',
        description: 'What changes the situation by the end?',
        placeholder: 'The witness recognizes the detective as the threat',
        required: true,
      },
    ],
  },
  {
    id: 'continue-scene',
    name: 'Continue from here',
    summary: 'Create a short continuation at the cursor without touching the draft.',
    helpsWith: 'Regaining momentum while keeping authorship and final control.',
    bestTime: 'Mid-draft when you know the direction but not the next few lines.',
    needs: 'A cursor position and some text before it.',
    produces: 'Editable prose in a scratchpad.',
    draftImpact: 'Nothing changes until you choose Insert at captured cursor.',
    target: 'cursor',
    resultKind: 'scratchpad',
    stage: 'draft',
    categories: allCategories,
    featuredFor: ['general', 'poetry'],
  },
]

export function getProjectCategory(id: ProjectCategoryId): ProjectCategoryDefinition {
  return PROJECT_CATEGORIES.find((category) => category.id === id) ?? PROJECT_CATEGORIES[0]!
}

export function getAvailableTools(category: ProjectCategoryId): ToolDefinition[] {
  return WRITING_TOOLS.filter((tool) => tool.categories.includes(category))
}

export function getDisabledReason(
  tool: ToolDefinition,
  context: ToolContextSnapshot,
): string | null {
  if (tool.target === 'selection' && !context.selection) {
    return 'Select a passage in the editor, then open Tools again.'
  }
  if (tool.target === 'cursor' && context.selection) {
    return 'Place a cursor without selecting text, then open Tools again.'
  }
  if (tool.target === 'cursor' && context.cursor <= 1) {
    return 'Place the cursor after some draft text, then open Tools again.'
  }
  if (tool.target === 'document' && !context.documentText.trim()) {
    return 'Add a little text to the document first.'
  }
  return null
}

export function getRecommendationReason(
  tool: ToolDefinition,
  category: ProjectCategoryId,
  context: ToolContextSnapshot,
): string | null {
  if (context.selection && tool.target === 'selection') return 'Recommended because text is selected.'
  if (!context.selection && tool.featuredFor.includes(category)) {
    return `Featured for ${getProjectCategory(category).name.toLowerCase()} projects.`
  }
  return null
}

export const TOOL_STAGES: Array<{ id: 'all' | ToolStage; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'develop', label: 'Develop' },
  { id: 'draft', label: 'Draft' },
  { id: 'revise', label: 'Revise' },
]
