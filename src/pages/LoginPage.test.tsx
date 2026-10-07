import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), resetPasswordForEmail: vi.fn() } },
}))

import { supabase } from '../lib/supabase'
import LoginPage from './LoginPage'

it('shows an error for wrong credentials', async () => {
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: { status: 400 } } as never)
  const user = userEvent.setup()
  render(<LoginPage />)
  await user.type(screen.getByLabelText('E-mail'), 'luis@x.com')
  await user.type(screen.getByLabelText('Senha'), 'errada')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
  expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'luis@x.com', password: 'errada' })
})

it('asks for the e-mail before sending the reset link', async () => {
  const user = userEvent.setup()
  render(<LoginPage />)
  await user.click(screen.getByRole('button', { name: 'Esqueci a senha' }))
  expect(screen.getByText('Digite seu e-mail primeiro.')).toBeInTheDocument()
  expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled()
})

it('sends the reset link back to this site', async () => {
  vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null } as never)
  const user = userEvent.setup()
  render(<LoginPage />)
  await user.type(screen.getByLabelText('E-mail'), 'luis@x.com')
  await user.click(screen.getByRole('button', { name: 'Esqueci a senha' }))
  expect(await screen.findByText('Enviamos um link para redefinir a senha.')).toBeInTheDocument()
  expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('luis@x.com', { redirectTo: window.location.origin })
})

it('shows Killua and Serena around the login card', () => {
  const { container } = render(<LoginPage />)
  expect(container.querySelector('img[src="/login/killua.webp"]')).not.toBeNull()
  expect(container.querySelector('img[src="/login/usagi.webp"]')).not.toBeNull()
  expect(screen.getByRole('heading', { name: 'Bubs2Do' })).toBeInTheDocument()
})
