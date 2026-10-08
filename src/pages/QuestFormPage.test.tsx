import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { normalizeAniList } from '../../supabase/functions/_shared/catalog'
import * as api from '../data/api'
import * as catalog from '../lib/catalog'
import * as place from '../lib/place'
import { CATS, allCats, appData, media, quest, questType } from '../test/fixtures'
import { renderRoute } from '../test/render'
import QuestFormPage from './QuestFormPage'

vi.mock('../data/api')
vi.mock('../lib/catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/catalog')>()),
  searchCatalog: vi.fn(),
  fetchCatalogDetails: vi.fn(),
}))
vi.mock('../lib/place', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/place')>()),
  searchPlaces: vi.fn(),
}))

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id })
const routes = [
  { path: '/quests/nova', element: <QuestFormPage /> },
  { path: '/quests/:id', element: <p>página da quest</p> },
]

beforeEach(() => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), quests: [japao] }))
  vi.mocked(api.createQuest).mockResolvedValue(quest({ id: 'new-q' }))
  vi.mocked(place.searchPlaces).mockResolvedValue([])
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
    state: null, country: null, place_label: null, lat: null, lng: null, scheduled_on: null, scheduled_time: null,
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

it('saves the chosen type, and text typed in Local without picking becomes the city', async () => {
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.click(screen.getByRole('button', { name: 'Hamburgueria' }))
  await user.type(screen.getByLabelText('Título'), 'Brabus Burguer')
  await user.click(screen.getByRole('button', { name: 'Fácil' }))
  await user.type(screen.getByLabelText(/Local/), '  Ribeirão Preto ')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() =>
    expect(api.createQuest).toHaveBeenCalledWith(expect.objectContaining({ type_id: 't-burger', city: 'Ribeirão Preto', state: null, country: null, place_label: null })),
  )
})

it('a new subquest shows the place it inherits and stores none of its own', async () => {
  withTypes({ quests: [quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, city: 'Tóquio', country: 'Japão' })] })
  renderRoute(routes, '/quests/nova?parent=japao')
  expect(await screen.findByText('Herdado: Tóquio, Japão')).toBeInTheDocument()
  expect(screen.getByLabelText(/Local/)).toHaveValue('')
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

const ribeirao = { city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', label: 'Ribeirão Preto, São Paulo, Brasil', lat: -21.17, lng: -47.81 }

it('Local only shows for categories with a physical place', async () => {
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  expect(screen.getByLabelText(/Local/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Anime' }))
  expect(screen.queryByLabelText(/Local/)).not.toBeInTheDocument()
})

it('typing alone never searches; Buscar does, and picking a suggestion saves the whole place', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockResolvedValue([ribeirao])
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText('Título'), 'Brabus')
  await user.click(screen.getByRole('button', { name: 'Fácil' }))
  await user.type(screen.getByLabelText(/Local/), 'Ribeirão')
  await new Promise((r) => setTimeout(r, 700))
  expect(place.searchPlaces).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await user.click(await screen.findByRole('button', { name: 'Ribeirão Preto, São Paulo, Brasil' }))
  expect(place.searchPlaces).toHaveBeenCalledTimes(1)
  expect(vi.mocked(place.searchPlaces).mock.calls[0][0]).toBe('Ribeirão')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() =>
    expect(api.createQuest).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', place_label: 'Ribeirão Preto, São Paulo, Brasil', lat: -21.17, lng: -47.81 }),
    ),
  )
})

it('Enter in Local searches instead of saving the form', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockResolvedValue([ribeirao])
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText(/Local/), 'Ribeirão{Enter}')
  expect(await screen.findByRole('button', { name: 'Ribeirão Preto, São Paulo, Brasil' })).toBeInTheDocument()
  expect(api.createQuest).not.toHaveBeenCalled()
})

it('× clears the chosen place', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockResolvedValue([ribeirao])
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText(/Local/), 'Ribeirão')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await user.click(await screen.findByRole('button', { name: 'Ribeirão Preto, São Paulo, Brasil' }))
  await user.click(screen.getByRole('button', { name: 'Limpar local' }))
  expect(screen.getByLabelText(/Local/)).toHaveValue('')
})

it('a failed search says so', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockRejectedValue(new Error('offline'))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText(/Local/), 'Ribeirão')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não deu para buscar agora')
})

it('moving a quest to a category without a physical place keeps its stored place', async () => {
  withTypes({ quests: [quest({ id: 'brabus', title: 'Brabus', category_id: CATS.restaurante.id, city: 'Ribeirão Preto', country: 'Brasil', place_label: 'Ribeirão Preto, Brasil' })] })
  const user = userEvent.setup()
  renderRoute([{ path: '/quests/:id/editar', element: <QuestFormPage /> }, { path: '/quests/:id', element: <p>quest</p> }], '/quests/brabus/editar')
  await user.click(await screen.findByRole('button', { name: 'Atividade' }))
  await user.click(screen.getByRole('button', { name: 'Anime' }))
  expect(screen.queryByLabelText(/Local/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.updateQuest).toHaveBeenCalledWith('brabus', expect.objectContaining({ city: 'Ribeirão Preto', country: 'Brasil', place_label: 'Ribeirão Preto, Brasil' })))
})

const saoPaulo = { city: null, state: 'São Paulo', country: 'Brasil', label: 'São Paulo, Brasil', lat: -22, lng: -48 }
const hanging = (_q: string, signal?: AbortSignal) =>
  new Promise<never>((_, reject) => signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))

afterEach(() => vi.useRealTimers())

async function searchRibeirao() {
  const user = userEvent.setup(vi.isFakeTimers() ? { advanceTimers: vi.advanceTimersByTime } : {})
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText(/Local/), 'Ribeirão')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  return user
}

it('a search that never answers gives up after 10 s and says so', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  withTypes()
  vi.mocked(place.searchPlaces).mockImplementation(hanging)
  await searchRibeirao()
  expect(screen.getByText('Buscando…').closest('[role="status"]')).not.toBeNull()
  await act(() => vi.advanceTimersByTimeAsync(10_000))
  expect(screen.getByRole('alert')).toHaveTextContent('Não deu para buscar agora')
})

it('typing again during a search never ends in a false error', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  withTypes()
  vi.mocked(place.searchPlaces).mockImplementation(hanging)
  const user = await searchRibeirao()
  await user.type(screen.getByLabelText(/Local/), ' Preto')
  await act(() => vi.advanceTimersByTimeAsync(10_000))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('screen readers hear how many places came back', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockResolvedValue([ribeirao, saoPaulo])
  await searchRibeirao()
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 lugares encontrados'))
})

it('picking a place moves the focus to Limpar local, and clearing brings it back to the field', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockResolvedValue([ribeirao])
  const user = await searchRibeirao()
  await user.click(await screen.findByRole('button', { name: 'Ribeirão Preto, São Paulo, Brasil' }))
  expect(screen.getByRole('button', { name: 'Limpar local' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Limpar local' }))
  expect(screen.getByLabelText(/Local/)).toHaveFocus()
})
