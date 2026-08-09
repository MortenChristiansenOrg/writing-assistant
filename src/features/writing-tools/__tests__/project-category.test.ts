import { afterEach, describe, expect, it, vi } from 'vitest'
import { readProjectCategory, writeProjectCategory } from '../project-category'

describe('project category prototype storage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to general when browser storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(readProjectCategory('project-one')).toBe('general')
  })

  it('still notifies mounted UI when browser storage cannot be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const listener = vi.fn<(event: Event) => void>()
    window.addEventListener('project-category-changed', listener)

    writeProjectCategory('project-one', 'poetry')

    expect(listener).toHaveBeenCalledTimes(1)
    const event = listener.mock.calls[0]?.[0] as CustomEvent
    expect(event.detail).toEqual({ projectId: 'project-one', category: 'poetry' })
    window.removeEventListener('project-category-changed', listener)
  })
})
