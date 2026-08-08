import { env } from './env'

function resolveConvexSiteUrl(
  convexUrl: string,
  explicitSiteUrl: string | undefined,
): string {
  if (explicitSiteUrl) return explicitSiteUrl.replace(/\/+$/, '')
  const normalizedConvexUrl = convexUrl.replace(/\/+$/, '')
  if (normalizedConvexUrl.endsWith('.convex.cloud')) {
    return normalizedConvexUrl.replace(/\.convex\.cloud$/, '.convex.site')
  }
  throw new Error(
    'VITE_CONVEX_SITE_URL is required for local or self-hosted Convex deployments',
  )
}

// Cloud URLs are derivable; other deployments expose HTTP actions separately.
export const convexSiteUrl: string = resolveConvexSiteUrl(
  env.VITE_CONVEX_URL,
  env.VITE_CONVEX_SITE_URL,
)
