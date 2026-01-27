import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('projects')
      .withIndex('by_user_updated', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

export const get = query({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== userId) return null

    return project
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const now = Date.now()
    return await ctx.db.insert('projects', {
      userId,
      name: args.name,
      ...(args.description !== undefined && { description: args.description }),
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== userId) {
      throw new Error('Project not found')
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== userId) {
      throw new Error('Project not found')
    }

    const documents = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .collect()

    for (const doc of documents) {
      const revisions = await ctx.db
        .query('revisions')
        .withIndex('by_document', (q) => q.eq('documentId', doc._id))
        .collect()

      for (const rev of revisions) {
        await ctx.db.delete(rev._id)
      }
      await ctx.db.delete(doc._id)
    }

    await ctx.db.delete(args.id)
  },
})
