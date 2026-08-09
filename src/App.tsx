import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/Login'
import { AppLayout } from '@/pages/AppLayout'

type PrototypeToolsPageModule = typeof import('@/pages/PrototypeToolsPage')

const PrototypeToolsPage = lazy<PrototypeToolsPageModule['PrototypeToolsPage']>(() =>
  import('@/pages/PrototypeToolsPage').then((module: PrototypeToolsPageModule) => ({
    default: module.PrototypeToolsPage,
  })),
)

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <CurrentUserGate>{children}</CurrentUserGate>
}

function CurrentUserGate({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement | null {
  const currentUser = useQuery(api.users.current)
  const ensureCurrentUser = useMutation(api.users.ensureCurrent)
  const [provisioningError, setProvisioningError] = useState(false)

  useEffect(() => {
    if (currentUser !== null) return

    let active = true
    void ensureCurrentUser().catch(() => {
      if (active) setProvisioningError(true)
    })
    return () => {
      active = false
    }
  }, [currentUser, ensureCurrentUser])

  if (currentUser) return <>{children}</>

  if (provisioningError) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <p role="alert" className="text-sm text-destructive">
          Could not initialize your account. Refresh the page to try again.
        </p>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return null
}

interface AppProps {
  isDevelopment?: boolean
}

function App({ isDevelopment = import.meta.env.DEV }: AppProps = {}) {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {isDevelopment && (
            <Route
              path="/prototype/tools"
              element={
                <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading prototype…</div>}>
                  <PrototypeToolsPage />
                </Suspense>
              }
            />
          )}
          <Route path="/" element={<AuthGate><Navigate to="/app" replace /></AuthGate>} />
          <Route
            path="/app/*"
            element={
              <AuthGate>
                <AppLayout />
              </AuthGate>
            }
          />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
