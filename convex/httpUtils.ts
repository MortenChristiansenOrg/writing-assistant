const allowedOrigin = process.env.CLIENT_ORIGIN
const previewOriginPattern = process.env.CLIENT_PREVIEW_ORIGIN

function matchesOriginPattern(origin: string, pattern: string): boolean {
  const wildcardIndex = pattern.indexOf('*')
  if (wildcardIndex < 0) return origin === pattern
  if (pattern.indexOf('*', wildcardIndex + 1) >= 0) return false

  const prefix = pattern.slice(0, wildcardIndex)
  const suffix = pattern.slice(wildcardIndex + 1)
  return (
    origin.length > prefix.length + suffix.length &&
    origin.startsWith(prefix) &&
    origin.endsWith(suffix)
  )
}

function isConfiguredOrigin(origin: string): boolean {
  return Boolean(
    (allowedOrigin && origin === allowedOrigin) ||
      (previewOriginPattern &&
        matchesOriginPattern(origin, previewOriginPattern)),
  )
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  return !origin || isConfiguredOrigin(origin)
}

export function corsHeaders(request: Request): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    Vary: 'Origin',
  }
  const origin = request.headers.get('Origin')
  if (origin && isConfiguredOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

export function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
    },
  })
}
