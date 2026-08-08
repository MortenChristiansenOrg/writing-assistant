import { render, screen } from '@/test/test-utils'
import App from '../App'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { ensureCurrentUser } = vi.hoisted(() => ({
  ensureCurrentUser: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isLoading: false, isAuthenticated: true }),
}))

vi.mock('convex/react', async () => {
  const actual = await vi.importActual<typeof import('convex/react')>(
    'convex/react',
  )
  return {
    ...actual,
    useQuery: () => null,
    useMutation: () => ensureCurrentUser,
  }
})

vi.mock('@/pages/AppLayout', () => ({
  AppLayout: () => <div>Application</div>,
}))

describe('App account provisioning', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/app')
    ensureCurrentUser.mockReset()
  })

  it('shows an actionable error when user provisioning fails', async () => {
    ensureCurrentUser.mockRejectedValue(new Error('backend unavailable'))

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not initialize your account/i,
    )
    expect(ensureCurrentUser).toHaveBeenCalledTimes(1)
  })
})
