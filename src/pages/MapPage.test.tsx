import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import type { Pin } from '../lib/map'
import { CATS, allCats, appData, completion, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import MapPage from './MapPage'

vi.mock('../data/api')
vi.mock('../components/QuestMap', () => ({
  default: ({ pins, onPick }: { pins: Pin[]; onPick: (p: Pin) => void }) => (
    <div>
      {pins.map((p) => (
        <button key={p.key} type="button" onClick={() => onPick(p)}>{`alfinete ${p.quests.map((q) => q.title).join(' + ')}`}</button>
      ))}
    </div>
  ),
}))

const brabus = quest({ id: 'brabus', title: 'Brabus', category_id: CATS.restaurante.id, city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', place_label: 'Brabus, Ribeirão Preto, São Paulo, Brasil', lat: -21.1775, lng: -47.8103 })
const sushi = quest({ id: 'sushi', title: 'Akira Sushi', category_id: CATS.restaurante.id, city: 'Ribeirão Preto', lat: -21.1775, lng: -47.8103 })
const rio = quest({ id: 'rio', title: 'Batata', category_id: CATS.restaurante.id, lat: -22.9, lng: -43.17 })
const legacy = quest({ id: 'legacy', title: 'Pastel', category_id: CATS.restaurante.id, city: 'Santos' })

beforeEach(() => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), quests: [brabus, sushi, rio, legacy], completions: [completion({ quest_id: 'rio' })] }))
})
const open = () => renderRoute([{ path: '/mapa', element: <MapPage /> }, { path: '/quests/:id', element: <p>quest</p> }], '/mapa')

it('a pin opens a card with each quest there, linked; Fechar closes it', async () => {
  const user = userEvent.setup()
  open()
  await user.click(await screen.findByRole('button', { name: 'alfinete Akira Sushi + Brabus' }))
  const card = screen.getByRole('region', { name: 'Neste ponto' })
  expect(within(card).getByRole('link', { name: /Brabus/ })).toHaveAttribute('href', '/quests/brabus')
  expect(within(card).getByRole('link', { name: /Akira Sushi/ })).toHaveAttribute('href', '/quests/sushi')
  expect(within(card).getByText('Brabus, Ribeirão Preto, São Paulo, Brasil')).toBeInTheDocument()
  await user.click(within(card).getByRole('button', { name: 'Fechar' }))
  expect(screen.queryByRole('region', { name: 'Neste ponto' })).not.toBeInTheDocument()
})

it('Pendentes and Feitas filter the pins, and changing the filter closes the card', async () => {
  const user = userEvent.setup()
  open()
  await user.click(await screen.findByRole('button', { name: 'alfinete Batata' }))
  await user.click(screen.getByRole('tab', { name: 'Pendentes' }))
  expect(screen.queryByRole('button', { name: 'alfinete Batata' })).not.toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Neste ponto' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Feitas' }))
  expect(screen.getByRole('button', { name: 'alfinete Batata' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'alfinete Akira Sushi + Brabus' })).not.toBeInTheDocument()
})

it('lists the quests with a place but no position, linked to edit', async () => {
  open()
  expect(await screen.findByText('1 quest com lugar fora do mapa:')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Pastel' })).toHaveAttribute('href', '/quests/legacy/editar')
})

it('without pins it says how to put quests on the map', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), quests: [legacy] }))
  open()
  expect(await screen.findByText('Nenhuma quest no mapa ainda. Escolham o lugar pela busca no formulário.')).toBeInTheDocument()
})
