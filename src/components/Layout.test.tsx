import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import Layout from './Layout'

vi.mock('./SkyScene', () => ({ default: () => null }))

const renderLayout = () =>
  render(<RouterProvider router={createMemoryRouter([{ element: <Layout />, children: [{ path: '/', element: <p>conteúdo</p> }] }])} />)

afterEach(() => Object.defineProperty(navigator, 'onLine', { value: true, configurable: true }))

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

it('the page-enter animation leaves no transform behind (fixed overlays keep covering the screen)', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  renderLayout()
  await new Promise((r) => setTimeout(r, 700))
  expect(screen.getByText('conteúdo').closest('[data-page]')!.getAttribute('style') ?? '').not.toMatch(/transform/)
  vi.unstubAllGlobals()
})
