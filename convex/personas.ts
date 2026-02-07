import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('personas')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
  },
})

export const get = query({
  args: { id: v.id('personas') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    const persona = await ctx.db.get(args.id)
    if (!persona || persona.userId !== userId) return null

    return persona
  },
})

export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    return await ctx.db
      .query('personas')
      .withIndex('by_user_default', (q) =>
        q.eq('userId', userId).eq('isDefault', true)
      )
      .first()
  },
})

export const listForProject = query({
  args: { projectId: v.optional(v.id('projects')) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return []

    const global = await ctx.db
      .query('personas')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('projectId'), undefined))
      .collect()

    if (!args.projectId) return global

    const projectScoped = await ctx.db
      .query('personas')
      .withIndex('by_user_project', (q) =>
        q.eq('userId', userId).eq('projectId', args.projectId)
      )
      .collect()

    return [...global, ...projectScoped]
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.string(),
    isDefault: v.optional(v.boolean()),
    model: v.optional(v.string()),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const now = Date.now()
    const isDefault = args.isDefault ?? false

    if (isDefault) {
      const existingDefault = await ctx.db
        .query('personas')
        .withIndex('by_user_default', (q) =>
          q.eq('userId', userId).eq('isDefault', true)
        )
        .first()

      if (existingDefault) {
        await ctx.db.patch(existingDefault._id, { isDefault: false })
      }
    }

    return await ctx.db.insert('personas', {
      userId,
      name: args.name,
      ...(args.description !== undefined && { description: args.description }),
      systemPrompt: args.systemPrompt,
      isDefault,
      ...(args.model !== undefined && { model: args.model }),
      ...(args.projectId !== undefined && { projectId: args.projectId }),
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('personas'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    model: v.optional(v.string()),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const persona = await ctx.db.get(args.id)
    if (!persona || persona.userId !== userId) {
      throw new Error('Persona not found')
    }

    if (args.isDefault === true) {
      const existingDefault = await ctx.db
        .query('personas')
        .withIndex('by_user_default', (q) =>
          q.eq('userId', userId).eq('isDefault', true)
        )
        .first()

      if (existingDefault && existingDefault._id !== args.id) {
        await ctx.db.patch(existingDefault._id, { isDefault: false })
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.systemPrompt !== undefined && {
        systemPrompt: args.systemPrompt,
      }),
      ...(args.isDefault !== undefined && { isDefault: args.isDefault }),
      ...(args.model !== undefined && { model: args.model }),
      ...(args.projectId !== undefined && { projectId: args.projectId }),
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id('personas') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const persona = await ctx.db.get(args.id)
    if (!persona || persona.userId !== userId) {
      throw new Error('Persona not found')
    }

    await ctx.db.delete(args.id)
  },
})
