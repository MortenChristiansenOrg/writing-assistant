import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PersonaManager } from '@/components/personas/PersonaManager'

const SAVE_DELAY = 500

export function ProjectPage() {
  const { projectId } = useParams()
  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId as Id<'projects'> } : 'skip'
  )
  const updateProject = useMutation(api.projects.update)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [initialized, setInitialized] = useState(false)
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (project && !initialized) {
      setName(project.name)
      setDescription(project.description ?? '')
      setInitialized(true)
    }
  }, [project, initialized])

  // Reset when projectId changes
  useEffect(() => {
    setInitialized(false)
  }, [projectId])

  const save = useCallback(
    (fields: { name?: string; description?: string }) => {
      if (!projectId) return
      if (saveRef.current) clearTimeout(saveRef.current)
      saveRef.current = setTimeout(() => {
        void updateProject({ id: projectId as Id<'projects'>, ...fields })
      }, SAVE_DELAY)
    },
    [projectId, updateProject]
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

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Project Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your project and manage project-specific personas
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name">Name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              save({ name: e.target.value })
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-description">Description</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              save({ description: e.target.value })
            }}
            placeholder="Brief description of this project"
            rows={3}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <PersonaManager projectId={projectId as Id<'projects'>} />
      </div>
    </div>
  )
}
