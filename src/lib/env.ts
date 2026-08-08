interface Env {
  VITE_CONVEX_URL: string
  VITE_CONVEX_SITE_URL?: string
  VITE_CLERK_PUBLISHABLE_KEY: string
}

function validateEnv(): Env {
  const convexUrl: string | undefined = import.meta.env.VITE_CONVEX_URL?.trim()
  const convexSiteUrl: string | undefined =
    import.meta.env.VITE_CONVEX_SITE_URL?.trim()
  const clerkPublishableKey: string | undefined =
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim()

  if (!convexUrl || typeof convexUrl !== 'string' || convexUrl === '') {
    throw new Error(
      'VITE_CONVEX_URL environment variable is required. Run `npx convex dev` to configure.'
    )
  }

  if (!clerkPublishableKey) {
    throw new Error('VITE_CLERK_PUBLISHABLE_KEY environment variable is required.')
  }

  return {
    VITE_CONVEX_URL: convexUrl,
    ...(convexSiteUrl && { VITE_CONVEX_SITE_URL: convexSiteUrl }),
    VITE_CLERK_PUBLISHABLE_KEY: clerkPublishableKey,
  }
}

export const env = validateEnv()
