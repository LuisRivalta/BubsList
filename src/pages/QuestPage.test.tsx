import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import * as api from '../data/api'
import * as catalog from '../lib/catalog'
import { CATS, PARTNER, allCats, appData, completion, media, quest, questType, review } from '../test/fixtures'
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

it('deleting leaves the page without waiting for the reload (no "Quest não encontrada" flash)', async () => {
  load({ quests: [japao] })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao')
  const excluir = await screen.findByRole('button', { name: 'Excluir' })
  vi.mocked(api.loadAll).mockReturnValue(new Promise(() => {}))
  await user.click(excluir)
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
})

it('the hero shows the type and the city', async () => {
  load({
    questTypes: [questType({ id: 't-roteiro', category_id: CATS.viagem.id, name: 'Roteiro' })],
    quests: [quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, type_id: 't-roteiro', city: 'Tóquio' })],
  })
  renderRoute(routes, '/quests/japao')
  expect(await screen.findByText('Roteiro · Tóquio')).toBeInTheDocument()
})

it('a scheduled pending quest shows when, and the calendar link carries it', async () => {
  load({
    quests: [
      quest({ id: 'brabus', title: 'Brabus Burguer', category_id: CATS.restaurante.id, scheduled_on: '2099-01-03', scheduled_time: '20:30:00', city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', place_label: 'Ribeirão Preto, São Paulo, Brasil' }),
    ],
  })
  renderRoute(routes, '/quests/brabus')
  expect(await screen.findByText('Agendada · sáb, 03/01 · 20h30')).toBeInTheDocument()
  const link = screen.getByRole('link', { name: 'Adicionar ao calendário' })
  expect(link).toHaveAttribute('href', '/api/calendario?t=Brabus+Burguer&d=2099-01-03&h=20%3A30&l=Ribeir%C3%A3o+Preto%2C+S%C3%A3o+Paulo%2C+Brasil&id=brabus')
  expect(link).toHaveAttribute('target', '_blank')
})

it('a quest done before and scheduled again (Fazer de novo) shows its new date', async () => {
  load({ quests: [quest({ id: 'cine', title: 'Cinema', category_id: CATS.filme.id, scheduled_on: '2099-01-03' })], completions: [completion({ quest_id: 'cine' })] })
  renderRoute(routes, '/quests/cine')
  expect(await screen.findByText('Agendada · sáb, 03/01')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Adicionar ao calendário' })).toBeInTheDocument()
})
