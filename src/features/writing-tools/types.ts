export type ProjectCategoryId =
  | 'general'
  | 'fiction'
  | 'screenplay'
  | 'poetry'

export type ToolStage = 'develop' | 'draft' | 'revise'
export type ToolTarget = 'selection' | 'cursor' | 'document'
export type ToolResultKind = 'transform' | 'review' | 'options' | 'scratchpad'

export interface ProjectCategoryDefinition {
  id: ProjectCategoryId
  name: string
  summary: string
  examples: string
}

export interface ToolDefinition {
  id: string
  name: string
  summary: string
  helpsWith: string
  bestTime: string
  needs: string
  produces: string
  draftImpact: string
  howToUse: string[]
  target: ToolTarget
  resultKind: ToolResultKind
  stage: ToolStage
  categories: ProjectCategoryId[]
  featuredFor: ProjectCategoryId[]
  parameters?: Array<{
    id: string
    label: string
    description: string
    placeholder: string
    multiline?: boolean
    required?: boolean
  }>
}

export interface ToolContextSnapshot {
  documentText: string
  selection: { text: string; from: number; to: number } | null
  cursor: number
}

export interface ToolApplyRequest {
  operation: 'replace' | 'insert' | 'append'
  text: string
  snapshot: ToolContextSnapshot
}

export interface TransformResult {
  kind: 'transform'
  original: string
  suggestion: string
}

export interface ReviewItem {
  id: string
  title: string
  body: string
  severity: 'note' | 'opportunity'
}

export interface ReviewResult {
  kind: 'review'
  summary: string
  items: ReviewItem[]
}

export interface OptionItem {
  id: string
  title: string
  body: string
  rationale: string
}

export interface OptionsResult {
  kind: 'options'
  items: OptionItem[]
}

export interface ScratchpadResult {
  kind: 'scratchpad'
  text: string
  preferredApply: 'insert' | 'append'
}

export type ToolResult =
  | TransformResult
  | ReviewResult
  | OptionsResult
  | ScratchpadResult

export type ToolParameters = Record<string, string>
