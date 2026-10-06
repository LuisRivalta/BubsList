import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function login(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setMessage(error.status === 400 ? 'E-mail ou senha incorretos.' : 'Sem conexão ou erro no servidor. Tente de novo.')
  }

  async function forgot() {
    if (!email.trim()) return setMessage('Digite seu e-mail primeiro.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setMessage(error ? 'Não foi possível enviar o e-mail.' : 'Enviamos um link para redefinir a senha.')
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={login} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-center text-3xl font-bold text-brand">BubsList</h1>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">E-mail</span>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Senha</span>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {message && <p role="status" className="text-sm text-gray-700">{message}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <button type="button" className="w-full text-sm text-gray-500 underline" onClick={forgot}>
          Esqueci a senha
        </button>
      </form>
    </main>
  )
}
