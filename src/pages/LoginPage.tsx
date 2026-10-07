import { animate, stagger } from 'animejs'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import AuthBackdrop from '../components/AuthBackdrop'
import { prefersReducedMotion } from '../lib/motion'
import { supabase } from '../lib/supabase'

const TITLE = 'Bubs2Do'

export default function LoginPage({ leaving = false, onLeft }: { leaving?: boolean; onLeft?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(0)
  const [animated] = useState(() => !prefersReducedMotion())
  const card = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!animated) return
    const el = card.current!
    const letters = animate(el.querySelectorAll('[data-letter]'), {
      opacity: 1,
      translateY: { from: 28 },
      rotate: { from: -10 },
      delay: stagger(60, { start: 250 }),
      duration: 800,
      ease: 'outBack(1.8)',
    })
    const fields = animate(el.querySelectorAll('[data-reveal]'), {
      opacity: 1,
      translateY: { from: 18 },
      delay: stagger(90, { start: 700 }),
      duration: 650,
      ease: 'outExpo',
    })
    return () => {
      letters.revert()
      fields.revert()
    }
  }, [animated])

  async function login(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    setFlash((n) => n + 1)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (!error) return
    setMessage(error.status === 400 ? 'E-mail ou senha incorretos.' : 'Sem conexão ou erro no servidor. Tente de novo.')
    if (animated) animate(card.current!, { translateX: [0, -12, 10, -8, 6, -3, 0], duration: 500, ease: 'inOutSine' })
  }

  async function forgot() {
    if (!email.trim()) return setMessage('Digite seu e-mail primeiro.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setMessage(error ? 'Não foi possível enviar o e-mail.' : 'Enviamos um link para redefinir a senha.')
  }

  return (
    <AuthBackdrop flashSignal={flash} leaving={leaving} onLeft={onLeft}>
      <form ref={card} onSubmit={login} data-card data-animating={animated || undefined} className="glass-card w-full max-w-sm space-y-4 p-6">
        <h1 aria-label={TITLE} className="text-center text-4xl font-bold text-accent">
          {[...TITLE].map((ch, i) => (
            <span key={i} data-letter aria-hidden className="inline-block">{ch}</span>
          ))}
        </h1>
        <p data-reveal className="text-center text-sm text-gray-600">Nossas quests, juntos.</p>
        <label data-reveal className="block">
          <span className="mb-1 block text-sm font-medium">E-mail</span>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label data-reveal className="block">
          <span className="mb-1 block text-sm font-medium">Senha</span>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {message && <p role="status" className="text-sm text-gray-700">{message}</p>}
        <button data-reveal className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <button data-reveal type="button" className="w-full text-sm text-gray-500 underline" onClick={forgot}>
          Esqueci a senha
        </button>
      </form>
    </AuthBackdrop>
  )
}
