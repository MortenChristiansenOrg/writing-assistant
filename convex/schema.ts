import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,

  userSettings: defineTable({
    userId: v.id('users'),
    defaultModel: v.optional(v.string()),
    spendingThreshold: v.optional(v.number()),
    vaultKeyId: v.optional(v.string()),
  }).index('by_user', ['userId']),

  projects: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_updated', ['userId', 'updatedAt']),

  documents: defineTable({
    projectId: v.id('projects'),
    userId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_user', ['userId'])
    .index('by_project_updated', ['projectId', 'updatedAt']),

  revisions: defineTable({
    documentId: v.id('documents'),
    userId: v.id('users'),
    content: v.any(),
    changeType: v.union(
      v.literal('manual'),
      v.literal('ai_rewrite'),
      v.literal('ai_insert'),
      v.literal('restore')
    ),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_document', ['documentId'])
    .index('by_document_time', ['documentId', 'createdAt']),

  aiFeedback: defineTable({
    revisionId: v.id('revisions'),
    userId: v.id('users'),
    originalText: v.string(),
    suggestedText: v.string(),
    prompt: v.string(),
    personaId: v.optional(v.id('personas')),
    model: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('rejected')
    ),
    createdAt: v.number(),
  }).index('by_revision', ['revisionId']),

  personas: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.string(),
    isDefault: v.boolean(),
    model: v.optional(v.string()),
    projectId: v.optional(v.id('projects')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_default', ['userId', 'isDefault'])
    .index('by_user_project', ['userId', 'projectId']),

  reviewNotes: defineTable({
    documentId: v.id('documents'),
    userId: v.id('users'),
    personaId: v.optional(v.id('personas')),
    personaName: v.string(),
    model: v.string(),
    comment: v.string(),
    severity: v.union(
      v.literal('info'),
      v.literal('suggestion'),
      v.literal('warning')
    ),
    category: v.optional(v.string()),
    dismissed: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_document', ['documentId'])
    .index('by_document_user', ['documentId', 'userId']),

  spendingSessions: defineTable({
    userId: v.id('users'),
    date: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalCost: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_date', ['userId', 'date'])
    .index('by_user_date_model', ['userId', 'date', 'model']),
})
