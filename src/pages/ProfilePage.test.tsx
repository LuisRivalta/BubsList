import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { ME, achievement, allCats, appData, category, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import ProfilePage from './ProfilePage'

vi.mock('../data/api')

const shows = category({ id: 'cat-shows', name: 'Shows', icon: 'mic', builtin: false })
const open = (o: Parameters<typeof appData>[0] = {}) => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: [...allCats(), shows], ...o }))
  return renderRoute([{ path: '/perfil', element: <ProfilePage /> }], '/perfil')
}

it('base categories cannot be deleted', async () => {
  open()
  expect(await screen.findByRole('button', { name: 'Excluir Shows' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Excluir Viagem' })).not.toBeInTheDocument()
})

it('refuses to delete a category in use', async () => {
  open({ quests: [quest({ category_id: 'cat-shows' })], achievements: [achievement({ rule_category_id: 'cat-shows' })] })
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Excluir Shows' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Categoria em uso por 1 quest(s) e 1 conquista(s).')
  expect(api.deleteCategory).not.toHaveBeenCalled()
})

it('deletes an unused custom category after confirming', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  open()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Excluir Shows' }))
  await waitFor(() => expect(api.deleteCategory).toHaveBeenCalledWith('cat-shows'))
})

it('adds a category', async () => {
  open()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('radio', { name: 'Livro' }))
  await user.type(screen.getByLabelText('Nome da categoria'), 'Livros')
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(api.saveCategory).toHaveBeenCalledWith({ name: 'Livros', icon: 'book-open', color: '#64748b' })
})

it('explains a duplicated category name', async () => {
  vi.mocked(api.saveCategory).mockRejectedValue({ code: '23505' })
  open()
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Nome da categoria'), 'Viagem')
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma categoria com esse nome.')
})

it('saves my display name', async () => {
  open()
  const user = userEvent.setup()
  const input = await screen.findByLabelText('Seu nome')
  await user.clear(input)
  await user.type(input, 'Luís')
  await user.click(screen.getByRole('button', { name: 'Salvar nome' }))
  expect(api.updateProfile).toHaveBeenCalledWith(ME, { display_name: 'Luís' })
})
