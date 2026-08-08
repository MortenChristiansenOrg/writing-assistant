import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppSidebar } from '@/components/sidebar/AppSidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const EditorPage = lazy(() =>
  import('@/pages/EditorPage').then((module) => ({ default: module.EditorPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)
const ProjectPage = lazy(() =>
  import('@/pages/ProjectPage').then((module) => ({
    default: module.ProjectPage,
  })),
)

export function AppLayout(): React.ReactElement {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<WelcomePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/project/:projectId" element={<ProjectPage />} />
              <Route
                path="/project/:projectId/doc/:docId"
                element={<EditorPage />}
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </SidebarInset>
    </SidebarProvider>
  )
}

function PageLoader(): React.ReactElement {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

function WelcomePage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-2 text-muted-foreground">
          Select or create a project to get started
        </p>
      </div>
    </div>
  )
}
