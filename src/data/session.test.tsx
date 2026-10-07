import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

let emit: (event: string, session: unknown) => void = () => {}
const initial = { session: null as unknown }

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: initial.session } })),
      onAuthStateChange: vi.fn((cb: typeof emit) => {
        emit = cb
        return { data: { subscription: { unsubscribe() {} } } }
      }),
    },
  },
}))

// jsdom has no WebGL; the 3D sky is irrelevant to the screen hand-off being tested.
vi.mock('../components/SkyScene', () => ({ default: () => null }))

import { AuthGate } from './session'

const session = { user: { id: 'u1' } }
const animatedMotion = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))

afterEach(() => {
  vi.unstubAllGlobals()
  initial.session = null
})

it('enters the app right away when motion is reduced', async () => {
  render(<AuthGate><p>app</p></AuthGate>)
  await screen.findByLabelText('E-mail')
  act(() => emit('SIGNED_IN', session))
  expect(screen.getByText('app')).toBeInTheDocument()
})

it('keeps the login on screen for the exit animation, then enters the app', async () => {
  animatedMotion()
  render(<AuthGate><p>app</p></AuthGate>)
  await screen.findByLabelText('E-mail')
  act(() => emit('SIGNED_IN', session))
  expect(screen.queryByText('app')).toBeNull()
  expect(await screen.findByText('app', {}, { timeout: 3000 })).toBeInTheDocument()
})

it('a session refresh while inside the app does not replay the transition', async () => {
  animatedMotion()
  initial.session = session
  render(<AuthGate><p>app</p></AuthGate>)
  await screen.findByText('app')
  act(() => emit('SIGNED_IN', session))
  expect(screen.getByText('app')).toBeInTheDocument()
  expect(screen.queryByLabelText('E-mail')).toBeNull()
})
