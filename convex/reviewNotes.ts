import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

export const list = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('reviewNotes')
      .withIndex('by_document_user', (q) =>
        q.eq('documentId', args.documentId).eq('userId', userId)
      )
      .order('desc')
      .collect()
  },
})

export const createBatch = mutation({
  args: {
    documentId: v.id('documents'),
    personaId: v.optional(v.id('personas')),
    personaName: v.string(),
    model: v.string(),
    notes: v.array(
      v.object({
        comment: v.string(),
        severity: v.union(
          v.literal('info'),
          v.literal('suggestion'),
          v.literal('warning')
        ),
        category: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const now = Date.now()
    for (const note of args.notes) {
      const doc: Record<string, unknown> = {
        documentId: args.documentId,
        userId,
        personaName: args.personaName,
        model: args.model,
        comment: note.comment,
        severity: note.severity,
        dismissed: false,
        createdAt: now,
      }
      if (args.personaId !== undefined) doc.personaId = args.personaId
      if (note.category !== undefined) doc.category = note.category
      await ctx.db.insert('reviewNotes', doc as never)
    }
  },
})

export const update = mutation({
  args: {
    id: v.id('reviewNotes'),
    comment: v.string(),
    severity: v.union(
      v.literal('info'),
      v.literal('suggestion'),
      v.literal('warning')
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const note = await ctx.db.get(args.id)
    if (!note || note.userId !== userId) throw new Error('Not found')

    await ctx.db.patch(args.id, {
      comment: args.comment,
      severity: args.severity,
    })
  },
})

export const dismiss = mutation({
  args: { id: v.id('reviewNotes') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const note = await ctx.db.get(args.id)
    if (!note || note.userId !== userId) throw new Error('Not found')

    await ctx.db.patch(args.id, { dismissed: true })
  },
})

export const undismiss = mutation({
  args: { id: v.id('reviewNotes') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const note = await ctx.db.get(args.id)
    if (!note || note.userId !== userId) throw new Error('Not found')

    await ctx.db.patch(args.id, { dismissed: false })
  },
})

export const deleteForDocument = mutation({
  args: { documentId: v.id('documents') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const notes = await ctx.db
      .query('reviewNotes')
      .withIndex('by_document_user', (q) =>
        q.eq('documentId', args.documentId).eq('userId', userId)
      )
      .collect()

    for (const note of notes) {
      await ctx.db.delete(note._id)
    }
  },
})
