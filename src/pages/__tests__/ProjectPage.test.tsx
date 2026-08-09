import { act, fireEvent, render, screen } from '@/test/test-utils'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { ProjectPage } from '../ProjectPage'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockProject,
  mockToastError,
  mockToastSuccess,
  mockUpdateProject,
  mockReadProjectCategory,
  mockWriteProjectCategory,
  projectId,
  routeState,
} = vi.hoisted(() => {
  const id = 'project-test' as Id<'projects'>
  return {
    projectId: id,
    mockProject: {
      _id: id,
      _creationTime: 1,
      userId: 'user-test' as Id<'users'>,
      name: 'Original name',
      description: 'Original description',
      createdAt: 1,
      updatedAt: 1,
    } satisfies Doc<'projects'>,
    mockToastError: vi.fn(),
    mockToastSuccess: vi.fn<(message: string) => void>(),
    mockReadProjectCategory: vi.fn<
      (projectId: string) => 'general' | 'fiction' | 'screenplay' | 'poetry'
    >(() => 'general'),
    mockWriteProjectCategory: vi.fn<
      (
        projectId: string,
        category: 'general' | 'fiction' | 'screenplay' | 'poetry',
      ) => void
    >(),
    routeState: { projectId: id },
    mockUpdateProject: vi.fn<
      (update: {
        id: Id<'projects'>
        name?: string
        description?: string
      }) => Promise<void>
    >(),
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return {
    ...actual,
    useParams: () => ({ projectId: routeState.projectId }),
  }
})

vi.mock('convex/react', async () => {
  const actual = await vi.importActual<typeof import('convex/react')>(
    'convex/react',
  )
  return {
    ...actual,
    useQuery: () => mockProject,
    useMutation: () => mockUpdateProject,
  }
})

vi.mock('@/components/personas/PersonaManager', () => ({
  PersonaManager: () => <div>Personas</div>,
}))

vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: mockToastSuccess },
}))

vi.mock('@/features/writing-tools/project-category', () => ({
  readProjectCategory: mockReadProjectCategory,
  writeProjectCategory: mockWriteProjectCategory,
}))

vi.mock('@/features/writing-tools/ProjectCategorySelect', () => ({
  ProjectCategorySelect: ({
    value,
    onValueChange,
    id,
  }: {
    value: string
    onValueChange: (value: 'general' | 'fiction' | 'screenplay' | 'poetry') => void
    id?: string
  }) => (
    <select
      id={id}
      aria-label="Project category"
      value={value}
      onChange={(event) => onValueChange(event.target.value as 'general' | 'fiction' | 'screenplay' | 'poetry')}
    >
      <option value="general">General writing</option>
      <option value="fiction">Fiction</option>
      <option value="screenplay">Screenplay</option>
      <option value="poetry">Poetry</option>
    </select>
  ),
}))

describe('ProjectPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUpdateProject.mockReset()
    mockUpdateProject.mockResolvedValue(undefined)
    mockToastError.mockReset()
    mockToastSuccess.mockReset()
    mockReadProjectCategory.mockReset()
    mockReadProjectCategory.mockReturnValue('general')
    mockWriteProjectCategory.mockReset()
    routeState.projectId = projectId
    mockProject._id = projectId
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('merges rapid name and description edits into one save', async () => {
    render(<ProjectPage />)

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'New name' },
    })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'New description' },
    })

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(mockUpdateProject).toHaveBeenCalledTimes(1)
    expect(mockUpdateProject).toHaveBeenCalledWith({
      id: projectId,
      name: 'New name',
      description: 'New description',
    })
  })

  it('reports a failed save without dropping later edits', async () => {
    const saveError = new Error('save failed')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockUpdateProject
      .mockRejectedValueOnce(saveError)
      .mockResolvedValueOnce(undefined)
    render(<ProjectPage />)

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'First edit' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(mockToastError).toHaveBeenCalledWith('Failed to save project')

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Second edit' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(mockUpdateProject).toHaveBeenLastCalledWith({
      id: projectId,
      name: 'Second edit',
    })
  })

  it('flushes pending edits when navigation unmounts the page', async () => {
    const view = render(<ProjectPage />)

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Pending navigation edit' },
    })
    view.unmount()

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockUpdateProject).toHaveBeenCalledWith({
      id: projectId,
      description: 'Pending navigation edit',
    })
  })

  it('hydrates and persists the project category', () => {
    mockReadProjectCategory.mockReturnValue('fiction')
    render(<ProjectPage />)

    const selector = screen.getByLabelText('Project category')
    expect(selector).toHaveValue('fiction')

    fireEvent.change(selector, { target: { value: 'screenplay' } })

    expect(selector).toHaveValue('screenplay')
    expect(mockWriteProjectCategory).toHaveBeenCalledWith(projectId, 'screenplay')
    expect(mockToastSuccess).toHaveBeenCalledWith('Project tools updated')
  })

  it('loads the stored category again when switching projects', () => {
    const secondProjectId = 'project-second' as Id<'projects'>
    mockReadProjectCategory.mockImplementation((id) =>
      id === projectId ? 'fiction' : 'poetry',
    )
    const view = render(<ProjectPage />)
    expect(screen.getByLabelText('Project category')).toHaveValue('fiction')

    routeState.projectId = secondProjectId
    mockProject._id = secondProjectId
    view.rerender(<ProjectPage />)

    expect(screen.getByLabelText('Project category')).toHaveValue('poetry')
    expect(mockReadProjectCategory).toHaveBeenLastCalledWith(secondProjectId)
  })
})
