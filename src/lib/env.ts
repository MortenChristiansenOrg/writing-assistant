interface Env {
  VITE_CONVEX_URL: string
}

function validateEnv(): Env {
  const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim()

  if (!convexUrl || typeof convexUrl !== 'string' || convexUrl === '') {
    throw new Error(
      'VITE_CONVEX_URL environment variable is required. Run `npx convex dev` to configure.'
    )
  }

  return {
    VITE_CONVEX_URL: convexUrl,
  }
}

export const env = validateEnv()
