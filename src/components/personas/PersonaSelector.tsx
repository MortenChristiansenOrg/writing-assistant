import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User } from 'lucide-react'

interface Persona {
  _id: Id<'personas'>
  name: string
}

interface PersonaSelectorProps {
  value: Id<'personas'> | null
  onChange: (personaId: Id<'personas'> | null) => void
}

export function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  const personas = useQuery(api.personas.list) as Persona[] | undefined

  if (!personas || personas.length === 0) {
    return null
  }

  return (
    <Select
      value={value ?? 'none'}
      onValueChange={(v) =>
        onChange(v === 'none' ? null : (v as Id<'personas'>))
      }
    >
      <SelectTrigger className="w-40">
        <User className="mr-2 h-4 w-4" />
        <SelectValue placeholder="No persona" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No persona</SelectItem>
        {personas.map((persona: Persona) => (
          <SelectItem key={persona._id} value={persona._id}>
            {persona.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
