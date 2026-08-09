import { describe, expect, it, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/test/test-utils'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '../AppSidebar'
import type { Id } from '../../../../convex/_generated/dataModel'

const {
  mockCreateProject,
  mockCreateDocument,
  mockNavigate,
  mockUseMutation,
  mockUseQuery,
  mockWriteProjectCategory,
} = vi.hoisted(() => ({
  mockCreateProject: vi.fn(),
  mockCreateDocument: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseQuery: vi.fn(),
  mockWriteProjectCategory: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useMatch: () => null,
  }
})

vi.mock('convex/react', async () => {
  const actual = await vi.importActual<typeof import('convex/react')>('convex/react')
  return {
    ...actual,
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
  }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}))

vi.mock('@/features/writing-tools/project-category', () => ({
  writeProjectCategory: mockWriteProjectCategory,
}))

vi.mock('@/features/writing-tools/ProjectCategorySelect', () => ({
  ProjectCategorySelect: ({
    value,
    onValueChange,
  }: {
    value: string
    onValueChange: (value: 'general' | 'fiction' | 'screenplay' | 'poetry') => void
  }) => (
    <select
      aria-label="Project category"
      value={value}
      onChange={(event) => onValueChange(event.target.value as 'general' | 'fiction' | 'screenplay' | 'poetry')}
    >
      <option value="general">General writing</option>
      <option value="screenplay">Screenplay</option>
    </select>
  ),
}))

describe('AppSidebar project creation', () => {
  beforeEach(() => {
    mockCreateProject.mockReset()
    mockCreateDocument.mockReset()
    mockNavigate.mockReset()
    mockWriteProjectCategory.mockReset()
    mockUseQuery.mockReset()
    mockUseMutation.mockReset()
    mockUseQuery.mockReturnValue([])
    mockUseMutation.mockReturnValue(mockCreateProject)
  })

  it('persists a non-default category and resets it after creation', async () => {
    const user = userEvent.setup()
    const createdId = 'created-project' as Id<'projects'>
    mockCreateProject.mockResolvedValue(createdId)

    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    )

    await user.click(screen.getByTitle('New Project'))
    await user.type(screen.getByLabelText('Name'), 'Night train')
    await user.selectOptions(screen.getByLabelText('Project category'), 'screenplay')
    await user.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({ name: 'Night train' })
      expect(mockWriteProjectCategory).toHaveBeenCalledWith(createdId, 'screenplay')
    })

    await user.click(screen.getByTitle('New Project'))
    expect(screen.getByLabelText('Project category')).toHaveValue('general')
  })
})
