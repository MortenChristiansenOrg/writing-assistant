import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

export const list = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return []

    const doc = await ctx.db.get(args.documentId)
    if (!doc || doc.userId !== userId) return []

    return await ctx.db
      .query('revisions')
      .withIndex('by_document_time', (q) => q.eq('documentId', args.documentId))
      .order('desc')
      .collect()
  },
})

export const get = query({
  args: { id: v.id('revisions') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    const revision = await ctx.db.get(args.id)
    if (!revision || revision.userId !== userId) return null

    return revision
  },
})

export const create = mutation({
  args: {
    documentId: v.id('documents'),
    content: v.any(),
    changeType: v.union(
      v.literal('manual'),
      v.literal('ai_rewrite'),
      v.literal('ai_insert'),
      v.literal('restore')
    ),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const doc = await ctx.db.get(args.documentId)
    if (!doc || doc.userId !== userId) {
      throw new Error('Document not found')
    }

    return await ctx.db.insert('revisions', {
      documentId: args.documentId,
      userId,
      content: args.content,
      changeType: args.changeType,
      description: args.description,
      createdAt: Date.now(),
    })
  },
})

export const restore = mutation({
  args: {
    revisionId: v.id('revisions'),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const revision = await ctx.db.get(args.revisionId)
    if (!revision || revision.userId !== userId) {
      throw new Error('Revision not found')
    }

    const doc = await ctx.db.get(revision.documentId)
    if (!doc) throw new Error('Document not found')

    await ctx.db.insert('revisions', {
      documentId: revision.documentId,
      userId,
      content: doc.content,
      changeType: 'restore',
      description: `Restored from revision`,
      createdAt: Date.now(),
    })

    await ctx.db.patch(revision.documentId, {
      content: revision.content,
      updatedAt: Date.now(),
    })
  },
})
