import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App.tsx'

inject()

// The static OG/Twitter tags in index.html are only for crawlers that don't run
// JS. Once we're running, react-helmet-async owns SEO tags per page — drop the
// static ones so JS-executing clients never see duplicates.
document.querySelectorAll('[data-seo-default]').forEach(el => el.remove())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}
