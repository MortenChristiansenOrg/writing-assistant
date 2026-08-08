import { SignInButton } from '@clerk/react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Writing Assistant</CardTitle>
          <CardDescription>
            AI-powered prose writing and editing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignInButton mode="modal">
            <Button className="w-full">Sign in or create an account</Button>
          </SignInButton>
        </CardContent>
      </Card>
    </div>
  )
}
