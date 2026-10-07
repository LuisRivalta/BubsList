import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import Icon, { ICONS, IconPicker } from './Icon'

const seed = Object.values(
  import.meta.glob('/supabase/migrations/*_seed.sql', { query: '?raw', import: 'default', eager: true }),
)[0] as string

it('renders the named icon', () => {
  const { container } = render(<Icon name="plane" />)
  expect(container.querySelector('svg.lucide-plane')).not.toBeNull()
})

it('falls back to sparkles for an unknown name (e.g. an old emoji value)', () => {
  const { container } = render(<Icon name={String.fromCodePoint(0x2708, 0xfe0f)} />)
  expect(container.querySelector('svg.lucide-sparkles')).not.toBeNull()
})

it('every icon used by the seed exists', () => {
  const notIcons = new Set(['general', 'movie', 'series', 'anime', 'bronze', 'silver', 'gold', 'platinum', 'auto', 'manual', 'hard', 'epic'])
  const used = [...seed.matchAll(/'([a-z0-9]+(?:-[a-z0-9]+)*)'/g)].map((m) => m[1]).filter((t) => !notIcons.has(t))
  expect(used.length).toBeGreaterThan(30)
  expect(used.filter((name) => !(name in ICONS))).toEqual([])
})

it('the picker reports the chosen icon', async () => {
  const onChange = vi.fn()
  render(<IconPicker value="plane" onChange={onChange} />)
  expect(screen.getByRole('radio', { name: 'Avião' })).toHaveAttribute('aria-checked', 'true')
  await userEvent.click(screen.getByRole('radio', { name: 'Livro' }))
  expect(onChange).toHaveBeenCalledWith('book-open')
})
