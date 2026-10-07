import PageHero from './PageHero'

// Before login / outside the layout (light background).
export function Loading() {
  return <p className="p-6 text-center text-gray-500">Carregando…</p>
}

// Inside the layout, over the dark sky.
export function PageLoading() {
  return <PageHero title="Carregando…" />
}

export function LoadError({ retry }: { retry: () => void }) {
  return (
    <PageHero
      title="Não foi possível carregar"
      stats={<span>Verifique a conexão.</span>}
      actions={<button type="button" className="btn btn-ghost" onClick={retry}>Tentar de novo</button>}
    />
  )
}
