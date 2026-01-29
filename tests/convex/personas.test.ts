import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '../../convex/_generated/api'
import { createTestContext, createAuthenticatedContext } from './setup'

describe('personas', () => {
  let t: ReturnType<typeof createTestContext>

  beforeEach(() => {
    t = createTestContext()
  })

  describe('list', () => {
    it('returns empty array when not authenticated', async () => {
      const personas = await t.query(api.personas.list, {})
      expect(personas).toEqual([])
    })

    it('returns empty array when user has no personas', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      const personas = await asUser.query(api.personas.list, {})
      expect(personas).toEqual([])
    })

    it('returns user personas', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)

      await t.run(async (ctx) => {
        await ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Persona 1',
          systemPrompt: 'Be helpful',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        await ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Persona 2',
          systemPrompt: 'Be concise',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const personas = await asUser.query(api.personas.list, {})
      expect(personas).toHaveLength(2)
    })

    it('does not return other users personas', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)

      await t.run(async (ctx) => {
        await ctx.db.insert('personas', {
          userId: userId as never,
          name: 'User 1 Persona',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const personas = await asUser2.query(api.personas.list, {})
      expect(personas).toEqual([])
    })
  })

  describe('get', () => {
    it('returns null when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      const persona = await t.query(api.personas.get, { id: personaId })
      expect(persona).toBeNull()
    })

    it('returns null for other users persona', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      const persona = await asUser2.query(api.personas.get, { id: personaId })
      expect(persona).toBeNull()
    })

    it('returns persona for authenticated user', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'My Persona',
          description: 'A test persona',
          systemPrompt: 'Be awesome',
          isDefault: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      const persona = await asUser.query(api.personas.get, { id: personaId })
      expect(persona).not.toBeNull()
      expect(persona?.name).toBe('My Persona')
      expect(persona?.description).toBe('A test persona')
      expect(persona?.systemPrompt).toBe('Be awesome')
      expect(persona?.isDefault).toBe(true)
    })

    it('returns null for deleted persona', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await t.run(async (ctx) => {
        await ctx.db.delete(personaId)
      })

      const persona = await asUser.query(api.personas.get, { id: personaId })
      expect(persona).toBeNull()
    })
  })

  describe('getDefault', () => {
    it('returns null when not authenticated', async () => {
      const persona = await t.query(api.personas.getDefault, {})
      expect(persona).toBeNull()
    })

    it('returns null when user has no default persona', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)

      await t.run(async (ctx) => {
        await ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Non-default',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const persona = await asUser.query(api.personas.getDefault, {})
      expect(persona).toBeNull()
    })

    it('returns the default persona', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)

      await t.run(async (ctx) => {
        await ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Non-default',
          systemPrompt: 'Prompt 1',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        await ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Default One',
          systemPrompt: 'Prompt 2',
          isDefault: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const persona = await asUser.query(api.personas.getDefault, {})
      expect(persona?.name).toBe('Default One')
      expect(persona?.isDefault).toBe(true)
    })
  })

  describe('create', () => {
    it('throws when not authenticated', async () => {
      await expect(
        t.mutation(api.personas.create, {
          name: 'Test',
          systemPrompt: 'Prompt',
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('creates persona with required fields', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      const personaId = await asUser.mutation(api.personas.create, {
        name: 'My Persona',
        systemPrompt: 'Be helpful and concise',
      })

      const persona = await asUser.query(api.personas.get, { id: personaId })
      expect(persona?.name).toBe('My Persona')
      expect(persona?.systemPrompt).toBe('Be helpful and concise')
      expect(persona?.isDefault).toBe(false)
    })

    it('creates persona with optional description', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      const personaId = await asUser.mutation(api.personas.create, {
        name: 'Described Persona',
        description: 'A detailed description',
        systemPrompt: 'Prompt',
      })

      const persona = await asUser.query(api.personas.get, { id: personaId })
      expect(persona?.description).toBe('A detailed description')
    })

    it('creates persona as default', async () => {
      const { asUser } = await createAuthenticatedContext(t)

      const personaId = await asUser.mutation(api.personas.create, {
        name: 'Default Persona',
        systemPrompt: 'Prompt',
        isDefault: true,
      })

      const persona = await asUser.query(api.personas.get, { id: personaId })
      expect(persona?.isDefault).toBe(true)
    })

    it('unsets existing default when creating new default', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)

      const existingId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Old Default',
          systemPrompt: 'Prompt',
          isDefault: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await asUser.mutation(api.personas.create, {
        name: 'New Default',
        systemPrompt: 'Prompt',
        isDefault: true,
      })

      const oldDefault = await asUser.query(api.personas.get, { id: existingId })
      expect(oldDefault?.isDefault).toBe(false)

      const newDefault = await asUser.query(api.personas.getDefault, {})
      expect(newDefault?.name).toBe('New Default')
    })
  })

  describe('update', () => {
    it('throws when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await expect(
        t.mutation(api.personas.update, {
          id: personaId,
          name: 'Updated',
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('throws for other users persona', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await expect(
        asUser2.mutation(api.personas.update, {
          id: personaId,
          name: 'Updated',
        })
      ).rejects.toThrow('Persona not found')
    })

    it('throws for deleted persona', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await t.run(async (ctx) => {
        await ctx.db.delete(personaId)
      })

      await expect(
        asUser.mutation(api.personas.update, {
          id: personaId,
          name: 'Updated',
        })
      ).rejects.toThrow('Persona not found')
    })

    it('updates persona name', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Original',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await asUser.mutation(api.personas.update, {
        id: personaId,
        name: 'Updated Name',
      })

      const persona = await asUser.query(api.personas.get, { id: personaId })
      expect(persona?.name).toBe('Updated Name')
    })

    it('updates persona description', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await asUser.mutation(api.personas.update, {
        id: personaId,
        description: 'New description',
      })

      const persona = await asUser.query(api.personas.get, { id: personaId })
      expect(persona?.description).toBe('New description')
    })

    it('updates persona systemPrompt', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Old prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await asUser.mutation(api.personas.update, {
        id: personaId,
        systemPrompt: 'New prompt',
      })

      const persona = await asUser.query(api.personas.get, { id: personaId })
      expect(persona?.systemPrompt).toBe('New prompt')
    })

    it('sets persona as default and unsets existing default', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)

      const persona1Id = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Persona 1',
          systemPrompt: 'Prompt',
          isDefault: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )
      const persona2Id = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Persona 2',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await asUser.mutation(api.personas.update, {
        id: persona2Id,
        isDefault: true,
      })

      const persona1 = await asUser.query(api.personas.get, { id: persona1Id })
      const persona2 = await asUser.query(api.personas.get, { id: persona2Id })
      expect(persona1?.isDefault).toBe(false)
      expect(persona2?.isDefault).toBe(true)
    })
  })

  describe('remove', () => {
    it('throws when not authenticated', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await expect(t.mutation(api.personas.remove, { id: personaId })).rejects.toThrow(
        'Unauthorized'
      )
    })

    it('throws for other users persona', async () => {
      const { userId } = await createAuthenticatedContext(t)
      const { asUser: asUser2 } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await expect(
        asUser2.mutation(api.personas.remove, { id: personaId })
      ).rejects.toThrow('Persona not found')
    })

    it('throws for deleted persona', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await t.run(async (ctx) => {
        await ctx.db.delete(personaId)
      })

      await expect(
        asUser.mutation(api.personas.remove, { id: personaId })
      ).rejects.toThrow('Persona not found')
    })

    it('removes persona', async () => {
      const { asUser, userId } = await createAuthenticatedContext(t)
      const personaId = await t.run(async (ctx) =>
        ctx.db.insert('personas', {
          userId: userId as never,
          name: 'Test',
          systemPrompt: 'Prompt',
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )

      await asUser.mutation(api.personas.remove, { id: personaId })

      const persona = await asUser.query(api.personas.get, { id: personaId })
      expect(persona).toBeNull()
    })
  })
})
