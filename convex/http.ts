import { httpRouter } from 'convex/server'
import { stream, feedback } from './ai'
import { credentialOptions, saveOpenRouterKey } from './credentials'

const http = httpRouter()

http.route({
  path: '/ai/stream',
  method: 'OPTIONS',
  handler: credentialOptions,
})

http.route({
  path: '/ai/stream',
  method: 'POST',
  handler: stream,
})

http.route({
  path: '/ai/feedback',
  method: 'OPTIONS',
  handler: credentialOptions,
})

http.route({
  path: '/ai/feedback',
  method: 'POST',
  handler: feedback,
})

http.route({
  path: '/settings/openrouter-key',
  method: 'OPTIONS',
  handler: credentialOptions,
})

http.route({
  path: '/settings/openrouter-key',
  method: 'POST',
  handler: saveOpenRouterKey,
})

export default http
