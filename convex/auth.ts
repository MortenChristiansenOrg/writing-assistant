import GitHub from '@auth/core/providers/github'
import { convexAuth } from '@convex-dev/auth/server'
import { Password } from '@convex-dev/auth/providers/Password'

const providers: any[] = [GitHub]
if (process.env.AUTH_PASSWORD_ENABLED === 'true') {
  providers.push(Password)
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
})
