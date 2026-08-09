import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { useState, type ReactElement } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PersonaManager } from '@/components/personas/PersonaManager'
import { useSerializedAutosave } from '@/hooks/useSerializedAutosave'
import { toast } from 'sonner'
import { ProjectCategorySelect } from '@/features/writing-tools/ProjectCategorySelect'
import { readProjectCategory, writeProjectCategory } from '@/features/writing-tools/project-category'
import type { ProjectCategoryId } from '@/features/writing-tools/types'

const SAVE_DELAY = 500

export function ProjectPage(): ReactElement {
  const { projectId } = useParams()
  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId as Id<'projects'> } : 'skip'
  )
  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    )
  }

  if (project === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (project === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  if (project._id !== projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <LoadedProjectPage
      key={projectId}
      projectId={projectId as Id<'projects'>}
      project={project}
    />
  )
}

interface ProjectUpdate {
  id: Id<'projects'>
  name?: string
  description?: string
}

function mergeProjectUpdates(
  current: ProjectUpdate,
  next: ProjectUpdate
): ProjectUpdate {
  return { ...current, ...next }
}

function LoadedProjectPage({
  projectId,
  project,
}: {
  projectId: Id<'projects'>
  project: Doc<'projects'>
}): ReactElement {
  const updateProject = useMutation(api.projects.update)
  const [name, setName] = useState(() => project.name)
  const [description, setDescription] = useState(
    () => project.description ?? ''
  )
  const [category, setCategory] = useState<ProjectCategoryId>(() => readProjectCategory(projectId))

  const autosave = useSerializedAutosave<ProjectUpdate>({
    delay: SAVE_DELAY,
    merge: mergeProjectUpdates,
    save: async (value) => {
      await updateProject(value)
    },
    onError: (error) => {
      toast.error('Failed to save project')
      console.error(error)
    },
  })

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-2xl font-semibold">Project Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your project and manage project-specific personas
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                autosave.schedule({ id: projectId, name: e.target.value })
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                autosave.schedule({
                  id: projectId,
                  description: e.target.value,
                })
              }}
              placeholder="Brief description of this project"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-category">Category</Label>
            <ProjectCategorySelect
              id="project-category"
              value={category}
              onValueChange={(next) => {
                setCategory(next)
                writeProjectCategory(projectId, next)
                toast.success('Project tools updated')
              }}
            />
            <p className="text-xs text-muted-foreground">Changing category updates the available and recommended tools. It does not alter your writing.</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <PersonaManager projectId={projectId} />
        </div>
      </div>
    </div>
  )
}
