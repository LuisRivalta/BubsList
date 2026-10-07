import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { CATS, ME, allCats, appData, completion, quest, review } from '../test/fixtures'
import { renderRoute } from '../test/render'
import QuestsPage from './QuestsPage'

vi.mock('../data/api')

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, difficulty: 'epic' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', category_id: CATS.atividade.id })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', category_id: CATS.viagem.id })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: CATS.filme.id })
const data = appData({
  categories: allCats(),
  quests: [japao, fuji, toquio, matrix],
  completions: [completion({ id: 'cm', quest_id: 'matrix' }), completion({ id: 'cf', quest_id: 'fuji' })],
  reviews: [review({ completion_id: 'cf', user_id: ME })],
})

beforeEach(() => {
  vi.mocked(api.loadAll).mockResolvedValue(data)
})
const open = () => renderRoute([{ path: '/', element: <QuestsPage /> }], '/')

it('shows a card per category with its counts, plus Todas', async () => {
  open()
  const viagem = await screen.findByRole('link', { name: /^Viagem/ })
  expect(viagem).toHaveAttribute('href', '/categoria/cat-viagem')
  expect(viagem).toHaveTextContent('1 pendente · 0 feitas')
  expect(screen.getByRole('link', { name: /^Filme/ })).toHaveTextContent('0 pendentes · 1 feita')
  expect(screen.getByRole('link', { name: /^Restaurante/ })).toHaveTextContent('Nenhuma ainda')
  const todas = screen.getByRole('link', { name: /^Todas/ })
  expect(todas).toHaveAttribute('href', '/categoria/todas')
  expect(todas).toHaveTextContent('1 pendente · 1 feita')
  expect(screen.queryByText('Japão')).not.toBeInTheDocument()
})

it('searching replaces the grid with matches from every category, done ones included', async () => {
  const user = userEvent.setup()
  open()
  await user.type(await screen.findByLabelText('Buscar quests'), 'matrix')
  expect(screen.getByText('Matrix')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /^Viagem/ })).not.toBeInTheDocument()
})

it('search ignores accents and finds subquests with their path', async () => {
  const user = userEvent.setup()
  open()
  await user.type(await screen.findByLabelText('Buscar quests'), 'toquio')
  expect(screen.getByText('Tóquio')).toBeInTheDocument()
  expect(screen.getByText('Japão ›')).toBeInTheDocument()
})

it('warns about my pending reviews', async () => {
  open()
  expect(await screen.findByText('Você tem 1 resenha pendente')).toBeInTheDocument()
})

it('the new-quest button shows its label', async () => {
  open()
  const button = await screen.findByRole('link', { name: 'Nova quest' })
  expect(button).toHaveAttribute('href', '/quests/nova')
  expect(button).toHaveTextContent('Nova quest')
})

it('loading shows a readable hero heading', async () => {
  vi.mocked(api.loadAll).mockReturnValue(new Promise(() => {}))
  open()
  expect(await screen.findByRole('heading', { level: 1, name: 'Carregando…' })).toBeInTheDocument()
})


it('draws a pending quest you can actually do and opens it', async () => {
  const user = userEvent.setup()
  open()
  await user.click(await screen.findByRole('button', { name: 'Sortear' }))
  const dialog = screen.getByRole('dialog', { name: 'Sorteio' })
  await user.click(within(dialog).getByRole('button', { name: 'Sortear' }))
  expect(dialog).toHaveTextContent('Tóquio')
  expect(screen.getByRole('link', { name: 'Bora!' })).toHaveAttribute('href', '/quests/toquio')
  await user.click(screen.getByRole('button', { name: 'Fechar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
