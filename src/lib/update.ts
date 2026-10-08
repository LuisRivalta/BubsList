// "Atualizar": activate the waiting version and reload once it is active.
// A page no worker controls (first visit, Ctrl+Shift+R) never gets the plugin's reload, and its new version
// is already active instead of waiting: then there is nothing to activate, just reload.
export function applyUpdate(registration: ServiceWorkerRegistration | undefined, skipWaiting: () => void, reload: () => void) {
  const waiting = registration?.waiting
  if (!waiting) return reload()
  waiting.addEventListener('statechange', () => {
    if (waiting.state === 'activated') reload()
  })
  skipWaiting()
}
