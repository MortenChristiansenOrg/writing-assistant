import { useAuth } from '@clerk/react'
import { useCallback } from 'react'

export function useConvexHttpToken(): () => Promise<string> {
  const { getToken } = useAuth()

  return useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error('Authentication expired')
    return token
  }, [getToken])
}
