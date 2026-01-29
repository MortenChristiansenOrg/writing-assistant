import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-4 text-center">
            <h2 className="text-lg font-semibold text-destructive">
              Something went wrong
            </h2>
            <p className="mt-2 text-muted-foreground">
              {this.state.error?.message}
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4"
            >
              Try again
            </Button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
