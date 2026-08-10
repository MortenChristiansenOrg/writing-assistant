import { httpRouter } from 'convex/server'
import { feedback, runWritingTool, stream } from './ai'
import {
  deleteOpenRouterKey,
  preflight,
  saveOpenRouterKey,
} from './credentials'

const http = httpRouter()

http.route({
  path: '/ai/stream',
  method: 'OPTIONS',
  handler: preflight,
})

http.route({
  path: '/ai/stream',
  method: 'POST',
  handler: stream,
})

http.route({
  path: '/ai/feedback',
  method: 'OPTIONS',
  handler: preflight,
})

http.route({
  path: '/ai/feedback',
  method: 'POST',
  handler: feedback,
})

http.route({
  path: '/ai/tools/run',
  method: 'OPTIONS',
  handler: preflight,
})

http.route({
  path: '/ai/tools/run',
  method: 'POST',
  handler: runWritingTool,
})

http.route({
  path: '/settings/openrouter-key',
  method: 'OPTIONS',
  handler: preflight,
})

http.route({
  path: '/settings/openrouter-key',
  method: 'POST',
  handler: saveOpenRouterKey,
})

http.route({
  path: '/settings/openrouter-key',
  method: 'DELETE',
  handler: deleteOpenRouterKey,
})

export default http
