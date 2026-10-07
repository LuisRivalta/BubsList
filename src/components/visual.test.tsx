import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { achievement } from '../test/fixtures'
import { BeforePaint } from '../test/render'
import Celebration from './Celebration'
import CountUp from './CountUp'
import Gems from './Gems'
import SegmentedControl from './SegmentedControl'
import Stagger from './Stagger'

afterEach(() => vi.unstubAllGlobals())

it('Gems shows the label and fills one gem per level', () => {
  const { container } = render(<Gems difficulty="hard" />)
  expect(screen.getByText('Difícil')).toBeInTheDocument()
  expect(container.querySelectorAll('.gem')).toHaveLength(4)
  expect(container.querySelectorAll('[data-on]')).toHaveLength(3)
})

it('CountUp shows the final value when motion is reduced', () => {
  render(<CountUp value={42} />)
  expect(screen.getByText('42')).toBeInTheDocument()
})

it('SegmentedControl marks the selected tab, reports changes and places the pill without animation', async () => {
  const onChange = vi.fn()
  const { container } = render(
    <SegmentedControl label="Situação" value="pending" onChange={onChange} options={[{ value: 'pending', label: 'Pendentes' }, { value: 'done', label: 'Feitas' }]} />,
  )
  expect(screen.getByRole('tablist', { name: 'Situação' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Pendentes' })).toHaveAttribute('aria-selected', 'true')
  expect((container.querySelector('[data-pill]') as HTMLElement).style.width).toBe('0px')
  await userEvent.click(screen.getByRole('tab', { name: 'Feitas' }))
  expect(onChange).toHaveBeenCalledWith('done')
})

it('CountUp writes its value before the first paint', () => {
  let text: string | null = null
  render(<BeforePaint read={() => (text = document.body.textContent)}><CountUp value={42} /></BeforePaint>)
  expect(text).toBe('42')
})

it('Stagger hides its items before the first paint (no blink before the cascade)', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  let opacity = ''
  render(<BeforePaint read={() => (opacity = screen.getByText('a').style.opacity)}><Stagger><p>a</p></Stagger></BeforePaint>)
  expect(opacity).toBe('0')
})

it('Celebration scrolls when several achievements unlock at once on a small phone', () => {
  const many = Array.from({ length: 5 }, (_, i) => achievement({ id: `a${i}`, name: `Conquista ${i}` }))
  render(<Celebration achievements={many} onClose={() => {}} />)
  expect(screen.getByRole('dialog')).toHaveClass('overflow-y-auto')
})
