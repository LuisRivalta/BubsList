import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { todayISO } from '../lib/dates'
import { CATS, ME, achievement, allCats, appData, completion, quest, review } from '../test/fixtures'
import { renderRoute } from '../test/render'
import CompletePage from './CompletePage'

vi.mock('../data/api')

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id })
const routes = [
  { path: '/quests/:id/concluir', element: <CompletePage /> },
  { path: '/quests/:id', element: <p>página da quest</p> },
]
const load = (o: Parameters<typeof appData>[0] = {}) =>
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), quests: [japao], ...o }))

beforeEach(() => {
  vi.mocked(api.createCompletion).mockResolvedValue(completion({ id: 'c-new', quest_id: 'japao', done_on: todayISO() }))
  vi.mocked(api.saveReview).mockResolvedValue(review({ id: 'r-new', completion_id: 'c-new' }))
})

it('creates the completion and my review', async () => {
  load()
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao/concluir')
  await user.click(await screen.findByRole('radio', { name: '4 estrelas' }))
  await user.type(screen.getByLabelText(/O que achou/), 'Inesquecível')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/quests/japao'))
  expect(api.createCompletion).toHaveBeenCalledWith('japao', todayISO())
  expect(api.saveReview).toHaveBeenCalledWith({ id: undefined, completion_id: 'c-new', rating: 4, body: 'Inesquecível' })
})

it('rejects a future date', async () => {
  load()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/japao/concluir')
  fireEvent.change(await screen.findByLabelText('Quando vocês fizeram?'), { target: { value: '2999-01-01' } })
  await user.click(screen.getByRole('button', { name: 'Pular resenha' }))
  expect(screen.getByRole('alert')).toHaveTextContent('A data não pode ser no futuro.')
  expect(api.createCompletion).not.toHaveBeenCalled()
})

it('skipping the review only saves the completion', async () => {
  load()
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao/concluir')
  await user.click(await screen.findByRole('button', { name: 'Pular resenha' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/quests/japao'))
  expect(api.saveReview).not.toHaveBeenCalled()
})

it('asks for a rating when there is text', async () => {
  load()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/japao/concluir')
  await user.type(await screen.findByLabelText(/O que achou/), 'Legal')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dê uma nota para salvar a resenha.')
  expect(api.createCompletion).not.toHaveBeenCalled()
})

it('celebrates newly unlocked achievements', async () => {
  load({ achievements: [achievement({ name: 'Primeira quest', icon: '⭐', rule_count: 1 })] })
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao/concluir')
  await user.click(await screen.findByRole('button', { name: 'Pular resenha' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('Primeira quest')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Continuar' }))
  expect(router.state.location.pathname).toBe('/quests/japao')
})

it('edits the date and my existing review', async () => {
  load({
    completions: [completion({ id: 'c1', quest_id: 'japao', done_on: '2026-01-10' })],
    reviews: [review({ id: 'r1', completion_id: 'c1', user_id: ME, rating: 3 })],
  })
  vi.mocked(api.saveReview).mockResolvedValue(review({ id: 'r1', completion_id: 'c1' }))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/japao/concluir?completion=c1')
  expect(await screen.findByRole('radio', { name: '3 estrelas' })).toHaveAttribute('aria-checked', 'true')
  fireEvent.change(screen.getByLabelText('Quando vocês fizeram?'), { target: { value: '2026-01-11' } })
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.updateCompletion).toHaveBeenCalledWith('c1', '2026-01-11'))
  expect(api.saveReview).toHaveBeenCalledWith({ id: 'r1', completion_id: 'c1', rating: 3, body: null })
  expect(api.createCompletion).not.toHaveBeenCalled()
})

it('retrying after the review failed reuses the completion it already created', async () => {
  load()
  vi.mocked(api.saveReview)
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce(review({ id: 'r-new', completion_id: 'c-new' }))
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao/concluir')
  await user.click(await screen.findByRole('radio', { name: '5 estrelas' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/quests/japao'))
  expect(api.createCompletion).toHaveBeenCalledTimes(1)
  expect(api.saveReview).toHaveBeenLastCalledWith({ id: undefined, completion_id: 'c-new', rating: 5, body: null })
})
