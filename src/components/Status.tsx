export function Loading() {
  return <p className="p-6 text-center text-gray-500">Carregando…</p>
}

export function LoadError({ retry }: { retry: () => void }) {
  return (
    <div className="space-y-3 p-6 text-center">
      <p>Não foi possível carregar. Verifique a conexão.</p>
      <button type="button" className="btn" onClick={retry}>
        Tentar de novo
      </button>
    </div>
  )
}
