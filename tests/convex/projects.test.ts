import { beforeEach, describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import {
  createAuthenticatedContext,
  createTestContext,
  createTestDocument,
  createTestProject,
  finishScheduledFunctions,
} from './setup'

describe('projects', () => {
  let t: ReturnType<typeof createTestContext>

  beforeEach(() => {
    t = createTestContext()
  })

  it('scopes reads and writes to the authenticated owner', async () => {
    const owner = await createAuthenticatedContext(t)
    const otherUser = await createAuthenticatedContext(t)
    const projectId = await createTestProject(t, owner.userId)

    expect(
      await owner.asUser.query(api.projects.get, { id: projectId }),
    ).toMatchObject({ name: 'Test Project' })
    await owner.asUser.mutation(api.projects.update, {
      id: projectId,
      name: 'Updated by owner',
    })
    expect(
      await owner.asUser.query(api.projects.get, { id: projectId }),
    ).toMatchObject({ name: 'Updated by owner' })

    expect(await t.query(api.projects.list, {})).toEqual([])
    expect(await otherUser.asUser.query(api.projects.get, { id: projectId })).toBeNull()
    await expect(
      otherUser.asUser.mutation(api.projects.update, {
        id: projectId,
        name: 'Not mine',
      }),
    ).rejects.toThrow('Project not found')
    await expect(
      otherUser.asUser.mutation(api.projects.remove, { id: projectId }),
    ).rejects.toThrow('Project not found')
  })

  it('hides a project immediately and deletes all dependents in batches', async () => {
    const { asUser, userId } = await createAuthenticatedContext(t)
    const projectId = await createTestProject(t, userId)

    await t.run(async (ctx) => {
      for (let index = 0; index < 70; index += 1) {
        await ctx.db.insert('personas', {
          userId,
          projectId,
          name: `Persona ${index}`,
          systemPrompt: 'Review carefully',
          isDefault: false,
          createdAt: index,
          updatedAt: index,
        })
      }
    })

    const documentId = await createTestDocument(t, userId, projectId)
    await t.run(async (ctx) => {
      const revisionId = await ctx.db.insert('revisions', {
        documentId,
        userId,
        content: { type: 'doc' },
        changeType: 'manual',
        createdAt: 1000,
      })
      await ctx.db.insert('aiFeedback', {
        revisionId,
        userId,
        originalText: 'before',
        suggestedText: 'after',
        prompt: 'rewrite',
        model: 'test/model',
        status: 'pending',
        createdAt: 1000,
      })
      await ctx.db.insert('reviewNotes', {
        documentId,
        userId,
        personaName: 'Reviewer',
        model: 'test/model',
        comment: 'A note',
        severity: 'suggestion',
        dismissed: false,
        createdAt: 1000,
      })
    })

    await asUser.mutation(api.projects.remove, { id: projectId })

    expect(await asUser.query(api.projects.get, { id: projectId })).toBeNull()
    expect(await asUser.query(api.projects.list, {})).toEqual([])
    expect(await asUser.query(api.documents.list, { projectId })).toEqual([])

    await finishScheduledFunctions(t)

    const remaining = await t.run(async (ctx) => ({
      project: await ctx.db.get(projectId),
      document: await ctx.db.get(documentId),
      personas: await ctx.db
        .query('personas')
        .withIndex('by_user_project', (q) =>
          q.eq('userId', userId).eq('projectId', projectId),
        )
        .collect(),
      revisions: await ctx.db
        .query('revisions')
        .withIndex('by_document', (q) => q.eq('documentId', documentId))
        .collect(),
      notes: await ctx.db
        .query('reviewNotes')
        .withIndex('by_document', (q) => q.eq('documentId', documentId))
        .collect(),
      feedback: await ctx.db.query('aiFeedback').collect(),
    }))
    expect(remaining).toEqual({
      project: null,
      document: null,
      personas: [],
      revisions: [],
      notes: [],
      feedback: [],
    })
  })

  it('rejects new documents and personas once deletion begins', async () => {
    const { asUser, userId } = await createAuthenticatedContext(t)
    const projectId = await createTestProject(t, userId)

    await asUser.mutation(api.projects.remove, { id: projectId })

    await expect(
      asUser.mutation(api.documents.create, {
        projectId,
        title: 'Too late',
      }),
    ).rejects.toThrow('Project not found')
    await expect(
      asUser.mutation(api.personas.create, {
        projectId,
        name: 'Too late',
        systemPrompt: 'No-op',
      }),
    ).rejects.toThrow('Project not found')

    await finishScheduledFunctions(t)
  })
})
