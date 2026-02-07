import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return []

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) return []

    return await ctx.db
      .query('documents')
      .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect()
  },
})

export const get = query({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    const doc = await ctx.db.get(args.id)
    if (!doc || doc.userId !== userId) return null

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
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) {
      throw new Error('Project not found')
    }

    const now = Date.now()
    const defaultContent = {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }

    const doc: Record<string, unknown> = {
      projectId: args.projectId,
      userId,
      title: args.title,
      content: args.content ?? defaultContent,
      createdAt: now,
      updatedAt: now,
    }
    if (args.description !== undefined) doc.description = args.description
    return await ctx.db.insert('documents', doc as never)
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
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const doc = await ctx.db.get(args.id)
    if (!doc || doc.userId !== userId) {
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
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const doc = await ctx.db.get(args.id)
    if (!doc || doc.userId !== userId) {
      throw new Error('Document not found')
    }

    const revisions = await ctx.db
      .query('revisions')
      .withIndex('by_document', (q) => q.eq('documentId', args.id))
      .collect()

    for (const rev of revisions) {
      await ctx.db.delete(rev._id)
    }

    await ctx.db.delete(args.id)
  },
})
