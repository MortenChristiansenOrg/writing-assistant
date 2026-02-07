import { useCompletion } from '@ai-sdk/react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { toast } from 'sonner'
import { useState } from 'react'
import { convexSiteUrl } from '@/lib/convex-url'

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
  const recordSpending = useMutation(api.spending.record)
  const [isStreaming, setIsStreaming] = useState(false)

  const {
    completion,
    complete,
    isLoading,
    error,
    stop,
    setCompletion,
  } = useCompletion({
    api: `${convexSiteUrl}/ai/stream`,
    streamProtocol: 'text',
    onFinish: (_prompt, result) => {
      setIsStreaming(false)

      // Detect backend stream errors
      if (result.startsWith('__AI_ERROR__:')) {
        const msg = result.slice('__AI_ERROR__:'.length)
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

      // Estimate token usage (rough approximation)
      const inputTokens = Math.ceil(result.length / 4)
      const outputTokens = Math.ceil(result.length / 4)

      recordSpending({
        model: settings?.defaultModel ?? 'anthropic/claude-3.5-sonnet',
        inputTokens,
        outputTokens,
      }).catch(console.error)
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
    if (!settings?.vaultKeyId) {
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
        model: settings?.defaultModel ?? 'anthropic/claude-3.5-sonnet',
        apiKey: settings.vaultKeyId,
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
    hasApiKey: !!settings?.vaultKeyId,
  }
}
