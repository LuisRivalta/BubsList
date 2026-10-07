import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import CountUp from './CountUp'
import Gems from './Gems'
import SegmentedControl from './SegmentedControl'

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
