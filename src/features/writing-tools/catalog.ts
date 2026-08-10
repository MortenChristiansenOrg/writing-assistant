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
    howToUse: [
      'Open Tools and keep the panel open while you work in the editor.',
      'Select the passage you want to experiment with. The Use tool button becomes available as soon as text is selected.',
      'Choose Use tool and compare the Original and Suggestion tabs.',
      'Choose Replace selection to put the suggestion into your draft, or close the panel to keep the original.',
    ],
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
    howToUse: [
      'Open Tools and keep the panel open. Select a conversation in the editor to review that passage, or leave everything unselected to review the whole document.',
      'Return to Dialogue audit and choose Use tool.',
      'Read the summary and note cards, then close the panel and make any changes you agree with directly in your draft.',
    ],
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
    howToUse: [
      'Choose Use tool for general directions. To explore a specific question, open Details, enter the question, then choose Use tool.',
      'Pin promising paths, Remix one for a variation, or dismiss ideas you do not want.',
      'Move a path to the Scratchpad to edit it, then copy it or choose Append to draft.',
    ],
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
    howToUse: [
      'Choose Use tool to open the setup form.',
      'Fill in the character’s immediate goal, the obstacle, and the turn that ends the scene, then choose Use tool again.',
      'Edit the generated blueprint in the Scratchpad, then copy it or choose Append to draft.',
    ],
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
    howToUse: [
      'Open Tools and keep the panel open while you work in the editor.',
      'Click exactly where the continuation should begin without selecting any text. The Use tool button updates when the cursor is ready.',
      'Choose Use tool and edit the proposed continuation in the Scratchpad.',
      'Choose Insert at captured cursor to add it. If the draft changed while the panel was open, run the tool again.',
    ],
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
    return 'Keep Tools open, then select a passage in the editor.'
  }
  if (
    tool.target === 'selection'
    && context.selection
    && context.selection.text.length > 12_000
  ) {
    return 'Select a passage shorter than 12,000 characters so the AI can return a complete rewrite.'
  }
  if (tool.target === 'cursor' && context.selection) {
    return 'Keep Tools open, then click an insertion point in the editor without selecting text.'
  }
  if (tool.target === 'cursor' && context.cursor <= 1) {
    return 'Keep Tools open, then place the cursor after some draft text.'
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
