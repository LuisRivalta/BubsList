import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

const NAV = [
  { to: '/', label: 'Quests', icon: '🗺️' },
  { to: '/conquistas', label: 'Conquistas', icon: '🏆' },
  { to: '/relatorio', label: 'Relatório', icon: '📊' },
  { to: '/perfil', label: 'Perfil', icon: '👤' },
]

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

export default function Layout() {
  const online = useOnline()
  return (
    <div className="min-h-dvh md:flex">
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-56 md:flex-col md:border-r md:border-t-0 md:pb-0"
      >
        <span className="hidden p-4 text-xl font-bold text-accent md:block">BubsList</span>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs md:min-h-11 md:flex-none md:flex-row md:justify-start md:gap-3 md:px-4 md:text-base ${
                isActive ? 'font-semibold text-brand' : 'text-gray-500'
              }`
            }
          >
            <span aria-hidden className="text-xl">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 pb-24 md:pb-8">
        <div className="mx-auto max-w-5xl p-4">
          {!online && (
            <p role="alert" className="mb-4 rounded-xl bg-yellow-100 p-3 text-sm text-yellow-900">
              Sem conexão. O que você digitar continua aqui — tente salvar quando a internet voltar.
            </p>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
