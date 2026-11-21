import { Component, type ErrorInfo, type JSX, type ReactNode } from 'react'
import { loadLocale } from '../locale'
import { getMessages } from '../messages'

// Set when Vite fails to fetch a lazy chunk. Chunk names carry a content hash
// and the build empties out/, so a rebuild under a running Gitty leaves the
// window asking for files that are gone — the one failure a reload cannot fix,
// because the main process is the old build too.
let staleBuild = false
window.addEventListener('vite:preloadError', () => {
  staleBuild = true
})

interface State {
  error: Error | null
}

/**
 * The outermost component. Without it an error thrown while rendering — a
 * failed lazy import included — makes React unmount the whole tree and the
 * window is left an empty dark rectangle with nothing in any log.
 *
 * It sits above the locale provider, so it reads the stored locale itself.
 */
export class CrashBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[crash]', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    return <Crash error={error} />
  }
}

function Crash({ error }: { error: Error }): JSX.Element {
  const msg = getMessages(loadLocale()).app.crash
  const stale = staleBuild || /dynamically imported module/i.test(error.message)
  return (
    <div className="crash">
      <h1>{msg.title}</h1>
      {stale && <p>{msg.staleBuild}</p>}
      <pre>{error.message}</pre>
      <button onClick={() => location.reload()}>{msg.reload}</button>
    </div>
  )
}
