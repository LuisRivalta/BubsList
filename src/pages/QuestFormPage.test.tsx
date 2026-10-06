import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { normalizeAniList } from '../../supabase/functions/_shared/catalog'
import * as api from '../data/api'
import * as catalog from '../lib/catalog'
import { CATS, allCats, appData, media, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import QuestFormPage from './QuestFormPage'

vi.mock('../data/api')
vi.mock('../lib/catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/catalog')>()),
  searchCatalog: vi.fn(),
  fetchCatalogDetails: vi.fn(),
}))

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id })
const routes = [
  { path: '/quests/nova', element: <QuestFormPage /> },
  { path: '/quests/:id', element: <p>página da quest</p> },
]

beforeEach(() => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), quests: [japao] }))
  vi.mocked(api.createQuest).mockResolvedValue(quest({ id: 'new-q' }))
})

it('creates a top-level quest', async () => {
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText('Título'), 'Batata do Marechal')
  await user.click(screen.getByRole('button', { name: 'Média' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/quests/new-q'))
  expect(api.createQuest).toHaveBeenCalledWith({
    parent_id: null, category_id: CATS.restaurante.id, title: 'Batata do Marechal', notes: null, difficulty: 'medium', media_id: null,
  })
})

it('requires a difficulty', async () => {
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText('Título'), 'Batata do Marechal')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Escolha a dificuldade.')
  expect(api.createQuest).not.toHaveBeenCalled()
})

it('a new subquest starts as Atividade under its parent', async () => {
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova?parent=japao')
  expect(await screen.findByRole('heading', { name: 'Nova subquest de Japão' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Atividade' })).toHaveAttribute('aria-pressed', 'true')
  await user.type(screen.getByLabelText('Título'), 'Monte Fuji')
  await user.click(screen.getByRole('button', { name: 'Difícil' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.createQuest).toHaveBeenCalledWith(expect.objectContaining({ parent_id: 'japao', category_id: CATS.atividade.id })))
})

it('picking One Piece fills the title and suggests Épica', async () => {
  const onePiece = normalizeAniList({ id: 21, title: { english: 'ONE PIECE' }, episodes: null, nextAiringEpisode: { episode: 1141 }, duration: 24, seasonYear: 1999 })
  vi.mocked(catalog.searchCatalog).mockResolvedValue([{ source: 'anilist', external_id: '21', title: 'ONE PIECE', year: 1999, poster_url: null }])
  vi.mocked(catalog.fetchCatalogDetails).mockResolvedValue(onePiece)
  vi.mocked(api.upsertMedia).mockResolvedValue(media({ id: 'm-op', source: 'anilist', title: 'ONE PIECE' }))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Anime' }))
  await user.type(screen.getByLabelText('Buscar no catálogo'), 'one piece')
  await user.click(await screen.findByRole('button', { name: 'ONE PIECE (1999)' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Épica' })).toHaveAttribute('aria-pressed', 'true'))
  expect(screen.getByLabelText('Título')).toHaveValue('ONE PIECE')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.createQuest).toHaveBeenCalledWith(expect.objectContaining({ media_id: 'm-op', difficulty: 'epic', category_id: CATS.anime.id })))
  expect(api.upsertMedia).toHaveBeenCalledWith(onePiece)
})
