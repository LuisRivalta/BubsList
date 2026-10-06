import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it } from 'vitest'
import Layout from './Layout'

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
