import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Loading } from '../components/Status'
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Loading />
  if (recovering) return <NewPasswordPage onDone={() => setRecovering(false)} />
  if (!session) return <LoginPage />
  return <UserIdContext.Provider value={session.user.id}>{children}</UserIdContext.Provider>
}
