import type { AuthConfig } from 'convex/server'

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
