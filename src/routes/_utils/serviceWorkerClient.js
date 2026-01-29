// Service Worker Registration
console.log('[ServiceWorker] ===== MODULE EXECUTING =====')
console.log('[ServiceWorker] Client script loaded')
console.log('[ServiceWorker] Service Worker support:', 'serviceWorker' in navigator)
console.log('[ServiceWorker] Navigator:', typeof navigator)
console.log('[ServiceWorker] Window:', typeof window)

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
      console.log('[ServiceWorker] Update available')
      // Show update notification
      if (window.confirm('A new version is available. Reload to update?')) {
        await skipWaiting()
        document.location.reload(true)
      }
    }
  })
}

if ('serviceWorker' in navigator) {
  console.log('[ServiceWorker] Attempting to register service worker...')
  console.log('[ServiceWorker] Current location:', window.location.href)
  console.log('[ServiceWorker] Document readyState:', document.readyState)

  // Wait for the page to be fully loaded before registering
  const registerServiceWorker = () => {
    console.log('[ServiceWorker] registerServiceWorker() called')
    console.log('[ServiceWorker] Starting registration of /service-worker.js')

    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('[ServiceWorker] ✓ Registration successful!', registration)
        console.log('[ServiceWorker] Scope:', registration.scope)
        console.log('[ServiceWorker] Active:', registration.active)
        console.log('[ServiceWorker] Installing:', registration.installing)
        console.log('[ServiceWorker] Waiting:', registration.waiting)
        registration.addEventListener('updatefound', () => onUpdateFound(registration))
      })
      .catch(err => {
        console.error('[ServiceWorker] ✗ Registration failed:', err)
        console.error('[ServiceWorker] Error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        })
      })
  }

  // Register on next tick to ensure everything is loaded
  console.log('[ServiceWorker] Scheduling registration...')
  setTimeout(() => {
    console.log('[ServiceWorker] Timeout fired, calling registerServiceWorker()')
    registerServiceWorker()
  }, 100)
} else {
  console.error('[ServiceWorker] Service Worker API not supported in this browser')
}
