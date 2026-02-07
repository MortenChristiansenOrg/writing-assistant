import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, User, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { MODELS } from '@/lib/models'

interface Persona {
  _id: Id<'personas'>
  name: string
  description?: string
  systemPrompt: string
  isDefault: boolean
  model?: string
  projectId?: Id<'projects'>
}

interface PersonaFormData {
  name: string
  description: string
  systemPrompt: string
  isDefault: boolean
  model: string
}

const defaultFormData: PersonaFormData = {
  name: '',
  description: '',
  systemPrompt: '',
  isDefault: false,
  model: '',
}

interface PersonaManagerProps {
  projectId?: Id<'projects'>
}

export function PersonaManager({ projectId }: PersonaManagerProps = {}) {
  const personas = useQuery(
    api.personas.listForProject,
    projectId ? { projectId } : {}
  ) as Persona[] | undefined
  const createPersona = useMutation(api.personas.create)
  const updatePersona = useMutation(api.personas.update)
  const deletePersona = useMutation(api.personas.remove)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<'personas'> | null>(null)
  const [formData, setFormData] = useState<PersonaFormData>(defaultFormData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.systemPrompt.trim()) {
      toast.error('Name and system prompt are required')
      return
    }

    try {
      const { model: rawModel, ...rest } = formData
      const base = rawModel ? { ...rest, model: rawModel } : rest
      if (editingId) {
        await updatePersona({ id: editingId, ...base })
        toast.success('Persona updated')
      } else {
        const createArgs = projectId ? { ...base, projectId } : base
        await createPersona(createArgs)
        toast.success('Persona created')
      }
      setDialogOpen(false)
      setEditingId(null)
      setFormData(defaultFormData)
    } catch {
      toast.error('Failed to save persona')
    }
  }

  const handleEdit = (persona: NonNullable<typeof personas>[number]) => {
    setEditingId(persona._id)
    setFormData({
      name: persona.name,
      description: persona.description ?? '',
      systemPrompt: persona.systemPrompt,
      isDefault: persona.isDefault,
      model: persona.model ?? '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: Id<'personas'>) => {
    try {
      await deletePersona({ id })
      toast.success('Persona deleted')
    } catch {
      toast.error('Failed to delete persona')
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingId(null)
    setFormData(defaultFormData)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Personas</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Persona
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Persona' : 'Create Persona'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Professional Editor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of this persona"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  placeholder="You are a professional editor who..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model (optional)</Label>
                <Select
                  value={formData.model || 'default'}
                  onValueChange={(v) =>
                    setFormData({ ...formData, model: v === 'default' ? '' : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Use account default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use account default</SelectItem>
                    {MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isDefault">Set as default</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {personas?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No personas yet. Create one to customize AI behavior.
          </p>
        )}
        {personas?.map((persona: Persona) => {
          const isGlobal = projectId && !persona.projectId
          return (
            <Card key={persona._id} className={isGlobal ? 'border-dashed border-muted-foreground/30 bg-muted/50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <CardTitle className="text-base">{persona.name}</CardTitle>
                    {isGlobal && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Globe className="h-3 w-3" />
                        Global
                      </Badge>
                    )}
                    {persona.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    {persona.model && (
                      <Badge variant="outline" className="text-[10px]">
                        {MODELS.find((m) => m.id === persona.model)?.name ?? persona.model}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(persona)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDelete(persona._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {persona.description && (
                  <CardDescription>{persona.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {persona.systemPrompt}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
