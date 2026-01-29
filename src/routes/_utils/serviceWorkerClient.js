import { snackbar } from '../_components/snackbar/snackbar.js'

console.log('[ServiceWorker] Client script loaded')
console.log('[ServiceWorker] Service Worker support:', 'serviceWorker' in navigator)

async function skipWaiting () {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg || !reg.waiting) {
    return
  }
  reg.waiting.postMessage('skip-waiting')
}

function onUpdateFound (registration) {
  const newWorker = registration.installing

  newWorker.addEventListener('statechange', async () => {
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      snackbar.announce('intl.updateAvailable', 'intl.reload', async () => {
        await skipWaiting()
        document.location.reload(true)
      })
    }
  })
}

if ('serviceWorker' in navigator) {
  console.log('[ServiceWorker] Attempting to register service worker...')

  // First check if service-worker.js is accessible
  fetch('/service-worker.js', { method: 'HEAD' })
    .then(response => {
      console.log('[ServiceWorker] /service-worker.js accessibility check:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })
    })
    .catch(err => {
      console.error('[ServiceWorker] /service-worker.js not accessible:', err)
    })

  // Wait for the page to be fully loaded before registering
  const registerServiceWorker = () => {
    console.log('[ServiceWorker] Page loaded, starting registration')
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('[ServiceWorker] Registration successful:', registration)
        console.log('[ServiceWorker] Scope:', registration.scope)
        registration.addEventListener('updatefound', () => onUpdateFound(registration))
      })
      .catch(err => {
        console.error('[ServiceWorker] Registration failed:', err)
        console.error('[ServiceWorker] Error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        })
      })
  }

  // Register immediately if already loaded, otherwise wait
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('[ServiceWorker] Document already ready, registering immediately')
    registerServiceWorker()
  } else {
    console.log('[ServiceWorker] Waiting for DOMContentLoaded')
    window.addEventListener('load', registerServiceWorker)
  }
} else {
  console.error('[ServiceWorker] Service Worker API not supported in this browser')
}
