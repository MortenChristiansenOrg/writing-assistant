import { AppLayout } from '../AppLayout'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/sidebar/AppSidebar', async () => {
  const { Sidebar } = await vi.importActual<
    typeof import('@/components/ui/sidebar')
  >('@/components/ui/sidebar')

  return {
    AppSidebar: () => (
      <Sidebar>
        <div>Project navigation</div>
      </Sidebar>
    ),
  }
})

describe('AppLayout mobile navigation', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('opens the project sidebar from the persistent mobile trigger', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Project navigation')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))

    expect(await screen.findByText('Project navigation')).toBeVisible()
  })

  it('opens the project sidebar from the welcome action', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout />
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole('button', { name: 'Browse projects' }),
    )

    expect(await screen.findByText('Project navigation')).toBeVisible()
  })
})
