import { useCompletion } from '@ai-sdk/react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { toast } from 'sonner'
import { useCallback, useState } from 'react'
import { convexSiteUrl } from '@/lib/convex-url'
import { useConvexHttpToken } from './useConvexHttpToken'

export type AIAction =
  | 'rewrite'
  | 'shorter'
  | 'longer'
  | 'formal'
  | 'casual'
  | 'fix_grammar'

interface UseAIOptions {
  onComplete?: (result: string) => void
  onError?: (error: Error) => void
}

export function useAI(options: UseAIOptions = {}) {
  const settings = useQuery(api.userSettings.get)
  const getConvexHttpToken = useConvexHttpToken()
  const [isStreaming, setIsStreaming] = useState(false)
  const authenticatedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getConvexHttpToken()
      const headers = new Headers(init?.headers)
      headers.set('Authorization', `Bearer ${token}`)
      return await fetch(input, { ...init, headers })
    },
    [getConvexHttpToken],
  )

  const {
    completion,
    complete,
    isLoading,
    error,
    stop,
    setCompletion,
  } = useCompletion({
    api: `${convexSiteUrl}/ai/stream`,
    fetch: authenticatedFetch,
    streamProtocol: 'text',
    onFinish: (_prompt, result) => {
      setIsStreaming(false)

      // Detect backend stream errors
      const errorMarker = '__AI_ERROR__:'
      const errorOffset = result.indexOf(errorMarker)
      if (errorOffset >= 0) {
        const msg = result.slice(errorOffset + errorMarker.length)
        setCompletion('')
        toast.error(msg, { duration: Infinity })
        options.onError?.(new Error(msg))
        return
      }

      // Detect empty response
      if (!result.trim()) {
        setCompletion('')
        toast.error('No response from AI', { duration: Infinity })
        options.onError?.(new Error('No response from AI'))
        return
      }

      options.onComplete?.(result)

    },
    onError: (err) => {
      setIsStreaming(false)
      setCompletion('')
      const error = err instanceof Error ? err : new Error('AI request failed')
      toast.error(error.message, { duration: Infinity })
      options.onError?.(error)
    },
  })

  const runAction = async (
    action: AIAction,
    text: string,
    persona?: string,
    customPrompt?: string
  ) => {
    if (!settings?.hasOpenRouterKey) {
      const error = new Error('Please add your OpenRouter API key in settings')
      toast.error(error.message)
      options.onError?.(error)
      return
    }

    setIsStreaming(true)
    setCompletion('')

    try {
      const body: Record<string, string | undefined> = {
        action,
        text,
        persona,
        model: settings?.defaultModel ?? 'anthropic/claude-sonnet-5',
      }
      if (customPrompt) body.customPrompt = customPrompt

      await complete(text, { body })
    } catch (err) {
      setIsStreaming(false)
      throw err
    }
  }

  return {
    completion,
    isLoading: isLoading || isStreaming,
    error,
    runAction,
    stop,
    clear: () => setCompletion(''),
    hasApiKey: Boolean(settings?.hasOpenRouterKey),
  }
}
