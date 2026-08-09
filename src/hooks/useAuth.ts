import { useClerk } from '@clerk/react'
import { useConvexAuth } from 'convex/react'

export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const clerk = useClerk()

  return {
    isLoading,
    isAuthenticated,
    signOut: clerk.signOut,
  }
}
