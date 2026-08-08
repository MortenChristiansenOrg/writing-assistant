import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderMetadata } from 'ai'

describe('AI boundary security', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('CLIENT_ORIGIN', 'https://writing.example')
    vi.stubEnv(
      'CLIENT_PREVIEW_ORIGIN',
      'https://writing-assistant-*-morten.vercel.app',
    )
  })

  it('allows only previews belonging to the configured Vercel project', async () => {
    const { isAllowedOrigin } = await import('../../convex/httpUtils')

    expect(
      isAllowedOrigin(
        new Request('https://backend.example/ai/stream', {
          headers: {
            Origin: 'https://writing-assistant-a1b2c3-morten.vercel.app',
          },
        }),
      ),
    ).toBe(true)
    expect(
      isAllowedOrigin(
        new Request('https://backend.example/ai/stream', {
          headers: { Origin: 'https://other-project-a1b2c3-morten.vercel.app' },
        }),
      ),
    ).toBe(false)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows only the configured browser origin', async () => {
    const { isAllowedOrigin } = await import('../../convex/httpUtils')

    expect(
      isAllowedOrigin(
        new Request('https://backend.example/ai/stream', {
          headers: { Origin: 'https://writing.example' },
        }),
      ),
    ).toBe(true)
    expect(
      isAllowedOrigin(
        new Request('https://backend.example/ai/stream', {
          headers: { Origin: 'https://attacker.example' },
        }),
      ),
    ).toBe(false)
  })

  it('allows authorization and varies cached CORS responses by origin', async () => {
    const { corsHeaders } = await import('../../convex/httpUtils')
    const headers = new Headers(
      corsHeaders(
        new Request('https://backend.example/ai/stream', {
          headers: { Origin: 'https://writing.example' },
        }),
      ),
    )

    expect(headers.get('Access-Control-Allow-Origin')).toBe(
      'https://writing.example',
    )
    expect(headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    expect(headers.get('Vary')).toBe('Origin')
  })

  it('binds encrypted credentials to their Clerk identity', async () => {
    vi.stubEnv('CREDENTIAL_ENCRYPTION_KEY', btoa('x'.repeat(32)))
    const { decryptSecret, encryptSecret } = await import(
      '../../convex/model/secrets'
    )
    const secret = 'sk-or-test-secret-that-must-not-leak'
    const encrypted = await encryptSecret(secret, 'issuer|user_a')

    expect(encrypted.ciphertext).not.toContain(secret)
    await expect(decryptSecret(encrypted, 'issuer|user_b')).rejects.toThrow()
    await expect(decryptSecret(encrypted, 'issuer|user_a')).resolves.toBe(secret)
  })
})

describe('OpenRouter usage accounting', () => {
  it('records the billed provider cost before the upstream fallback', async () => {
    const { openRouterCost } = await import('../../convex/ai')
    const metadata = {
      openrouter: {
        usage: {
          cost: 0.42,
          costDetails: { upstreamInferenceCost: 0.21 },
        },
      },
    } as ProviderMetadata

    expect(openRouterCost(metadata)).toBe(0.42)
  })

  it('uses upstream inference cost only when billed cost is absent', async () => {
    const { openRouterCost } = await import('../../convex/ai')
    const metadata = {
      openrouter: {
        usage: { costDetails: { upstreamInferenceCost: 0.21 } },
      },
    } as ProviderMetadata

    expect(openRouterCost(metadata)).toBe(0.21)
  })
})
