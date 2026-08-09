import { getProjectCategory, PROJECT_CATEGORIES } from './catalog'
import type { ProjectCategoryId } from './types'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProjectCategorySelectProps {
  value: ProjectCategoryId
  onValueChange: (value: ProjectCategoryId) => void
  id?: string
}

export function ProjectCategorySelect({
  value,
  onValueChange,
  id,
}: ProjectCategorySelectProps) {
  const selected = getProjectCategory(value)

  return (
    <div className="flex flex-col gap-2">
      <Select value={value} onValueChange={(next) => onValueChange(next as ProjectCategoryId)}>
        <SelectTrigger id={id} className="min-h-11 w-full sm:min-h-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Project category</SelectLabel>
            {PROJECT_CATEGORIES.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <div className="rounded-lg border bg-muted/40 p-3">
        <p className="text-sm font-medium">{selected.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">Examples: {selected.examples}</p>
      </div>
    </div>
  )
}
