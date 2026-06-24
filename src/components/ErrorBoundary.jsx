import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[FirstPhoto]', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#fafaf8] px-6">
          <div className="max-w-md text-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
              FirstPhoto
            </p>
            <h1 className="mt-4 font-display text-2xl font-light text-[#0f0f0f]">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-[rgba(15,15,15,0.52)]">
              The page could not load. Try refreshing, or return home.
            </p>
            <a href="/" className="btn-primary mt-8 inline-flex">
              Go to homepage
            </a>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
