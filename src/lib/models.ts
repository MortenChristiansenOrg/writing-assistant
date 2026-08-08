export interface ModelDescriptor {
  id: string
  name: string
  input: number
  output: number
}

export const MODELS: ModelDescriptor[] = [
  { id: 'anthropic/claude-opus-5', name: 'Claude Opus 5', input: 5, output: 25 },
  { id: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5', input: 2, output: 10 },
  { id: 'openai/gpt-5.6-sol', name: 'GPT-5.6 Sol', input: 5, output: 30 },
  { id: 'google/gemini-3.6-flash', name: 'Gemini 3.6 Flash', input: 1.5, output: 7.5 },
  { id: 'google/gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', input: 0.3, output: 2.5 },
  { id: 'moonshotai/kimi-k3', name: 'Kimi K3', input: 3, output: 15 },
  { id: 'deepseek/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash', input: 0.09, output: 0.18 },
]
