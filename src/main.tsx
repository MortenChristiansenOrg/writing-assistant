import '@/lib/env' // Validate env vars first
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ConvexProvider } from '@/lib/convex'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <ConvexProvider>
      <App />
    </ConvexProvider>
  </StrictMode>
)
