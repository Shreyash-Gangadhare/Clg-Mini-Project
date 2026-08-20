import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './design-tokens.css'
import './index.css'

async function enableMocking() {
  // If VITE_USE_REAL_API=true, skip all mocking and use real Django backend
  if (import.meta.env.VITE_USE_REAL_API === 'true') {
    console.log('[api] Using real Django backend at', import.meta.env.VITE_API_URL || 'http://localhost:8000')
    return
  }

  if (!import.meta.env.DEV) return

  // 1. Install the axios-level mock first (works everywhere, no SW needed)
  const { api } = await import('./api/client.js')
  const { installAxiosMock } = await import('./api/mock/axiosMock.js')
  installAxiosMock(api)

  // 2. Also try to start MSW service worker (better for real browser dev)
  try {
    const { worker } = await import('./api/mock/browser.js')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    })
    // NOTE: We keep axios mock because it's a reliable fallback when SW isn't active
  } catch (e) {
    // SW not available (headless browser, private mode, etc.) — axios mock handles all
    console.log('[mock] MSW SW not available, using axios adapter only')
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
