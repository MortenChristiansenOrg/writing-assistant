import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('convex-url', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_example')
    vi.stubEnv('VITE_CONVEX_SITE_URL', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('converts .convex.cloud to .convex.site', async () => {
    vi.stubEnv('VITE_CONVEX_URL', 'https://test-project.convex.cloud')
    const { convexSiteUrl } = await import('../convex-url')
    expect(convexSiteUrl).toBe('https://test-project.convex.site')
  })

  it('handles prod URLs', async () => {
    vi.stubEnv('VITE_CONVEX_URL', 'https://my-prod-app.convex.cloud/')
    const { convexSiteUrl } = await import('../convex-url')
    expect(convexSiteUrl).toBe('https://my-prod-app.convex.site')
  })

  it('throws when URL is empty (fail-fast validation)', async () => {
    vi.stubEnv('VITE_CONVEX_URL', '')
    await expect(import('../convex-url')).rejects.toThrow('VITE_CONVEX_URL')
  })

  it('requires an explicit site URL outside Convex Cloud', async () => {
    vi.stubEnv('VITE_CONVEX_URL', 'https://localhost:3000')
    await expect(import('../convex-url')).rejects.toThrow(
      'VITE_CONVEX_SITE_URL',
    )
  })

  it('uses the explicit local HTTP action URL', async () => {
    vi.stubEnv('VITE_CONVEX_URL', 'http://127.0.0.1:3210')
    vi.stubEnv('VITE_CONVEX_SITE_URL', 'http://127.0.0.1:3211/')
    const { convexSiteUrl } = await import('../convex-url')
    expect(convexSiteUrl).toBe('http://127.0.0.1:3211')
  })
})
