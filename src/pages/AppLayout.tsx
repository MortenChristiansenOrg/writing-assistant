import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppSidebar } from '@/components/sidebar/AppSidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { FolderOpen } from 'lucide-react'

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
        <header className="flex min-h-12 shrink-0 items-center gap-2 border-b px-3 pt-[env(safe-area-inset-top)] md:hidden">
          <SidebarTrigger className="size-9" />
          <span className="truncate text-sm font-semibold">
            Writing Assistant
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
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
        </div>
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

function WelcomePage(): React.ReactElement {
  const { setOpenMobile } = useSidebar()

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-2 text-muted-foreground">
          Select or create a project to get started
        </p>
        <Button
          className="mt-6 md:hidden"
          onClick={() => setOpenMobile(true)}
        >
          <FolderOpen data-icon="inline-start" />
          Browse projects
        </Button>
      </div>
    </div>
  )
}
