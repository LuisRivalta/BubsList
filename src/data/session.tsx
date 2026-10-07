import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Loading } from '../components/Status'
import { prefersReducedMotion } from '../lib/motion'
import { supabase } from '../lib/supabase'
import LoginPage from '../pages/LoginPage'
import NewPasswordPage from '../pages/NewPasswordPage'

const UserIdContext = createContext<string | null>(null)

export const SessionIdProvider = UserIdContext.Provider

export function useUserId(): string {
  const id = useContext(UserIdContext)
  if (!id) throw new Error('useUserId must be used inside AuthGate')
  return id
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovering, setRecovering] = useState(false)
  // leaving: login plays its exit animation before the app mounts; entering: the app plays its reveal.
  const [leaving, setLeaving] = useState(false)
  const [entering, setEntering] = useState(false)
  const current = useRef<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      current.current = data.session
      setSession(data.session)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Only a real login from the login screen animates — not session refreshes while inside the app.
      if (event === 'SIGNED_IN' && next && !current.current && !prefersReducedMotion()) setLeaving(true)
      current.current = next
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!entering) return
    const timer = setTimeout(() => setEntering(false), 1200)
    return () => clearTimeout(timer)
  }, [entering])

  if (session === undefined) return <Loading />
  if (recovering) return <NewPasswordPage onDone={() => setRecovering(false)} />
  if (!session || leaving) {
    return (
      <LoginPage
        leaving={leaving}
        onLeft={() => {
          setLeaving(false)
          setEntering(true)
        }}
      />
    )
  }
  return (
    <UserIdContext.Provider value={session.user.id}>
      <div data-entering={entering || undefined}>{children}</div>
      {entering && <div aria-hidden className="reveal-curtain" />}
    </UserIdContext.Provider>
  )
}
