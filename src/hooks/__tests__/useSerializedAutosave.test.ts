import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SerializedAutosave,
  useSerializedAutosave,
} from '../useSerializedAutosave'

interface Fields {
  title?: string
  description?: string
}

function mergeFields(current: Fields, next: Fields): Fields {
  return { ...current, ...next }
}

describe('SerializedAutosave', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces and merges pending fields without dropping either edit', async () => {
    vi.useFakeTimers()
    const save = vi.fn<(value: Fields) => Promise<void>>().mockResolvedValue()
    const autosave = new SerializedAutosave(save, 500, mergeFields, vi.fn())

    autosave.schedule({ title: 'New title' })
    autosave.schedule({ description: 'New description' })
    await vi.advanceTimersByTimeAsync(500)

    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith({
      title: 'New title',
      description: 'New description',
    })
  })

  it('serializes saves so an older write cannot finish after a newer write', async () => {
    vi.useFakeTimers()
    let resolveFirst: (() => void) | undefined
    const firstSave = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    const save = vi
      .fn<(value: string) => Promise<void>>()
      .mockImplementationOnce(() => firstSave)
      .mockResolvedValueOnce()
    const autosave = new SerializedAutosave(save, 500, undefined, vi.fn())

    autosave.schedule('first')
    await vi.advanceTimersByTimeAsync(500)
    autosave.schedule('second')
    await vi.advanceTimersByTimeAsync(500)

    expect(save).toHaveBeenCalledTimes(1)
    resolveFirst?.()
    await firstSave
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save.mock.calls).toEqual([['first'], ['second']])
  })

  it('continues with the next save after a failed write', async () => {
    vi.useFakeTimers()
    const failure = new Error('offline')
    const onError = vi.fn()
    const save = vi
      .fn<(value: string) => Promise<void>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce()
    const autosave = new SerializedAutosave(save, 500, undefined, onError)

    autosave.schedule('first')
    await vi.advanceTimersByTimeAsync(500)
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(failure))
    autosave.schedule('second')
    await vi.advanceTimersByTimeAsync(500)
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2))

    expect(save.mock.calls).toEqual([['first'], ['second']])
  })
})

describe('useSerializedAutosave', () => {
  it('flushes the last pending value when its owner unmounts', async () => {
    const save = vi.fn<(value: string) => Promise<void>>().mockResolvedValue()
    const { result, unmount } = renderHook(() =>
      useSerializedAutosave({ save, delay: 10_000 })
    )

    act(() => result.current.schedule('pending route edit'))
    unmount()

    await waitFor(() => {
      expect(save).toHaveBeenCalledWith('pending route edit')
    })
  })
})
