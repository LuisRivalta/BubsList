import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { CATS, allCats, appData, completion, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import ReportPage from './ReportPage'

vi.mock('../data/api')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 12))
})
afterEach(() => vi.useRealTimers())

const batata = quest({ id: 'batata', title: 'Batata do Marechal', category_id: CATS.restaurante.id, difficulty: 'hard' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: CATS.filme.id, difficulty: 'medium' })
const open = () => renderRoute([{ path: '/relatorio', element: <ReportPage /> }], '/relatorio')

it('shows the current month with counts per category', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({
      categories: allCats(),
      quests: [batata, matrix],
      completions: [
        completion({ quest_id: 'batata', done_on: '2026-10-02' }),
        completion({ quest_id: 'batata', done_on: '2026-10-20' }),
        completion({ quest_id: 'matrix', done_on: '2026-10-10' }),
        completion({ quest_id: 'matrix', done_on: '2026-09-05' }),
      ],
    }),
  )
  const user = userEvent.setup()
  open()
  expect(await screen.findByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument()
  expect(screen.getByText('3')).toBeInTheDocument()
  expect(screen.getByText('Restaurante: 2')).toBeInTheDocument()
  expect(screen.getByText('Filme: 1')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Período anterior' }))
  expect(screen.getByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument()
  expect(screen.getByText('Filme: 1')).toBeInTheDocument()
  expect(screen.queryByText(/Restaurante:/)).not.toBeInTheDocument()

  await user.click(screen.getByRole('tab', { name: 'Últimos 3 meses' }))
  expect(screen.getByText('Filme: 2')).toBeInTheDocument()
})

it('shows the empty message', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats() }))
  open()
  expect(await screen.findByText('Nada por aqui ainda. Bora completar uma quest?')).toBeInTheDocument()
})

it('offers the year retrospective only for a year with completions', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({ categories: allCats(), quests: [batata], completions: [completion({ quest_id: 'batata', done_on: '2026-03-02' })] }),
  )
  const user = userEvent.setup()
  open()
  await screen.findByRole('tab', { name: 'Ano' })
  expect(screen.queryByRole('link', { name: /Retrospectiva/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Ano' }))
  expect(screen.getByRole('link', { name: 'Retrospectiva 2026' })).toHaveAttribute('href', '/retrospectiva/2026')
  await user.click(screen.getByRole('button', { name: 'Período anterior' }))
  expect(screen.queryByRole('link', { name: /Retrospectiva/ })).not.toBeInTheDocument()
})
