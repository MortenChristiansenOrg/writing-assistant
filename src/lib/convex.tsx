import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { type ReactNode } from 'react'
import { env } from './env'

const convex = new ConvexReactClient(env.VITE_CONVEX_URL, {
  verbose: true,
})

export function ConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>
}

export { convex }
