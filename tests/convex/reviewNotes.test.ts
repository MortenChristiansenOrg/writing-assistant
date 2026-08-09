import { beforeEach, describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import {
  createAuthenticatedContext,
  createTestContext,
  createTestDocument,
  createTestProject,
} from './setup'

describe('reviewNotes', () => {
  let t: ReturnType<typeof createTestContext>

  beforeEach(() => {
    t = createTestContext()
  })

  it('updates and clears a re-reviewed note category', async () => {
    const { asUser, userId } = await createAuthenticatedContext(t)
    const projectId = await createTestProject(t, userId)
    const documentId = await createTestDocument(t, userId, projectId)
    await asUser.mutation(api.reviewNotes.createBatch, {
      documentId,
      personaName: 'Editor',
      model: 'test/model',
      notes: [
        {
          comment: 'Original note',
          severity: 'suggestion',
          category: 'clarity',
        },
      ],
    })
    const [note] = await asUser.query(api.reviewNotes.list, { documentId })
    expect(note).toBeDefined()
    if (!note) throw new Error('Expected review note')

    await asUser.mutation(api.reviewNotes.update, {
      id: note._id,
      comment: 'Updated note',
      severity: 'info',
      category: 'pacing',
    })
    expect(
      (await asUser.query(api.reviewNotes.list, { documentId }))[0]?.category,
    ).toBe('pacing')

    await asUser.mutation(api.reviewNotes.update, {
      id: note._id,
      comment: 'Updated again',
      severity: 'info',
      category: null,
    })
    expect(
      (await asUser.query(api.reviewNotes.list, { documentId }))[0]?.category,
    ).toBeUndefined()
  })

  it('rejects anonymous and foreign document access', async () => {
    const owner = await createAuthenticatedContext(t)
    const other = await createAuthenticatedContext(t)
    const projectId = await createTestProject(t, owner.userId)
    const documentId = await createTestDocument(
      t,
      owner.userId,
      projectId,
    )
    await owner.asUser.mutation(api.reviewNotes.createBatch, {
      documentId,
      personaName: 'Editor',
      model: 'test/model',
      notes: [{ comment: 'Owner note', severity: 'suggestion' }],
    })
    const [note] = await owner.asUser.query(api.reviewNotes.list, {
      documentId,
    })
    if (!note) throw new Error('Expected review note')

    expect(await t.query(api.reviewNotes.list, { documentId })).toEqual([])
    await expect(
      t.mutation(api.reviewNotes.createBatch, {
        documentId,
        personaName: 'Editor',
        model: 'test/model',
        notes: [],
      }),
    ).rejects.toThrow('Unauthorized')
    expect(
      await other.asUser.query(api.reviewNotes.list, { documentId }),
    ).toEqual([])
    await expect(
      other.asUser.mutation(api.reviewNotes.createBatch, {
        documentId,
        personaName: 'Editor',
        model: 'test/model',
        notes: [],
      }),
    ).rejects.toThrow('Document not found')
    await expect(
      other.asUser.mutation(api.reviewNotes.update, {
        id: note._id,
        comment: 'Foreign update',
        severity: 'warning',
        category: null,
      }),
    ).rejects.toThrow('Not found')
  })

  it.each(['document', 'project'] as const)(
    'blocks review-note access while the %s is deleting',
    async (deletingTarget) => {
      const owner = await createAuthenticatedContext(t)
      const projectId = await createTestProject(t, owner.userId)
      const documentId = await createTestDocument(
        t,
        owner.userId,
        projectId,
      )
      await owner.asUser.mutation(api.reviewNotes.createBatch, {
        documentId,
        personaName: 'Editor',
        model: 'test/model',
        notes: [{ comment: 'Owner note', severity: 'suggestion' }],
      })
      const [note] = await owner.asUser.query(api.reviewNotes.list, {
        documentId,
      })
      if (!note) throw new Error('Expected review note')

      await t.run(async (ctx) => {
        if (deletingTarget === 'document') {
          await ctx.db.patch(documentId, { deletingAt: Date.now() })
        } else {
          await ctx.db.patch(projectId, { deletingAt: Date.now() })
        }
      })

      expect(
        await owner.asUser.query(api.reviewNotes.list, { documentId }),
      ).toEqual([])
      await expect(
        owner.asUser.mutation(api.reviewNotes.createBatch, {
          documentId,
          personaName: 'Editor',
          model: 'test/model',
          notes: [],
        }),
      ).rejects.toThrow('Document not found')
      await expect(
        owner.asUser.mutation(api.reviewNotes.update, {
          id: note._id,
          comment: 'Too late',
          severity: 'warning',
          category: null,
        }),
      ).rejects.toThrow('Not found')
    },
  )
})
