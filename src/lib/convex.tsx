import { ClerkProvider, useAuth as useClerkAuth } from '@clerk/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { type ReactNode } from 'react'
import { env } from './env'

const convex = new ConvexReactClient(env.VITE_CONVEX_URL, {
  verbose: true,
})

export function ConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

export { convex }
