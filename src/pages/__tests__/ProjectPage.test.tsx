import { act, fireEvent, render, screen } from '@/test/test-utils'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { ProjectPage } from '../ProjectPage'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockProject,
  mockToastError,
  mockUpdateProject,
  projectId,
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
    useParams: () => ({ projectId }),
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
  toast: { error: mockToastError },
}))

describe('ProjectPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUpdateProject.mockReset()
    mockUpdateProject.mockResolvedValue(undefined)
    mockToastError.mockReset()
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
})
