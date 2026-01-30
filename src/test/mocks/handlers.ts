import { http, HttpResponse } from 'msw'

export const handlers = [
  // AI streaming endpoint
  http.post('*/ai/stream', async ({ request }) => {
    const body = (await request.json()) as { action?: string; text?: string }
    const action = body.action || 'rewrite'
    const text = body.text || ''

    // Return mock responses based on action
    const responses: Record<string, string> = {
      rewrite: `Rewritten: ${text}`,
      shorter: text.substring(0, Math.ceil(text.length / 2)),
      longer: `${text} This is additional content to make the text longer.`,
      formal: `Respectfully, ${text}`,
      casual: `Hey! ${text}`,
      fix_grammar: text.replace(/\s+/g, ' ').trim(),
    }

    const response = responses[action] || text

    // Simulate streaming by returning chunks
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const words = response.split(' ')
        words.forEach((word, i) => {
          controller.enqueue(encoder.encode(word + (i < words.length - 1 ? ' ' : '')))
        })
        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
      },
    })
  }),

  // Fallback for unhandled requests (useful for debugging)
  http.all('*', ({ request }) => {
    console.warn(`Unhandled request: ${request.method} ${request.url}`)
    return HttpResponse.json({ error: 'Not mocked' }, { status: 404 })
  }),
]
