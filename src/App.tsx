import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/Login'
import { AppLayout } from '@/pages/AppLayout'

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

  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
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
