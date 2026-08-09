import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '../../convex/_generated/api'
import {
  createTestContext,
  createAuthenticatedContext,
  createTestProject,
  createTestDocument,
  finishScheduledFunctions,
} from './setup'

describe('documents', () => {
  let t: ReturnType<typeof createTestContext>

  beforeEach(() => {
    t = createTestContext()
  })

  describe('list', () => {
    it('returns empty array when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)

      const docs = await t.query(api.documents.list, { projectId })
      expect(docs).toEqual([])
    })

    it('returns empty for other users project', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)

      const docs = await asUser2.query(api.documents.list, { projectId })
      expect(docs).toEqual([])
    })

    it('returns documents for authenticated user', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      await createTestDocument(t, userId, projectId)
      await createTestDocument(t, userId, projectId)

      const docs = await asUser.query(api.documents.list, { projectId })
      expect(docs).toHaveLength(2)
    })

    it('orders documents by updatedAt descending', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)

      const doc1 = await createTestDocument(t, userId, projectId)
      const doc2 = await createTestDocument(t, userId, projectId)

      // Update doc1 to be newer
      await t.run(async (ctx) => {
        await ctx.db.patch(doc1, { updatedAt: Date.now() + 1000 })
      })

      const docs = await asUser.query(api.documents.list, { projectId })
      expect(docs[0]._id).toBe(doc1)
      expect(docs[1]._id).toBe(doc2)
    })
  })

  describe('get', () => {
    it('returns null when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      const doc = await t.query(api.documents.get, { id: docId })
      expect(doc).toBeNull()
    })

    it('returns null for other users document', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      const doc = await asUser2.query(api.documents.get, { id: docId })
      expect(doc).toBeNull()
    })

    it('returns document for authenticated user', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      const doc = await asUser.query(api.documents.get, { id: docId })
      expect(doc).not.toBeNull()
      expect(doc?._id).toBe(docId)
      expect(doc?.title).toBe('Test Document')
    })

    it('returns null for deleted document', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      // Delete the document directly
      await t.run(async (ctx) => {
        await ctx.db.delete(docId)
      })

      const doc = await asUser.query(api.documents.get, { id: docId })
      expect(doc).toBeNull()
    })
  })

  describe('create', () => {
    it('throws when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)

      await expect(
        t.mutation(api.documents.create, {
          projectId,
          title: 'New Doc',
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('throws for other users project', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)

      await expect(
        asUser2.mutation(api.documents.create, {
          projectId,
          title: 'New Doc',
        })
      ).rejects.toThrow('Project not found')
    })

    it('throws for deleted project', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)

      // Delete the project
      await t.run(async (ctx) => {
        await ctx.db.delete(projectId)
      })

      await expect(
        asUser.mutation(api.documents.create, {
          projectId,
          title: 'New Doc',
        })
      ).rejects.toThrow('Project not found')
    })

    it('creates document with default content', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)

      const docId = await asUser.mutation(api.documents.create, {
        projectId,
        title: 'New Doc',
      })

      const doc = await asUser.query(api.documents.get, { id: docId })
      expect(doc?.title).toBe('New Doc')
      expect(doc?.content).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      })
    })

    it('creates document with custom content', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const customContent = { type: 'doc', content: [{ type: 'heading' }] }

      const docId = await asUser.mutation(api.documents.create, {
        projectId,
        title: 'New Doc',
        content: customContent,
      })

      const doc = await asUser.query(api.documents.get, { id: docId })
      expect(doc?.content).toEqual(customContent)
    })
  })

  describe('update', () => {
    it('throws when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      await expect(
        t.mutation(api.documents.update, {
          id: docId,
          title: 'Updated',
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('throws for other users document', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      await expect(
        asUser2.mutation(api.documents.update, {
          id: docId,
          title: 'Updated',
        })
      ).rejects.toThrow('Document not found')
    })

    it('throws for deleted document', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      await t.run(async (ctx) => {
        await ctx.db.delete(docId)
      })

      await expect(
        asUser.mutation(api.documents.update, {
          id: docId,
          title: 'Updated',
        })
      ).rejects.toThrow('Document not found')
    })

    it('updates document title', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      await asUser.mutation(api.documents.update, {
        id: docId,
        title: 'Updated Title',
      })

      const doc = await asUser.query(api.documents.get, { id: docId })
      expect(doc?.title).toBe('Updated Title')
    })

    it('updates document content', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)
      const newContent = { type: 'doc', content: [{ type: 'blockquote' }] }

      await asUser.mutation(api.documents.update, {
        id: docId,
        content: newContent,
      })

      const doc = await asUser.query(api.documents.get, { id: docId })
      expect(doc?.content).toEqual(newContent)
    })

    it('updates project updatedAt timestamp', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      const projectBefore = await t.run(async (ctx) => ctx.db.get(projectId))

      await asUser.mutation(api.documents.update, {
        id: docId,
        title: 'Updated',
      })

      const projectAfter = await t.run(async (ctx) => ctx.db.get(projectId))
      expect(projectAfter?.updatedAt).toBeGreaterThanOrEqual(projectBefore?.updatedAt ?? 0)
    })
  })

  describe('remove', () => {
    it('throws when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      await expect(t.mutation(api.documents.remove, { id: docId })).rejects.toThrow(
        'Unauthorized'
      )
    })

    it('throws for other users document', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      await expect(asUser2.mutation(api.documents.remove, { id: docId })).rejects.toThrow(
        'Document not found'
      )
    })

    it('throws for deleted document', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      await t.run(async (ctx) => {
        await ctx.db.delete(docId)
      })

      await expect(asUser.mutation(api.documents.remove, { id: docId })).rejects.toThrow(
        'Document not found'
      )
    })

    it('removes document', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      await asUser.mutation(api.documents.remove, { id: docId })

      const doc = await asUser.query(api.documents.get, { id: docId })
      expect(doc).toBeNull()
    })

    it('removes associated revisions', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      // Create some revisions
      await t.run(async (ctx) => {
        await ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId,
          content: { type: 'doc' },
          changeType: 'manual',
          createdAt: 1000,
        })
        await ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId,
          content: { type: 'doc' },
          changeType: 'manual',
          createdAt: 2000,
        })
      })

      await asUser.mutation(api.documents.remove, { id: docId })
      await finishScheduledFunctions(t)

      const revisions = await t.run(async (ctx) =>
        ctx.db
          .query('revisions')
          .withIndex('by_document', (q) => q.eq('documentId', docId))
          .collect()
      )
      expect(revisions).toHaveLength(0)
    })

    it('removes large dependent collections in bounded scheduled batches', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId)

      await t.run(async (ctx) => {
        const revisionId = await ctx.db.insert('revisions', {
          documentId: docId,
          userId,
          content: { type: 'doc' },
          changeType: 'manual',
          createdAt: 1000,
        })
        for (let index = 0; index < 70; index += 1) {
          await ctx.db.insert('aiFeedback', {
            revisionId,
            userId,
            originalText: 'before',
            suggestedText: 'after',
            prompt: 'rewrite',
            model: 'test/model',
            status: 'pending',
            createdAt: index,
          })
          await ctx.db.insert('reviewNotes', {
            documentId: docId,
            userId,
            personaName: 'Reviewer',
            model: 'test/model',
            comment: `Note ${index}`,
            severity: 'suggestion',
            dismissed: false,
            createdAt: index,
          })
        }
      })

      await asUser.mutation(api.documents.remove, { id: docId })
      expect(await asUser.query(api.documents.get, { id: docId })).toBeNull()

      await finishScheduledFunctions(t)

      const remaining = await t.run(async (ctx) => ({
        document: await ctx.db.get(docId),
        revisions: await ctx.db
          .query('revisions')
          .withIndex('by_document', (q) => q.eq('documentId', docId))
          .collect(),
        notes: await ctx.db
          .query('reviewNotes')
          .withIndex('by_document', (q) => q.eq('documentId', docId))
          .collect(),
        feedback: await ctx.db.query('aiFeedback').collect(),
      }))
      expect(remaining).toEqual({
        document: null,
        revisions: [],
        notes: [],
        feedback: [],
      })
    })
  })
})
