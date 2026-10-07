import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { CATS, allCats, appData, completion, quest, questType } from '../test/fixtures'
import DrawDialog from './DrawDialog'

vi.mock('./DrawConstellation', () => ({
  default: ({ onDone }: { onDone: () => void }) => <button type="button" onClick={onDone}>constelação</button>,
}))
afterEach(() => vi.unstubAllGlobals())

const brabus = quest({ id: 'brabus', title: 'Brabus Burguer', category_id: CATS.restaurante.id, type_id: 't-burger', city: 'Ribeirão Preto', difficulty: 'easy' })
const forno = quest({ id: 'forno', title: 'Forno a Lenha', category_id: CATS.restaurante.id, type_id: 't-pizza', city: 'São Paulo', difficulty: 'medium' })
const interstellar = quest({ id: 'interstellar', title: 'Interstellar', category_id: CATS.filme.id, difficulty: 'hard' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: CATS.filme.id })
const data = appData({
  categories: allCats(),
  questTypes: [
    questType({ id: 't-burger', category_id: CATS.restaurante.id, name: 'Hamburgueria' }),
    questType({ id: 't-pizza', category_id: CATS.restaurante.id, name: 'Pizzaria' }),
  ],
  quests: [brabus, forno, interstellar, matrix],
  completions: [completion({ quest_id: 'matrix' })],
})
const open = (categoryId: string | null = null) =>
  render(<MemoryRouter><DrawDialog data={data} categoryId={categoryId} onClose={() => {}} /></MemoryRouter>)
const button = (name: string) => screen.getByRole('button', { name })
const draw = () => within(screen.getByRole('dialog', { name: 'Sorteio' })).getByRole('button', { name: 'Sortear' })
const withMotion = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))

it('opens on the filters with the page category marked and counts the pool live', async () => {
  const user = userEvent.setup()
  open(CATS.restaurante.id)
  expect(button('Restaurante')).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('2 quests no sorteio')).toBeInTheDocument()
  await user.click(button('Fácil'))
  expect(screen.getByText('1 quest no sorteio')).toBeInTheDocument()
})

it('types show for the chosen category and are cleared when it changes', async () => {
  const user = userEvent.setup()
  open(CATS.restaurante.id)
  await user.click(button('Pizzaria'))
  expect(screen.getByText('1 quest no sorteio')).toBeInTheDocument()
  await user.click(button('Filme'))
  expect(screen.queryByRole('button', { name: 'Pizzaria' })).not.toBeInTheDocument()
  await user.click(button('Restaurante'))
  expect(button('Pizzaria')).toHaveAttribute('aria-pressed', 'false')
})

it('cities narrow the draw, and no match disables it', async () => {
  const user = userEvent.setup()
  open()
  await user.click(button('Ribeirão Preto'))
  expect(screen.getByText('1 quest no sorteio')).toBeInTheDocument()
  await user.click(button('Difícil'))
  expect(screen.getByText('Nenhuma quest com esses filtros')).toBeInTheDocument()
  expect(draw()).toBeDisabled()
})

it('with reduced motion the result shows right away and Bora! opens the quest', async () => {
  const user = userEvent.setup()
  open(CATS.filme.id)
  await user.click(draw())
  expect(screen.getByText('Interstellar')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Bora!' })).toHaveAttribute('href', '/quests/interstellar')
  expect(screen.queryByRole('button', { name: 'Sortear outra' })).not.toBeInTheDocument()
})

it('Sortear outra never repeats the last quest, and Filtros keeps the choices', async () => {
  const user = userEvent.setup()
  open(CATS.restaurante.id)
  await user.click(draw())
  const first = screen.getByRole('link', { name: 'Bora!' }).getAttribute('href')
  await user.click(button('Sortear outra'))
  expect(screen.getByRole('link', { name: 'Bora!' }).getAttribute('href')).not.toBe(first)
  await user.click(button('Filtros'))
  expect(button('Restaurante')).toHaveAttribute('aria-pressed', 'true')
})

it('with motion on it plays the constellation, and Pular jumps to the result', async () => {
  withMotion()
  const user = userEvent.setup()
  open(CATS.filme.id)
  await user.click(draw())
  expect(await screen.findByRole('button', { name: 'constelação' })).toBeInTheDocument()
  await user.click(button('Pular'))
  expect(screen.getByRole('link', { name: 'Bora!' })).toHaveAttribute('href', '/quests/interstellar')
})

it('when the constellation ends, the result appears', async () => {
  withMotion()
  const user = userEvent.setup()
  open(CATS.filme.id)
  await user.click(draw())
  await user.click(await screen.findByRole('button', { name: 'constelação' }))
  expect(screen.getByRole('link', { name: 'Bora!' })).toBeInTheDocument()
})

it('filter chips keep dark text on their light background over the night sky', () => {
  open(CATS.restaurante.id)
  for (const group of screen.getAllByRole('group')) {
    for (const chip of within(group).getAllByRole('button')) expect(chip).toHaveClass('text-ink')
  }
})

it('a city picked in another category never hides the quests of the new one', async () => {
  const user = userEvent.setup()
  open()
  await user.click(button('Ribeirão Preto'))
  await user.click(button('Filme'))
  expect(screen.getByText('1 quest no sorteio')).toBeInTheDocument()
  expect(draw()).toBeEnabled()
})

it('Escape closes the draw', async () => {
  const onClose = vi.fn()
  render(<MemoryRouter><DrawDialog data={data} categoryId={null} onClose={onClose} /></MemoryRouter>)
  await userEvent.setup().keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})

it('the result takes the focus and is announced', async () => {
  const user = userEvent.setup()
  open(CATS.filme.id)
  await user.click(draw())
  expect(screen.getByRole('link', { name: 'Bora!' })).toHaveFocus()
  expect(screen.getByText('Sorteada: Interstellar')).toHaveAttribute('aria-live', 'polite')
})

it('Pular has the focus while the constellation plays', async () => {
  withMotion()
  const user = userEvent.setup()
  open(CATS.filme.id)
  await user.click(draw())
  expect(await screen.findByRole('button', { name: 'Pular' })).toHaveFocus()
})

it('difficulty chips show their gems', () => {
  open()
  expect(button('Fácil').querySelectorAll('.gem')).toHaveLength(4)
})
