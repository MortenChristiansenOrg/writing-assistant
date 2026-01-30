import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { auth } from './auth'
import { stream } from './ai'

const http = httpRouter()

auth.addHttpRoutes(http)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

http.route({
  path: '/ai/stream',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

http.route({
  path: '/ai/stream',
  method: 'POST',
  handler: stream,
})

export default http
