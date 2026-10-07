import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import * as story from '../lib/story'
import { CATS, ME, PARTNER, allCats, appData, completion, media, quest, review } from '../test/fixtures'
import { renderRoute } from '../test/render'
import WrappedPage from './WrappedPage'

vi.mock('../data/api')
vi.mock('../components/SkyScene', () => ({ default: () => null }))
vi.mock('../lib/story', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/story')>()),
  drawStory: vi.fn(),
  shareOrDownload: vi.fn(),
}))

const batata = quest({ id: 'batata', title: 'Batata do Marechal', category_id: CATS.restaurante.id, difficulty: 'hard', media_id: 'm1' })
const poster = media({ id: 'm1', poster_url: 'https://image.tmdb.org/batata.jpg' })
const routes = [
  { path: '/retrospectiva/:year', element: <WrappedPage /> },
  { path: '/relatorio', element: <p>relatório</p> },
]
const open = (year = '2026') => renderRoute(routes, `/retrospectiva/${year}`)
const intro = () => screen.findByRole('heading', { level: 2, name: '2026' })

beforeEach(() => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({
      categories: allCats(),
      media: [poster],
      quests: [batata],
      completions: [completion({ id: 'c1', quest_id: 'batata', done_on: '2026-03-10' })],
      reviews: [review({ completion_id: 'c1', user_id: ME, rating: 5 }), review({ completion_id: 'c1', user_id: PARTNER, rating: 2 })],
    }),
  )
  vi.mocked(story.drawStory).mockResolvedValue(new Blob(['png']))
  vi.mocked(story.shareOrDownload).mockResolvedValue()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('opens on the intro and steps forward and back', async () => {
  const user = userEvent.setup()
  open()
  expect(await intro()).toBeInTheDocument()
  expect(screen.getByText('de Luis & Bubs')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Próxima' }))
  expect(screen.getByText('No ano, vocês concluíram')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Anterior' }))
  expect(await intro()).toBeInTheDocument()
})

it('arrow keys navigate and Escape goes back to the report', async () => {
  const router = open()
  await intro()
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  expect(screen.getByText('No ano, vocês concluíram')).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'Escape' })
  await waitFor(() => expect(router.state.location.pathname).toBe('/relatorio'))
})

it('Fechar goes back to the report', async () => {
  const user = userEvent.setup()
  const router = open()
  await intro()
  await user.click(screen.getByRole('button', { name: 'Fechar' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/relatorio'))
})

it('sharing draws the current slide and stays on it', async () => {
  const user = userEvent.setup()
  open()
  await intro()
  await user.click(screen.getByRole('button', { name: 'Próxima' }))
  await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
  expect(story.drawStory).toHaveBeenCalledWith(expect.objectContaining({ big: '1 quest' }), 2026, null)
  expect(story.shareOrDownload).toHaveBeenCalledWith(expect.any(Blob), 'bubs2do-2026-total.png')
  expect(screen.getByText('No ano, vocês concluíram')).toBeInTheDocument()
})

it('a failed share shows a message and frees the button', async () => {
  vi.mocked(story.drawStory).mockRejectedValue(new Error('canvas'))
  const user = userEvent.setup()
  open()
  await intro()
  await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não deu para gerar a imagem.')
  expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeEnabled()
})

it('a cover that fails to load is hidden', async () => {
  const user = userEvent.setup()
  open()
  await intro()
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Próxima' }))
  expect(screen.getByText('A mais difícil')).toBeInTheDocument()
  const cover = document.querySelector<HTMLImageElement>('img[src="https://image.tmdb.org/batata.jpg"]')!
  fireEvent.error(cover)
  expect(cover).not.toBeVisible()
})

it('with reduced motion the slides never advance on their own', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  open()
  await intro()
  act(() => {
    vi.advanceTimersByTime(7000)
  })
  expect(screen.getByRole('heading', { level: 2, name: '2026' })).toBeInTheDocument()
})

it('with motion on, a slide advances after 6 seconds', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.useFakeTimers({ shouldAdvanceTime: true })
  open()
  await intro()
  act(() => {
    vi.advanceTimersByTime(6100)
  })
  expect(screen.getByText('No ano, vocês concluíram')).toBeInTheDocument()
})

it('an invalid year or a year without completions goes back to the report', async () => {
  const router = open('2025')
  await waitFor(() => expect(router.state.location.pathname).toBe('/relatorio'))
  const other = open('abc')
  await waitFor(() => expect(other.state.location.pathname).toBe('/relatorio'))
})
