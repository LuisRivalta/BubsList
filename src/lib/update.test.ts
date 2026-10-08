import { expect, it, vi } from 'vitest'
import { applyUpdate } from './update'

// A waiting worker: an EventTarget whose state the test moves along.
function waitingWorker() {
  const sw = new EventTarget() as EventTarget & { state: string }
  sw.state = 'installed'
  return sw
}
const activate = (sw: ReturnType<typeof waitingWorker>) => {
  sw.state = 'activated'
  sw.dispatchEvent(new Event('statechange'))
}

it('a waiting version is activated, and the page reloads once it is active', () => {
  const sw = waitingWorker()
  const skipWaiting = vi.fn()
  const reload = vi.fn()
  applyUpdate({ waiting: sw } as unknown as ServiceWorkerRegistration, skipWaiting, reload)
  expect(skipWaiting).toHaveBeenCalled()
  expect(reload).not.toHaveBeenCalled()
  activate(sw)
  expect(reload).toHaveBeenCalledTimes(1)
})

it('with no waiting version (already active: the page had no worker in control) it reloads right away', () => {
  const skipWaiting = vi.fn()
  const reload = vi.fn()
  applyUpdate({ waiting: null } as unknown as ServiceWorkerRegistration, skipWaiting, reload)
  expect(reload).toHaveBeenCalledTimes(1)
  expect(skipWaiting).not.toHaveBeenCalled()
})

it('before the registration is known it still reloads, never leaving a dead button', () => {
  const reload = vi.fn()
  applyUpdate(undefined, vi.fn(), reload)
  expect(reload).toHaveBeenCalledTimes(1)
})
