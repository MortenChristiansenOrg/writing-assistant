import { beforeEach, describe, expect, it } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import { createAuthenticatedContext, createTestContext } from './setup'

describe('Clerk identity and encrypted settings', () => {
  let t: ReturnType<typeof createTestContext>

  beforeEach(() => {
    t = createTestContext()
  })

  it('requires an authenticated Clerk identity to create a local user', async () => {
    await expect(t.mutation(api.users.ensureCurrent, {})).rejects.toThrow(
      'Unauthorized',
    )
    await expect(t.query(api.users.current, {})).resolves.toBeNull()
  })

  it('creates and returns the user for the verified token only', async () => {
    const issuer = 'https://clerk.test'
    const subject = 'user_new'
    const tokenIdentifier = `${issuer}|${subject}`
    const asUser = t.withIdentity({
      issuer,
      subject,
      tokenIdentifier,
      email: 'writer@example.com',
    })

    const userId = await asUser.mutation(api.users.ensureCurrent, {})
    const current = await asUser.query(api.users.current, {})
    expect(current?._id).toBe(userId)
    expect(current?.email).toBe('writer@example.com')

    const other = t.withIdentity({
      issuer,
      subject: 'user_other',
      tokenIdentifier: `${issuer}|user_other`,
    })
    await expect(other.query(api.users.current, {})).resolves.toBeNull()
  })

  it('never exposes encrypted OpenRouter credential fields publicly', async () => {
    const { asUser, tokenIdentifier } = await createAuthenticatedContext(t)
    await t.mutation(internal.userSettings.storeEncryptedOpenRouterKey, {
      tokenIdentifier,
      ciphertext: 'ciphertext-only',
      iv: 'unique-iv',
      version: 1,
    })

    const settings = await asUser.query(api.userSettings.get, {})
    expect(settings?.hasOpenRouterKey).toBe(true)
    expect(settings).not.toHaveProperty('openRouterKeyCiphertext')
    expect(settings).not.toHaveProperty('openRouterKeyIv')
    expect(settings).not.toHaveProperty('openRouterKeyVersion')
  })

  it('isolates credential status and deletion by user', async () => {
    const first = await createAuthenticatedContext(t)
    const second = await createAuthenticatedContext(t)
    await t.mutation(internal.userSettings.storeEncryptedOpenRouterKey, {
      tokenIdentifier: first.tokenIdentifier,
      ciphertext: 'first-ciphertext',
      iv: 'first-iv',
      version: 1,
    })
    await t.mutation(internal.userSettings.storeEncryptedOpenRouterKey, {
      tokenIdentifier: second.tokenIdentifier,
      ciphertext: 'second-ciphertext',
      iv: 'second-iv',
      version: 1,
    })

    await first.asUser.mutation(api.userSettings.clearApiKey, {})
    expect(
      (await first.asUser.query(api.userSettings.get, {}))?.hasOpenRouterKey,
    ).toBe(false)
    expect(
      (await second.asUser.query(api.userSettings.get, {}))?.hasOpenRouterKey,
    ).toBe(true)
  })
})
