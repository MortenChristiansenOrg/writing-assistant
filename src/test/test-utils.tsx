import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { ConvexProvider } from 'convex/react'
import { FakeConvexClient } from './fake-convex-client'

const fakeClient = new FakeConvexClient()

interface AllTheProvidersProps {
  children: ReactNode
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <ConvexProvider client={fakeClient as unknown as never}>
      {children}
    </ConvexProvider>
  )
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render, fakeClient }
