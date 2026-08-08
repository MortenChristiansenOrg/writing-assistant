import type { AuthConfig } from 'convex/server'

// Local/preview Convex deploys load auth.config.ts before their deployment
// environment is populated. The fail-closed placeholder lets that first deploy
// complete; no Clerk token can authenticate until the real issuer is configured.
const issuerDomain =
  process.env.CLERK_JWT_ISSUER_DOMAIN ?? 'https://clerk.invalid'

export default {
  providers: [
    {
      domain: issuerDomain,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig
