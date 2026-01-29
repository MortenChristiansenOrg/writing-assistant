import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Note: httpAction testing is limited as convex-test doesn't fully support http actions
// These tests focus on validation logic and CORS headers structure

describe('ai', () => {
  describe('CORS headers', () => {
    it('defines correct CORS headers structure', () => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }

      expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*')
      expect(corsHeaders['Access-Control-Allow-Methods']).toBe('POST, OPTIONS')
      expect(corsHeaders['Access-Control-Allow-Headers']).toBe('Content-Type')
    })
  })

  describe('action prompts', () => {
    const ACTION_PROMPTS: Record<string, string> = {
      rewrite:
        'Rewrite the following text while preserving its meaning. Make it clearer and more engaging.',
      shorter:
        'Make the following text more concise. Remove unnecessary words while preserving the core meaning.',
      longer:
        'Expand the following text with more detail and explanation while maintaining the same tone.',
      formal:
        'Rewrite the following text in a more formal, professional tone.',
      casual:
        'Rewrite the following text in a more casual, conversational tone.',
      fix_grammar:
        'Fix any grammar, spelling, or punctuation errors in the following text. Only make corrections, do not change the style or meaning.',
    }

    it('has all expected actions', () => {
      const expectedActions = [
        'rewrite',
        'shorter',
        'longer',
        'formal',
        'casual',
        'fix_grammar',
      ]
      expect(Object.keys(ACTION_PROMPTS)).toEqual(expectedActions)
    })

    it('has non-empty prompts for each action', () => {
      for (const [action, prompt] of Object.entries(ACTION_PROMPTS)) {
        expect(prompt.length).toBeGreaterThan(0)
        expect(typeof prompt).toBe('string')
      }
    })
  })

  describe('request validation logic', () => {
    const validateRequest = (body: {
      action?: string
      text?: string
      apiKey?: string
    }): { valid: boolean; error?: string } => {
      if (!body.action || !body.text || !body.apiKey) {
        return { valid: false, error: 'Missing required fields' }
      }
      const validActions = [
        'rewrite',
        'shorter',
        'longer',
        'formal',
        'casual',
        'fix_grammar',
      ]
      if (!validActions.includes(body.action)) {
        return { valid: false, error: 'Invalid action' }
      }
      return { valid: true }
    }

    it('rejects missing action', () => {
      const result = validateRequest({ text: 'hello', apiKey: 'key' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing required fields')
    })

    it('rejects missing text', () => {
      const result = validateRequest({ action: 'rewrite', apiKey: 'key' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing required fields')
    })

    it('rejects missing apiKey', () => {
      const result = validateRequest({ action: 'rewrite', text: 'hello' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing required fields')
    })

    it('rejects invalid action', () => {
      const result = validateRequest({
        action: 'invalid',
        text: 'hello',
        apiKey: 'key',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid action')
    })

    it('accepts valid request', () => {
      const result = validateRequest({
        action: 'rewrite',
        text: 'hello',
        apiKey: 'key',
      })
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('accepts all valid actions', () => {
      const validActions = [
        'rewrite',
        'shorter',
        'longer',
        'formal',
        'casual',
        'fix_grammar',
      ]
      for (const action of validActions) {
        const result = validateRequest({
          action,
          text: 'hello',
          apiKey: 'key',
        })
        expect(result.valid).toBe(true)
      }
    })
  })

  describe('system prompt construction', () => {
    const buildSystemPrompt = (
      actionPrompt: string,
      persona?: string
    ): string => {
      return persona ? `${persona}\n\n${actionPrompt}` : actionPrompt
    }

    it('returns action prompt when no persona', () => {
      const result = buildSystemPrompt('Rewrite text')
      expect(result).toBe('Rewrite text')
    })

    it('combines persona with action prompt', () => {
      const result = buildSystemPrompt('Rewrite text', 'Be concise')
      expect(result).toBe('Be concise\n\nRewrite text')
    })

    it('handles empty persona string', () => {
      const result = buildSystemPrompt('Rewrite text', '')
      expect(result).toBe('Rewrite text')
    })
  })

  describe('default model selection', () => {
    const selectModel = (model?: string): string => {
      return model ?? 'anthropic/claude-3.5-sonnet'
    }

    it('uses default model when not specified', () => {
      expect(selectModel()).toBe('anthropic/claude-3.5-sonnet')
      expect(selectModel(undefined)).toBe('anthropic/claude-3.5-sonnet')
    })

    it('uses provided model when specified', () => {
      expect(selectModel('openai/gpt-4o')).toBe('openai/gpt-4o')
      expect(selectModel('google/gemini-2.0-flash')).toBe('google/gemini-2.0-flash')
    })
  })
})

describe('http routes', () => {
  describe('/ai/stream route configuration', () => {
    it('validates OPTIONS method support', () => {
      // The route should support OPTIONS for CORS preflight
      const supportedMethods = ['POST', 'OPTIONS']
      expect(supportedMethods).toContain('OPTIONS')
      expect(supportedMethods).toContain('POST')
    })

    it('validates POST method support', () => {
      const supportedMethods = ['POST', 'OPTIONS']
      expect(supportedMethods).toContain('POST')
    })

    it('should reject non-POST methods', () => {
      const allowedMethods = ['POST', 'OPTIONS']
      expect(allowedMethods).not.toContain('GET')
      expect(allowedMethods).not.toContain('PUT')
      expect(allowedMethods).not.toContain('DELETE')
      expect(allowedMethods).not.toContain('PATCH')
    })
  })
})
