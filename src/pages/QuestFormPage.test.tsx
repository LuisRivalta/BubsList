import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { normalizeAniList } from '../../supabase/functions/_shared/catalog'
import * as api from '../data/api'
import * as catalog from '../lib/catalog'
import { CATS, allCats, appData, media, quest, questType } from '../test/fixtures'
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
    parent_id: null, category_id: CATS.restaurante.id, title: 'Batata do Marechal', notes: null, difficulty: 'medium', media_id: null, type_id: null, city: null,
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

it('editing a quest that no longer exists shows a readable not-found hero', async () => {
  renderRoute([{ path: '/quests/:id/editar', element: <QuestFormPage /> }], '/quests/sumiu/editar')
  expect(await screen.findByRole('heading', { level: 1, name: 'Quest não encontrada' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Voltar para as quests' })).toHaveAttribute('href', '/')
})

it('a link from a category page preselects that category', async () => {
  renderRoute(routes, `/quests/nova?categoria=${CATS.restaurante.id}`)
  expect(await screen.findByRole('button', { name: 'Restaurante' })).toHaveAttribute('aria-pressed', 'true')
})

const burger = questType({ id: 't-burger', category_id: CATS.restaurante.id, name: 'Hamburgueria' })
const scifi = questType({ id: 't-scifi', category_id: CATS.filme.id, name: 'Ficção científica' })
const withTypes = (o: Parameters<typeof appData>[0] = {}) =>
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), questTypes: [burger, scifi], quests: [japao], ...o }))

it('types follow the category; a new type is created and selected', async () => {
  withTypes()
  vi.mocked(api.saveQuestType).mockResolvedValue(questType({ id: 't-new', category_id: CATS.restaurante.id, name: 'Pizzaria' }))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  expect(screen.getByRole('button', { name: 'Hamburgueria' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ficção científica' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Novo tipo' }))
  await user.type(screen.getByLabelText('Nome do novo tipo'), 'Pizzaria')
  await user.click(screen.getByRole('button', { name: 'Criar' }))
  expect(api.saveQuestType).toHaveBeenCalledWith({ category_id: CATS.restaurante.id, name: 'Pizzaria' })
  expect(await screen.findByRole('button', { name: 'Pizzaria' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: 'Filme' }))
  expect(screen.getByRole('button', { name: 'Nenhum' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Ficção científica' })).toBeInTheDocument()
})

it('a new type with an existing name selects the existing one', async () => {
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.click(screen.getByRole('button', { name: 'Novo tipo' }))
  await user.type(screen.getByLabelText('Nome do novo tipo'), ' hamburgueria')
  await user.click(screen.getByRole('button', { name: 'Criar' }))
  expect(api.saveQuestType).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Hamburgueria' })).toHaveAttribute('aria-pressed', 'true')
})

it('saves the chosen type and the trimmed city', async () => {
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.click(screen.getByRole('button', { name: 'Hamburgueria' }))
  await user.type(screen.getByLabelText('Título'), 'Brabus Burguer')
  await user.click(screen.getByRole('button', { name: 'Fácil' }))
  await user.type(screen.getByLabelText(/Cidade/), '  Ribeirão Preto ')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.createQuest).toHaveBeenCalledWith(expect.objectContaining({ type_id: 't-burger', city: 'Ribeirão Preto' })))
})

it('a new subquest starts with the city of its parent', async () => {
  withTypes({ quests: [quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, city: 'Tóquio' })] })
  renderRoute(routes, '/quests/nova?parent=japao')
  expect(await screen.findByLabelText(/Cidade/)).toHaveValue('Tóquio')
})

it('editing a quest whose type was deleted shows Nenhum', async () => {
  withTypes({ quests: [quest({ id: 'velha', title: 'Velha', category_id: CATS.restaurante.id, type_id: 't-apagado' })] })
  renderRoute([{ path: '/quests/:id/editar', element: <QuestFormPage /> }], '/quests/velha/editar')
  expect(await screen.findByRole('button', { name: 'Nenhum' })).toHaveAttribute('aria-pressed', 'true')
})

it('a catalog genre selects the matching type, or offers to create it', async () => {
  const anime = (genres: string[]) =>
    ({ ...normalizeAniList({ id: 21, title: { english: 'ONE PIECE' }, episodes: 1100, duration: 24, seasonYear: 1999 }), genres })
  vi.mocked(catalog.searchCatalog).mockResolvedValue([{ source: 'anilist', external_id: '21', title: 'ONE PIECE', year: 1999, poster_url: null }])
  withTypes({ questTypes: [questType({ id: 't-adv', category_id: CATS.anime.id, name: 'Aventura' })] })
  vi.mocked(catalog.fetchCatalogDetails).mockResolvedValue(anime(['Ação', 'aventura']))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Anime' }))
  await user.type(screen.getByLabelText('Buscar no catálogo'), 'one piece')
  await user.click(await screen.findByRole('button', { name: 'ONE PIECE (1999)' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Aventura' })).toHaveAttribute('aria-pressed', 'true'))
})

it('a catalog genre that is not a type yet becomes a one-tap shortcut', async () => {
  vi.mocked(catalog.searchCatalog).mockResolvedValue([{ source: 'anilist', external_id: '21', title: 'ONE PIECE', year: 1999, poster_url: null }])
  vi.mocked(catalog.fetchCatalogDetails).mockResolvedValue({
    ...normalizeAniList({ id: 21, title: { english: 'ONE PIECE' }, episodes: 1100, duration: 24, seasonYear: 1999 }),
    genres: ['Comédia'],
  })
  vi.mocked(api.saveQuestType).mockResolvedValue(questType({ id: 't-com', category_id: CATS.anime.id, name: 'Comédia' }))
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Anime' }))
  await user.type(screen.getByLabelText('Buscar no catálogo'), 'one piece')
  await user.click(await screen.findByRole('button', { name: 'ONE PIECE (1999)' }))
  await user.click(await screen.findByRole('button', { name: 'Comédia' }))
  expect(api.saveQuestType).toHaveBeenCalledWith({ category_id: CATS.anime.id, name: 'Comédia' })
  expect(await screen.findByRole('button', { name: 'Comédia' })).toHaveAttribute('aria-pressed', 'true')
})
