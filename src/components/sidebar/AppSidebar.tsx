import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useAuth } from '@/hooks/useAuth'

interface Project {
  _id: Id<'projects'>
  name: string
}

interface Document {
  _id: Id<'documents'>
  title: string
}
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import {
  ChevronDown,
  FileText,
  FolderOpen,
  LogOut,
  Plus,
  Settings,
} from 'lucide-react'

export function AppSidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { projectId, docId } = useParams()
  const projects = useQuery(api.projects.list)
  const documents = useQuery(
    api.documents.list,
    projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
  )
  const createProject = useMutation(api.projects.create)
  const createDocument = useMutation(api.documents.create)

  const [newProjectName, setNewProjectName] = useState('')
  const [newDocName, setNewDocName] = useState('')
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [docDialogOpen, setDocDialogOpen] = useState(false)

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    const id = await createProject({ name: newProjectName.trim() })
    setNewProjectName('')
    setProjectDialogOpen(false)
    navigate(`/app/project/${id}`)
  }

  const handleCreateDocument = async () => {
    if (!newDocName.trim() || !projectId) return
    const id = await createDocument({
      projectId: projectId as Id<'projects'>,
      title: newDocName.trim(),
    })
    setNewDocName('')
    setDocDialogOpen(false)
    navigate(`/app/project/${projectId}/doc/${id}`)
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-2">
        <h1 className="font-semibold">Writing Assistant</h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
            <DialogTrigger asChild>
              <SidebarGroupAction title="New Project">
                <Plus className="h-4 w-4" />
              </SidebarGroupAction>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Project</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleCreateProject()
                }}
                className="space-y-4"
              >
                <Input
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                />
                <Button type="submit" className="w-full">
                  Create Project
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <SidebarGroupContent>
            <SidebarMenu>
              {(projects as Project[] | undefined)?.map((project: Project) => (
                <SidebarMenuItem key={project._id}>
                  <SidebarMenuButton
                    onClick={() => navigate(`/app/project/${project._id}`)}
                    isActive={projectId === project._id}
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>{project.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projectId && (
          <SidebarGroup>
            <SidebarGroupLabel>Documents</SidebarGroupLabel>
            <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
              <DialogTrigger asChild>
                <SidebarGroupAction title="New Document">
                  <Plus className="h-4 w-4" />
                </SidebarGroupAction>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Document</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleCreateDocument()
                  }}
                  className="space-y-4"
                >
                  <Input
                    placeholder="Document title"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" className="w-full">
                    Create Document
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <SidebarGroupContent>
              <SidebarMenu>
                {(documents as Document[] | undefined)?.map((doc: Document) => (
                  <SidebarMenuItem key={doc._id}>
                    <SidebarMenuButton
                      onClick={() =>
                        navigate(`/app/project/${projectId}/doc/${doc._id}`)
                      }
                      isActive={docId === doc._id}
                    >
                      <FileText className="h-4 w-4" />
                      <span>{doc.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                  <ChevronDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/app/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
