import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { CATS, allCats, appData, completion, quest, questType } from '../test/fixtures'
import { renderRoute } from '../test/render'
import CategoryPage from './CategoryPage'

vi.mock('../data/api')

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, difficulty: 'epic' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', category_id: CATS.atividade.id })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', category_id: CATS.viagem.id })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: CATS.filme.id })

beforeEach(() => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({ categories: allCats(), quests: [japao, fuji, toquio, matrix], completions: [completion({ quest_id: 'matrix' }), completion({ quest_id: 'fuji' })] }),
  )
})
const open = (id: string) => renderRoute([{ path: '/categoria/:id', element: <CategoryPage /> }], `/categoria/${id}`)

it('lists only the pending top-level quests of the category, with subquest progress', async () => {
  open('cat-viagem')
  expect(await screen.findByRole('heading', { level: 1, name: 'Viagem' })).toBeInTheDocument()
  expect(screen.getByText('Japão')).toBeInTheDocument()
  expect(screen.getByText('1/2')).toBeInTheDocument()
  expect(screen.queryByText('Matrix')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/')
})

it('Todas switches between pending and done across categories', async () => {
  const user = userEvent.setup()
  open('todas')
  expect(await screen.findByText('Japão')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Feitas' }))
  expect(screen.getByText('Matrix')).toBeInTheDocument()
  expect(screen.queryByText('Japão')).not.toBeInTheDocument()
})

it('filters by difficulty', async () => {
  const user = userEvent.setup()
  open('todas')
  await user.selectOptions(await screen.findByLabelText('Dificuldade'), 'Fácil')
  expect(screen.queryByText('Japão')).not.toBeInTheDocument()
  expect(screen.getByText(/Nenhuma quest pendente/)).toBeInTheDocument()
})

it('a new quest starts in this category and Sortear draws only from it', async () => {
  const user = userEvent.setup()
  open('cat-viagem')
  expect(await screen.findByRole('link', { name: 'Nova quest' })).toHaveAttribute('href', '/quests/nova?categoria=cat-viagem')
  await user.click(screen.getByRole('button', { name: 'Sortear' }))
  const dialog = screen.getByRole('dialog', { name: 'Sorteio' })
  expect(within(dialog).getByRole('button', { name: 'Viagem' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(within(dialog).getByRole('button', { name: 'Sortear' }))
  expect(dialog).toHaveTextContent('Tóquio')
})

it('an unknown category shows a not-found hero', async () => {
  open('nope')
  expect(await screen.findByRole('heading', { level: 1, name: 'Categoria não encontrada' })).toBeInTheDocument()
})

it('the hero counts use singular and plural correctly', async () => {
  open('cat-viagem')
  await screen.findByRole('heading', { level: 1, name: 'Viagem' })
  const hero = document.querySelector('header')!
  expect(hero).toHaveTextContent('1 pendente')
  expect(hero).not.toHaveTextContent('1 pendentes')
  expect(hero).toHaveTextContent('0 feitas')
})

it('cards show the type and the city, and nothing extra when there is none', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({
      categories: allCats(),
      questTypes: [questType({ id: 't-roteiro', category_id: CATS.viagem.id, name: 'Roteiro' })],
      quests: [quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, type_id: 't-roteiro', city: 'Tóquio' }), quest({ id: 'praia', title: 'Praia', category_id: CATS.viagem.id })],
    }),
  )
  open('cat-viagem')
  expect(await screen.findByText('Roteiro · Tóquio')).toBeInTheDocument()
  expect(screen.getByText('Praia').closest('a')).not.toHaveTextContent('·')
})
