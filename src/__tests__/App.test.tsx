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

vi.mock('@/pages/PrototypeToolsPage', () => ({
  PrototypeToolsPage: () => <div>Prototype tools page</div>,
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

describe('development prototype route', () => {
  it('renders through a Suspense fallback in development', async () => {
    window.history.replaceState({}, '', '/prototype/tools')

    render(<App isDevelopment />)

    expect(screen.getByText('Loading prototype…')).toBeInTheDocument()
    expect(await screen.findByText('Prototype tools page')).toBeInTheDocument()
  })

  it('is excluded when the production route set is used', () => {
    window.history.replaceState({}, '', '/prototype/tools')

    render(<App isDevelopment={false} />)

    expect(screen.queryByText('Prototype tools page')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading prototype…')).not.toBeInTheDocument()
  })
})
