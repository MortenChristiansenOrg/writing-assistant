import { Routes, Route } from 'react-router-dom'
import { AppSidebar } from '@/components/sidebar/AppSidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { EditorPage } from '@/pages/EditorPage'
import { SettingsPage } from '@/pages/SettingsPage'

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/project/:projectId" element={<ProjectPage />} />
          <Route path="/project/:projectId/doc/:docId" element={<EditorPage />} />
        </Routes>
      </SidebarInset>
    </SidebarProvider>
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

function ProjectPage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Project</h1>
        <p className="mt-2 text-muted-foreground">
          Select or create a document to start writing
        </p>
      </div>
    </div>
  )
}
