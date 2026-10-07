import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import PageHero from './PageHero'

it('renders the title as the page heading, stats and actions, and reports its height', () => {
  document.documentElement.style.removeProperty('--hero-h')
  render(<PageHero title="Quests" stats={<span>3 pendentes</span>} actions={<button>Ação</button>} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Quests' })).toBeInTheDocument()
  expect(screen.getByText('3 pendentes')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ação' })).toBeInTheDocument()
  expect(document.documentElement.style.getPropertyValue('--hero-h')).not.toBe('')
})
