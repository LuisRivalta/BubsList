import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

// jsdom brings its own AbortSignal, but Request is Node's (undici) and rejects foreign signals.
// React Router builds a Request on every navigation, so drop the signal in tests only.
const NodeRequest = globalThis.Request
globalThis.Request = class extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init?.signal ? { ...init, signal: undefined } : init)
  }
} as typeof Request

// The service worker only exists in the built app; tests see no new version unless they say so.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn(() => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: vi.fn() })),
}))
