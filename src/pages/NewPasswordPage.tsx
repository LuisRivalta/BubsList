import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function NewPasswordPage({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) return setMessage('A senha precisa ter pelo menos 6 caracteres.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMessage('Não foi possível trocar a senha.')
    else onDone()
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={save} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-bold">Nova senha</h1>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Nova senha</span>
          <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {message && <p role="status" className="text-sm text-gray-700">{message}</p>}
        <button className="btn btn-primary w-full">Salvar senha</button>
      </form>
    </main>
  )
}
