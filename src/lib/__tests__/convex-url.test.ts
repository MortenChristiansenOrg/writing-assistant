import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('convex-url', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('converts .convex.cloud to .convex.site', async () => {
    vi.stubEnv('VITE_CONVEX_URL', 'https://test-project.convex.cloud')
    const { convexSiteUrl } = await import('../convex-url')
    expect(convexSiteUrl).toBe('https://test-project.convex.site')
  })

  it('handles prod URLs', async () => {
    vi.stubEnv('VITE_CONVEX_URL', 'https://my-prod-app.convex.cloud')
    const { convexSiteUrl } = await import('../convex-url')
    expect(convexSiteUrl).toBe('https://my-prod-app.convex.site')
  })

  it('throws when URL is empty (fail-fast validation)', async () => {
    vi.stubEnv('VITE_CONVEX_URL', '')
    await expect(import('../convex-url')).rejects.toThrow('VITE_CONVEX_URL')
  })

  it('handles URLs without .convex.cloud', async () => {
    vi.stubEnv('VITE_CONVEX_URL', 'https://localhost:3000')
    const { convexSiteUrl } = await import('../convex-url')
    expect(convexSiteUrl).toBe('https://localhost:3000')
  })
})
