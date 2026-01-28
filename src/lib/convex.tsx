import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { type ReactNode } from 'react'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string

if (!convexUrl) {
  console.warn('VITE_CONVEX_URL not set. Run `npx convex dev` to configure.')
}

const convex = new ConvexReactClient(convexUrl || 'https://placeholder.convex.cloud', {
  verbose: true,
})

export function ConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>
}

export { convex }
