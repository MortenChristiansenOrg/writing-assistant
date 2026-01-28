import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '../_generated/api'
import {
  createTestContext,
  createAuthenticatedContext,
  createTestProject,
  createTestDocument,
} from './setup'

describe('revisions', () => {
  let t: ReturnType<typeof createTestContext>

  beforeEach(() => {
    t = createTestContext()
  })

  describe('list', () => {
    it('returns empty array when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      const revisions = await t.query(api.revisions.list, { documentId: docId })
      expect(revisions).toEqual([])
    })

    it('returns empty for other users document', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      const revisions = await asUser2.query(api.revisions.list, { documentId: docId })
      expect(revisions).toEqual([])
    })

    it('returns revisions for authenticated user', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      // Create revisions
      await t.run(async (ctx) => {
        await ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc', version: 1 },
          changeType: 'manual',
          createdAt: Date.now(),
        })
        await ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc', version: 2 },
          changeType: 'ai_rewrite',
          createdAt: Date.now() + 1000,
        })
      })

      const revisions = await asUser.query(api.revisions.list, { documentId: docId })
      expect(revisions).toHaveLength(2)
    })

    it('orders revisions by createdAt descending', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      const rev1 = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc', version: 1 },
          changeType: 'manual',
          createdAt: 1000,
        })
      )
      const rev2 = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc', version: 2 },
          changeType: 'manual',
          createdAt: 2000,
        })
      )

      const revisions = await asUser.query(api.revisions.list, { documentId: docId })
      expect(revisions[0]._id).toBe(rev2)
      expect(revisions[1]._id).toBe(rev1)
    })
  })

  describe('get', () => {
    it('returns null when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)
      const revId = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc' },
          changeType: 'manual',
          createdAt: Date.now(),
        })
      )

      const revision = await t.query(api.revisions.get, { id: revId })
      expect(revision).toBeNull()
    })

    it('returns null for other users revision', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)
      const revId = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc' },
          changeType: 'manual',
          createdAt: Date.now(),
        })
      )

      const revision = await asUser2.query(api.revisions.get, { id: revId })
      expect(revision).toBeNull()
    })

    it('returns revision for authenticated user', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)
      const revId = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc', test: true },
          changeType: 'ai_insert',
          description: 'Test revision',
          createdAt: Date.now(),
        })
      )

      const revision = await asUser.query(api.revisions.get, { id: revId })
      expect(revision).not.toBeNull()
      expect(revision?._id).toBe(revId)
      expect(revision?.changeType).toBe('ai_insert')
      expect(revision?.description).toBe('Test revision')
    })

    it('returns null for deleted revision', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)
      const revId = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc' },
          changeType: 'manual',
          createdAt: Date.now(),
        })
      )

      await t.run(async (ctx) => {
        await ctx.db.delete(revId)
      })

      const revision = await asUser.query(api.revisions.get, { id: revId })
      expect(revision).toBeNull()
    })
  })

  describe('create', () => {
    it('throws when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      await expect(
        t.mutation(api.revisions.create, {
          documentId: docId,
          content: { type: 'doc' },
          changeType: 'manual',
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('throws for other users document', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      await expect(
        asUser2.mutation(api.revisions.create, {
          documentId: docId,
          content: { type: 'doc' },
          changeType: 'manual',
        })
      ).rejects.toThrow('Document not found')
    })

    it('throws for deleted document', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      await t.run(async (ctx) => {
        await ctx.db.delete(docId)
      })

      await expect(
        asUser.mutation(api.revisions.create, {
          documentId: docId,
          content: { type: 'doc' },
          changeType: 'manual',
        })
      ).rejects.toThrow('Document not found')
    })

    it('creates revision with required fields', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      const revId = await asUser.mutation(api.revisions.create, {
        documentId: docId,
        content: { type: 'doc', data: 'test' },
        changeType: 'ai_rewrite',
      })

      const revision = await asUser.query(api.revisions.get, { id: revId })
      expect(revision?.content).toEqual({ type: 'doc', data: 'test' })
      expect(revision?.changeType).toBe('ai_rewrite')
    })

    it('creates revision with description', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      const revId = await asUser.mutation(api.revisions.create, {
        documentId: docId,
        content: { type: 'doc' },
        changeType: 'manual',
        description: 'Saved manually',
      })

      const revision = await asUser.query(api.revisions.get, { id: revId })
      expect(revision?.description).toBe('Saved manually')
    })

    it('supports all changeType values', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      const changeTypes = ['manual', 'ai_rewrite', 'ai_insert', 'restore'] as const
      for (const changeType of changeTypes) {
        const revId = await asUser.mutation(api.revisions.create, {
          documentId: docId,
          content: { type: 'doc' },
          changeType,
        })
        const revision = await asUser.query(api.revisions.get, { id: revId })
        expect(revision?.changeType).toBe(changeType)
      }
    })
  })

  describe('restore', () => {
    it('throws when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)
      const revId = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc', old: true },
          changeType: 'manual',
          createdAt: Date.now(),
        })
      )

      await expect(
        t.mutation(api.revisions.restore, { revisionId: revId })
      ).rejects.toThrow('Unauthorized')
    })

    it('throws for other users revision', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)
      const revId = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc' },
          changeType: 'manual',
          createdAt: Date.now(),
        })
      )

      await expect(
        asUser2.mutation(api.revisions.restore, { revisionId: revId })
      ).rejects.toThrow('Revision not found')
    })

    it('throws for deleted revision', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)
      const revId = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: { type: 'doc' },
          changeType: 'manual',
          createdAt: Date.now(),
        })
      )

      await t.run(async (ctx) => {
        await ctx.db.delete(revId)
      })

      await expect(
        asUser.mutation(api.revisions.restore, { revisionId: revId })
      ).rejects.toThrow('Revision not found')
    })

    it('restores document content from revision', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      const oldContent = { type: 'doc', content: [{ type: 'paragraph', text: 'old' }] }
      const revId = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: oldContent,
          changeType: 'manual',
          createdAt: Date.now(),
        })
      )

      await asUser.mutation(api.revisions.restore, { revisionId: revId })

      const doc = await asUser.query(api.documents.get, { id: docId })
      expect(doc?.content).toEqual(oldContent)
    })

    it('creates a restore revision with current content', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, userId)
      const docId = await createTestDocument(t, userId, projectId as string)

      // Get current content
      const currentDoc = await asUser.query(api.documents.get, { id: docId })
      const currentContent = currentDoc?.content

      const oldContent = { type: 'doc', content: [{ type: 'paragraph', text: 'old' }] }
      const revId = await t.run(async (ctx) =>
        ctx.db.insert('revisions', {
          documentId: docId,
          userId: userId as never,
          content: oldContent,
          changeType: 'manual',
          createdAt: Date.now(),
        })
      )

      await asUser.mutation(api.revisions.restore, { revisionId: revId })

      const revisions = await asUser.query(api.revisions.list, { documentId: docId })
      const restoreRevision = revisions.find((r) => r.changeType === 'restore')
      expect(restoreRevision).toBeDefined()
      expect(restoreRevision?.content).toEqual(currentContent)
      expect(restoreRevision?.description).toBe('Restored from revision')
    })
  })
})
