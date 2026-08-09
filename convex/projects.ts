import { v } from 'convex/values'
import { internal } from './_generated/api'
import {
  internalMutation,
  mutation,
  query,
} from './_generated/server'
import { cleanupDocumentBatch } from './documents'
import { getCurrentUserId } from './model/auth'

const DELETE_BATCH_SIZE = 64

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user_updated', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
    return projects.filter((project) => project.deletingAt === undefined)
  },
})

export const get = query({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    const project = await ctx.db.get(args.id)
    if (
      !project ||
      project.userId !== userId ||
      project.deletingAt !== undefined
    ) {
      return null
    }

    return project
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
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
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get(args.id)
    if (
      !project ||
      project.userId !== userId ||
      project.deletingAt !== undefined
    ) {
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
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get(args.id)
    if (!project || project.userId !== userId) {
      throw new Error('Project not found')
    }

    if (project.deletingAt === undefined) {
      await ctx.db.patch(args.id, { deletingAt: Date.now() })
      await ctx.scheduler.runAfter(0, internal.projects.cleanup, { id: args.id })
    }
  },
})

export const cleanup = internalMutation({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id)
    if (!project) return

    const document = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .first()
    if (document) {
      if (document.deletingAt === undefined) {
        await ctx.db.patch(document._id, { deletingAt: Date.now() })
      }
      await cleanupDocumentBatch(ctx, document._id)
      await ctx.scheduler.runAfter(0, internal.projects.cleanup, { id: args.id })
      return
    }

    const personas = await ctx.db
      .query('personas')
      .withIndex('by_user_project', (q) =>
        q.eq('userId', project.userId).eq('projectId', args.id),
      )
      .take(DELETE_BATCH_SIZE)
    for (const persona of personas) {
      await ctx.db.delete(persona._id)
    }
    if (personas.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.cleanup, { id: args.id })
      return
    }

    await ctx.db.delete(args.id)
  },
})
