import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { BeforePaint } from '../test/render'
import Layout from './Layout'

vi.mock('./SkyScene', () => ({ default: () => null }))

const router = () => createMemoryRouter([{ element: <Layout />, children: [{ path: '/', element: <p>conteúdo</p> }] }])
const renderLayout = () => render(<RouterProvider router={router()} />)
const withMotion = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  vi.unstubAllGlobals()
})

it('shows the four sections and the page content', () => {
  renderLayout()
  for (const name of ['Quests', 'Conquistas', 'Relatório', 'Perfil']) expect(screen.getByRole('link', { name })).toBeInTheDocument()
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
