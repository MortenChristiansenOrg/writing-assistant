import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server'
import { getCurrentUserId } from './model/auth'

const DELETE_BATCH_SIZE = 64

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    const project = await ctx.db.get(args.projectId)
    if (
      !project ||
      project.userId !== userId ||
      project.deletingAt !== undefined
    ) {
      return []
    }

    const documents = await ctx.db
      .query('documents')
      .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect()
    return documents.filter((document) => document.deletingAt === undefined)
  },
})

export const get = query({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    const doc = await ctx.db.get(args.id)
    if (!doc || doc.userId !== userId || doc.deletingAt !== undefined) {
      return null
    }

    return doc
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get(args.projectId)
    if (
      !project ||
      project.userId !== userId ||
      project.deletingAt !== undefined
    ) {
      throw new Error('Project not found')
    }

    const now = Date.now()
    const defaultContent = {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }

    return await ctx.db.insert('documents', {
      projectId: args.projectId,
      userId,
      title: args.title,
      content: args.content ?? defaultContent,
      ...(args.description !== undefined && { description: args.description }),
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('documents'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const doc = await ctx.db.get(args.id)
    if (!doc || doc.userId !== userId || doc.deletingAt !== undefined) {
      throw new Error('Document not found')
    }

    await ctx.db.patch(args.id, {
      ...(args.title !== undefined && { title: args.title }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.content !== undefined && { content: args.content }),
      updatedAt: Date.now(),
    })

    await ctx.db.patch(doc.projectId, {
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const doc = await ctx.db.get(args.id)
    if (!doc || doc.userId !== userId) {
      throw new Error('Document not found')
    }

    if (doc.deletingAt === undefined) {
      await ctx.db.patch(args.id, { deletingAt: Date.now() })
      await ctx.scheduler.runAfter(0, internal.documents.cleanup, { id: args.id })
    }
  },
})

export async function cleanupDocumentBatch(
  ctx: MutationCtx,
  documentId: Id<'documents'>,
): Promise<boolean> {
  const document = await ctx.db.get(documentId)
  if (!document) return true

  const revision = await ctx.db
    .query('revisions')
    .withIndex('by_document', (q) => q.eq('documentId', documentId))
    .first()

  if (revision) {
    const feedback = await ctx.db
      .query('aiFeedback')
      .withIndex('by_revision', (q) => q.eq('revisionId', revision._id))
      .take(DELETE_BATCH_SIZE)
    for (const item of feedback) {
      await ctx.db.delete(item._id)
    }
    if (feedback.length < DELETE_BATCH_SIZE) {
      await ctx.db.delete(revision._id)
    }
    return false
  }

  const notes = await ctx.db
    .query('reviewNotes')
    .withIndex('by_document', (q) => q.eq('documentId', documentId))
    .take(DELETE_BATCH_SIZE)
  for (const note of notes) {
    await ctx.db.delete(note._id)
  }
  if (notes.length === DELETE_BATCH_SIZE) return false

  await ctx.db.delete(documentId)
  return true
}

export const cleanup = internalMutation({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    const complete = await cleanupDocumentBatch(ctx, args.id)
    if (!complete) {
      await ctx.scheduler.runAfter(0, internal.documents.cleanup, {
        id: args.id,
      })
    }
  },
})
