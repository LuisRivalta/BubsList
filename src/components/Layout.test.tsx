import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { BeforePaint } from '../test/render'
import Layout, { useHideSky } from './Layout'

vi.mock('./SkyScene', () => ({ default: () => <div data-testid="sky" /> }))

const router = () => createMemoryRouter([{ element: <Layout />, children: [{ path: '/', element: <p>conteúdo</p> }] }])
const renderLayout = () => render(<RouterProvider router={router()} />)
const withMotion = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  vi.unstubAllGlobals()
  vi.mocked(useRegisterSW).mockReset() // back to "no new version" (setup.ts)
})

it('shows the five sections and the page content', () => {
  renderLayout()
  for (const name of ['Quests', 'Mapa', 'Conquistas', 'Retrospectiva', 'Perfil']) expect(screen.getByRole('link', { name })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('href', '/mapa')
  expect(screen.getByText('conteúdo')).toBeInTheDocument()
})

it('warns when offline', () => {
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
  renderLayout()
  expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão')
})

it('the offline warning floats over the page instead of pushing the hero out of the sky', () => {
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
  renderLayout()
  const alert = screen.getByRole('alert')
  expect(screen.getByRole('main')).not.toContainElement(alert)
  expect(alert.closest('.fixed')).not.toBeNull()
})

it('new page content is already hidden at the first paint (no blink before the fade-in)', () => {
  withMotion()
  let opacity = ''
  const read = () => (opacity = document.querySelector<HTMLElement>('[data-page]')!.style.opacity)
  render(<BeforePaint read={read}><RouterProvider router={router()} /></BeforePaint>)
  expect(opacity).toBe('0')
})

it('the page-enter animation leaves no transform behind (fixed overlays keep covering the screen)', async () => {
  withMotion()
  renderLayout()
  await new Promise((r) => setTimeout(r, 700))
  expect(screen.getByText('conteúdo').closest('[data-page]')!.getAttribute('style') ?? '').not.toMatch(/transform/)
})

it('tells the user when a save fails instead of failing silently', () => {
  renderLayout()
  act(() => {
    window.dispatchEvent(new Event('unhandledrejection'))
  })
  expect(screen.getByRole('alert')).toHaveTextContent('Não deu para salvar')
})

it('Quests stays highlighted on a category page', () => {
  render(<RouterProvider router={createMemoryRouter([{ element: <Layout />, children: [{ path: '/categoria/:id', element: <p>categoria</p> }] }], { initialEntries: ['/categoria/cat-viagem'] })} />)
  expect(screen.getByRole('link', { name: 'Quests' })).toHaveAttribute('aria-current', 'page')
})

it('a full-screen draw hides the page sky while it is open', async () => {
  withMotion()
  function Draw() {
    useHideSky()
    return <p>sorteio</p>
  }
  const r = createMemoryRouter([{ element: <Layout />, children: [{ path: '/', element: <p>conteúdo</p> }, { path: '/sorteio', element: <Draw /> }] }])
  render(<RouterProvider router={r} />)
  expect(await screen.findByTestId('sky')).toBeInTheDocument()
  await act(() => r.navigate('/sorteio'))
  expect(screen.queryByTestId('sky')).not.toBeInTheDocument()
  await act(() => r.navigate('/'))
  expect(await screen.findByTestId('sky')).toBeInTheDocument()
})

const newVersion = (update = vi.fn(), registration?: Partial<ServiceWorkerRegistration>) =>
  vi.mocked(useRegisterSW).mockImplementation((options) => {
    if (registration) options?.onRegisteredSW?.('/sw.js', registration as ServiceWorkerRegistration)
    return { needRefresh: [!registration, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: update }
  })

it('offers the new version and only reloads when asked', async () => {
  const update = vi.fn()
  newVersion(update)
  renderLayout()
  expect(screen.getByRole('status')).toHaveTextContent('Nova versão do Bubs2Do')
  expect(update).not.toHaveBeenCalled()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Atualizar' }))
  expect(update).toHaveBeenCalledWith(true)
})

it('looks for a new version whenever the app comes back to the screen, quietly when offline', async () => {
  const check = vi.fn().mockRejectedValue(new Error('offline'))
  newVersion(vi.fn(), { update: check })
  renderLayout()
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(check).toHaveBeenCalled()
  await new Promise((r) => setTimeout(r, 0))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
