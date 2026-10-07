import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { todayISO } from '../lib/dates'
import { CATS, achievement, allCats, appData, completion, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import AchievementFormPage from './AchievementFormPage'
import AchievementsPage from './AchievementsPage'

vi.mock('../data/api')

const routes = [
  { path: '/conquistas', element: <AchievementsPage /> },
  { path: '/conquistas/nova', element: <AchievementFormPage /> },
]
const sevenRestaurants = Array.from({ length: 7 }, (_, i) => quest({ id: `r${i}`, category_id: CATS.restaurante.id }))

it('groups by rarity, shows progress and unlock dates', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({
      categories: allCats(),
      quests: sevenRestaurants,
      completions: sevenRestaurants.map((q, i) => completion({ quest_id: q.id, done_on: `2026-10-0${i + 1}` })),
      achievements: [
        achievement({ name: 'Bons de garfo', rarity: 'silver', rule_category_id: CATS.restaurante.id, rule_count: 10 }),
        achievement({ name: 'Primeira garfada', rarity: 'bronze', rule_category_id: CATS.restaurante.id, rule_count: 1 }),
        achievement({ name: 'Aurora boreal', rarity: 'platinum', kind: 'manual', rule_count: null }),
      ],
    }),
  )
  renderRoute(routes, '/conquistas')
  const headings = await screen.findAllByRole('heading', { level: 2 })
  expect(headings.map((h) => h.textContent)).toEqual(['Platina 0/1', 'Prata 0/1', 'Bronze 1/1'])
  expect(screen.getByText('7/10')).toBeInTheDocument()
  expect(screen.getByText('Desbloqueada em 01/10/2026')).toBeInTheDocument()
})

it('unlocks a manual achievement on a chosen date', async () => {
  const aurora = achievement({ id: 'aurora', name: 'Aurora boreal', kind: 'manual', rule_count: null })
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), achievements: [aurora] }))
  const user = userEvent.setup()
  renderRoute(routes, '/conquistas')
  await user.click(await screen.findByRole('button', { name: 'Desbloquear' }))
  expect(screen.getByLabelText('Data do desbloqueio')).toHaveValue(todayISO())
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(api.setManualUnlock).toHaveBeenCalledWith('aurora', todayISO())
})

it('creates an automatic achievement', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats() }))
  const user = userEvent.setup()
  const router = renderRoute(routes, '/conquistas/nova')
  await user.type(await screen.findByLabelText('Nome'), 'Rodízio')
  await user.selectOptions(screen.getByLabelText('Raridade'), 'gold')
  await user.selectOptions(screen.getByLabelText('Categoria'), CATS.restaurante.id)
  await user.clear(screen.getByLabelText('Quantidade'))
  await user.type(screen.getByLabelText('Quantidade'), '10')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/conquistas'))
  expect(api.saveAchievement).toHaveBeenCalledWith({
    id: undefined, name: 'Rodízio', description: '', icon: 'trophy', rarity: 'gold', kind: 'auto',
    rule_category_id: CATS.restaurante.id, rule_min_difficulty: null, rule_count: 10, manual_unlocked_on: null,
  })
})

it('a manual achievement has no rule', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats() }))
  const user = userEvent.setup()
  renderRoute(routes, '/conquistas/nova')
  await user.type(await screen.findByLabelText('Nome'), 'Acampar')
  await user.click(screen.getByRole('button', { name: 'Manual' }))
  expect(screen.queryByLabelText('Quantidade')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() =>
    expect(api.saveAchievement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'manual', rule_category_id: null, rule_min_difficulty: null, rule_count: null })),
  )
})

it('editing an achievement that no longer exists shows a readable not-found hero', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats() }))
  renderRoute([{ path: '/conquistas/:id/editar', element: <AchievementFormPage /> }], '/conquistas/sumiu/editar')
  expect(await screen.findByRole('heading', { level: 1, name: 'Conquista não encontrada' })).toBeInTheDocument()
})

it('the manual unlock row wraps instead of being clipped by the medal frame', async () => {
  const aurora = achievement({ id: 'aurora', name: 'Aurora boreal', kind: 'manual', rule_count: null })
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), achievements: [aurora] }))
  const user = userEvent.setup()
  renderRoute(routes, '/conquistas')
  await user.click(await screen.findByRole('button', { name: 'Desbloquear' }))
  expect(screen.getByRole('button', { name: 'Confirmar' }).parentElement).toHaveClass('flex-wrap')
})

it('a manual unlock cannot be confirmed with an empty or future date', async () => {
  const aurora = achievement({ id: 'aurora', name: 'Aurora boreal', kind: 'manual', rule_count: null })
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), achievements: [aurora] }))
  const user = userEvent.setup()
  renderRoute(routes, '/conquistas')
  await user.click(await screen.findByRole('button', { name: 'Desbloquear' }))
  const date = screen.getByLabelText('Data do desbloqueio')
  fireEvent.change(date, { target: { value: '2999-01-01' } })
  expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  fireEvent.change(date, { target: { value: '' } })
  expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
})
