import { env } from './env'

// Derive HTTP action URL from Convex URL (.convex.cloud -> .convex.site)
export const convexSiteUrl = env.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site')
