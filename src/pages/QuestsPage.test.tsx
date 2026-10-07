import { screen } from '@testing-library/react'
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

beforeEach(() => vi.mocked(api.loadAll).mockResolvedValue(data))
const open = () => renderRoute([{ path: '/', element: <QuestsPage /> }], '/')

it('shows pending top-level quests with subquest progress', async () => {
  open()
  expect(await screen.findByText('Japão')).toBeInTheDocument()
  expect(screen.getByText('1/2')).toBeInTheDocument()
  expect(screen.queryByText('Matrix')).not.toBeInTheDocument()
  expect(screen.queryByText('Monte Fuji')).not.toBeInTheDocument()
})

it('switches to the done tab', async () => {
  const user = userEvent.setup()
  open()
  await user.click(await screen.findByRole('tab', { name: 'Feitas' }))
  expect(screen.getByText('Matrix')).toBeInTheDocument()
  expect(screen.queryByText('Japão')).not.toBeInTheDocument()
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
