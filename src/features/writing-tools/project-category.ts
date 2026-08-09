import type { ProjectCategoryId } from './types'

const STORAGE_PREFIX = 'writing-assistant:project-category:'

export function readProjectCategory(projectId: string | undefined): ProjectCategoryId {
  if (!projectId || typeof window === 'undefined') return 'general'
  let value: string | null
  try {
    value = window.localStorage.getItem(`${STORAGE_PREFIX}${projectId}`)
  } catch {
    return 'general'
  }
  if (value === 'fiction' || value === 'screenplay' || value === 'poetry') return value
  return 'general'
}

export function writeProjectCategory(
  projectId: string,
  category: ProjectCategoryId,
): void {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, category)
  } catch {
    // The POC can still update mounted UI when storage is blocked or unavailable.
  }
  window.dispatchEvent(
    new CustomEvent('project-category-changed', {
      detail: { projectId, category },
    }),
  )
}
