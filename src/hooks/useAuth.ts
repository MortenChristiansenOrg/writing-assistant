import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'

export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()

  return {
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
  }
}
