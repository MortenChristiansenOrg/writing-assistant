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
})
