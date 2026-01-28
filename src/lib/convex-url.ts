const convexUrl = import.meta.env.VITE_CONVEX_URL as string

// Derive HTTP action URL from Convex URL (.convex.cloud -> .convex.site)
export const convexSiteUrl = convexUrl?.replace('.convex.cloud', '.convex.site') ?? ''
