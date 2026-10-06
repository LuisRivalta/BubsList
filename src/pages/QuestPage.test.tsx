import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import * as api from '../data/api'
import * as catalog from '../lib/catalog'
import { CATS, PARTNER, allCats, appData, completion, media, quest, review } from '../test/fixtures'
import { renderRoute } from '../test/render'
import QuestPage from './QuestPage'

vi.mock('../data/api')
vi.mock('../lib/catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/catalog')>()),
  fetchCatalogDetails: vi.fn(),
}))

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', category_id: CATS.viagem.id })
const ichiran = quest({ id: 'ichiran', parent_id: 'toquio', title: 'Ichiran', category_id: CATS.restaurante.id })
const tonkotsu = quest({ id: 'tonkotsu', parent_id: 'ichiran', title: 'Comer o tonkotsu', category_id: CATS.atividade.id })
const routes = [
  { path: '/quests/:id', element: <QuestPage /> },
  { path: '/quests/:id/concluir', element: <p>concluir</p> },
  { path: '/', element: <p>home</p> },
]
const load = (o: Parameters<typeof appData>[0]) => vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), ...o }))

it('shows the path, subquests and both reviews', async () => {
  load({
    quests: [japao, toquio, ichiran, tonkotsu],
    completions: [completion({ id: 'c1', quest_id: 'ichiran', done_on: '2026-10-05' })],
    reviews: [review({ completion_id: 'c1', user_id: PARTNER, rating: 4, body: 'Muito bom' })],
  })
  renderRoute(routes, '/quests/ichiran')
  const nav = await screen.findByRole('navigation', { name: 'Caminho' })
  expect(within(nav).getByRole('link', { name: 'Japão' })).toHaveAttribute('href', '/quests/japao')
  expect(within(nav).getByRole('link', { name: 'Tóquio' })).toHaveAttribute('href', '/quests/toquio')
  expect(screen.getByText('Comer o tonkotsu')).toBeInTheDocument()
  expect(screen.getByLabelText('4 de 5 estrelas')).toBeInTheDocument()
  expect(screen.getByText('Muito bom')).toBeInTheDocument()
  expect(screen.getByText(/05\/10\/2026/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Escrever minha resenha' })).toHaveAttribute('href', '/quests/ichiran/concluir?completion=c1')
  expect(screen.getByRole('link', { name: 'Fazer de novo' })).toBeInTheDocument()
})

const dark = (progress_season: number, progress_episode: number) =>
  quest({ id: 'dark', title: 'Dark', category_id: CATS.serie.id, media_id: 'm1', progress_season, progress_episode })
const darkMedia = media({ id: 'm1', source: 'tmdb_tv', seasons: [{ season: 1, episodes: 10 }, { season: 2, episodes: 8 }] })

it('+1 episódio jumps to the next season', async () => {
  load({ quests: [dark(1, 10)], media: [darkMedia] })
  const user = userEvent.setup()
  renderRoute(routes, '/quests/dark')
  expect(await screen.findByText('T1 E10')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '+1 episódio' }))
  expect(api.setProgress).toHaveBeenCalledWith('dark', { season: 2, episode: 1 })
})

it('+1 at the last episode offers to complete', async () => {
  load({ quests: [dark(2, 8)], media: [darkMedia] })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/dark')
  await user.click(await screen.findByRole('button', { name: '+1 episódio' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/quests/dark/concluir'))
  expect(api.setProgress).not.toHaveBeenCalled()
})

it('deleting warns about every subquest and sends all data for photo cleanup', async () => {
  load({ quests: [japao, toquio, ichiran, tonkotsu] })
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao')
  await user.click(await screen.findByRole('button', { name: 'Excluir' }))
  expect(confirm).toHaveBeenCalledWith('Excluir "Japão" e 3 subquest(s)?')
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(api.deleteQuest).toHaveBeenCalledWith('japao', expect.objectContaining({ quests: expect.arrayContaining([tonkotsu]) }))
})

it('refreshes catalog data older than 7 days', async () => {
  const stale = media({ id: 'm1', external_id: '70523', fetched_at: new Date(Date.now() - 10 * 864e5).toISOString() })
  load({ quests: [dark(1, 1)], media: [stale] })
  vi.mocked(catalog.fetchCatalogDetails).mockResolvedValue({ ...stale, runtime_minutes: 45 })
  renderRoute(routes, '/quests/dark')
  await waitFor(() => expect(catalog.fetchCatalogDetails).toHaveBeenCalledWith('tmdb_tv', '70523'))
})

it('does not refresh fresh catalog data', async () => {
  load({ quests: [dark(1, 1)], media: [darkMedia] })
  renderRoute(routes, '/quests/dark')
  await screen.findByText('T1 E1')
  expect(catalog.fetchCatalogDetails).not.toHaveBeenCalled()
})

it('the progress editor shows the latest progress after +1', async () => {
  vi.mocked(api.loadAll)
    .mockResolvedValueOnce(appData({ categories: allCats(), quests: [dark(1, 10)], media: [darkMedia] }))
    .mockResolvedValue(appData({ categories: allCats(), quests: [dark(2, 1)], media: [darkMedia] }))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/dark')
  await user.click(await screen.findByRole('button', { name: '+1 episódio' }))
  expect(await screen.findByText('T2 E1')).toBeInTheDocument()
  await user.click(screen.getByText('Editar progresso'))
  expect(screen.getByLabelText('Temporada')).toHaveValue(2)
  expect(screen.getByLabelText('Episódio')).toHaveValue(1)
})
