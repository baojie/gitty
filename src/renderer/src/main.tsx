import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CrashBoundary } from './components/CrashBoundary'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashBoundary>
      <App />
    </CrashBoundary>
  </StrictMode>
)
