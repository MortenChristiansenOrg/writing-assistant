import { useCallback, useEffect, useMemo, useState } from 'react'

interface SerializedAutosaveOptions<T> {
  save: (value: T) => Promise<void>
  delay: number
  merge?: (current: T, next: T) => T
  onError?: (error: unknown) => void
}

/**
 * Debounces pending values while keeping every started save in strict order.
 * A later save can therefore never finish before an earlier save and overwrite it.
 */
export class SerializedAutosave<T> {
  private pending: T | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  private saveChain: Promise<void> = Promise.resolve()
  private saveValue: (value: T) => Promise<void>
  private readonly delay: number
  private mergeValues: ((current: T, next: T) => T) | undefined
  private handleError: (error: unknown) => void

  constructor(
    saveValue: (value: T) => Promise<void>,
    delay: number,
    mergeValues: ((current: T, next: T) => T) | undefined,
    handleError: (error: unknown) => void
  ) {
    this.saveValue = saveValue
    this.delay = delay
    this.mergeValues = mergeValues
    this.handleError = handleError
  }

  updateHandlers(
    saveValue: (value: T) => Promise<void>,
    mergeValues: ((current: T, next: T) => T) | undefined,
    handleError: (error: unknown) => void
  ): void {
    this.saveValue = saveValue
    this.mergeValues = mergeValues
    this.handleError = handleError
  }

  schedule(value: T): void {
    this.pending =
      this.pending === undefined || !this.mergeValues
        ? value
        : this.mergeValues(this.pending, value)

    if (this.timer !== undefined) {
      clearTimeout(this.timer)
    }

    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.flush()
    }, this.delay)
  }

  flush(): Promise<void> {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }

    if (this.pending === undefined) {
      return this.saveChain
    }

    const value = this.pending
    this.pending = undefined

    const operation = this.saveChain
      .catch(() => undefined)
      .then(() => this.saveValue(value))

    this.saveChain = operation
    void operation.catch((error: unknown) => this.handleError(error))
    return operation
  }
}

export function useSerializedAutosave<T>({
  save,
  delay,
  merge,
  onError,
}: SerializedAutosaveOptions<T>): {
  schedule: (value: T) => void
  flush: () => Promise<void>
} {
  const [autosave] = useState(
    () =>
      new SerializedAutosave<T>(
        save,
        delay,
        merge,
        (error) => onError?.(error)
      )
  )

  useEffect(() => {
    autosave.updateHandlers(save, merge, (error) => onError?.(error))
  }, [autosave, merge, onError, save])

  useEffect(
    () => () => {
      void autosave.flush()
    },
    [autosave]
  )

  const schedule = useCallback(
    (value: T) => {
      autosave.schedule(value)
    },
    [autosave]
  )

  const flush = useCallback(() => autosave.flush(), [autosave])

  return useMemo(() => ({ schedule, flush }), [flush, schedule])
}
