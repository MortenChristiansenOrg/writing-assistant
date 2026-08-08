const allowedOrigin = process.env.CLIENT_ORIGIN
const previewOriginPattern = process.env.CLIENT_PREVIEW_ORIGIN

function matchesOriginPattern(origin: string, pattern: string): boolean {
  const wildcardIndex = pattern.indexOf('*')
  if (wildcardIndex < 0) return origin === pattern
  if (pattern.indexOf('*', wildcardIndex + 1) >= 0) return false

  const placeholder = 'preview-wildcard-placeholder'
  let configured: URL
  let candidate: URL
  try {
    configured = new URL(pattern.replace('*', placeholder))
    candidate = new URL(origin)
  } catch {
    return false
  }

  if (
    configured.protocol !== 'https:' ||
    candidate.protocol !== 'https:' ||
    configured.port ||
    candidate.port ||
    configured.pathname !== '/' ||
    candidate.pathname !== '/' ||
    configured.search ||
    candidate.search ||
    configured.hash ||
    candidate.hash
  ) {
    return false
  }

  const hostnameWildcardIndex = configured.hostname.indexOf(placeholder)
  if (hostnameWildcardIndex < 1) return false
  const prefix = configured.hostname.slice(0, hostnameWildcardIndex)
  const suffix = configured.hostname.slice(
    hostnameWildcardIndex + placeholder.length,
  )
  if (!suffix.includes('.')) return false

  const wildcardValue = candidate.hostname.slice(
    prefix.length,
    candidate.hostname.length - suffix.length,
  )
  return (
    candidate.hostname.startsWith(prefix) &&
    candidate.hostname.endsWith(suffix) &&
    /^[a-z0-9-]+$/i.test(wildcardValue)
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
