import { useAuthActions } from '@convex-dev/auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const TEST_USERS = [
  { name: 'Alice', email: 'alice@test.local' },
  { name: 'Bob', email: 'bob@test.local' },
  { name: 'Carol', email: 'carol@test.local' },
] as const

const TEST_PASSWORD = 'testpass123'

export function LoginPage() {
  const { signIn } = useAuthActions()

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
          <Button
            className="w-full"
            onClick={() => void signIn('github')}
          >
            <GitHubIcon className="mr-2 h-4 w-4" />
            Sign in with GitHub
          </Button>

          {import.meta.env.DEV && <DevLoginSection />}
        </CardContent>
      </Card>
    </div>
  )
}

function DevLoginSection() {
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handlePasswordAuth(
    email: string,
    password: string,
    label: string,
  ) {
    setLoading(label)
    setError(null)
    try {
      await signIn('password', { email, password, flow: 'signIn' })
    } catch {
      try {
        await signIn('password', { email, password, flow: 'signUp' })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Auth failed')
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
          Dev only
        </span>
      </div>

      <div className="flex gap-2">
        {TEST_USERS.map((user) => (
          <Button
            key={user.name}
            variant="outline"
            className="flex-1"
            disabled={loading !== null}
            onClick={() =>
              handlePasswordAuth(user.email, TEST_PASSWORD, user.name)
            }
          >
            {loading === user.name ? '...' : user.name}
          </Button>
        ))}
      </div>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          void handlePasswordAuth(email, password, 'custom')
        }}
      >
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="dev-email"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="dev-password"
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="secondary"
            className="flex-1"
            disabled={loading !== null || !email || !password}
          >
            {loading === 'custom' ? '...' : 'Sign In'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={loading !== null || !email || !password}
            onClick={() => {
              setLoading('signup')
              setError(null)
              signIn('password', { email, password, flow: 'signUp' })
                .catch((e: unknown) =>
                  setError(e instanceof Error ? e.message : 'Sign up failed'),
                )
                .finally(() => setLoading(null))
            }}
          >
            {loading === 'signup' ? '...' : 'Sign Up'}
          </Button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}
