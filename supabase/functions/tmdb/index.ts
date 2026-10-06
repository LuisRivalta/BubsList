import { createClient } from 'npm:@supabase/supabase-js@2'
import { normalizeTmdbHit, normalizeTmdbMovie, normalizeTmdbTv } from '../_shared/catalog.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function tmdb(path: string, params: Record<string, string> = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  url.searchParams.set('language', 'pt-BR')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${Deno.env.get('TMDB_TOKEN')}` } })
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data } = await supabase.auth.getUser(token)
  if (!data.user) return json({ error: 'unauthorized' }, 401)

  let input: { action?: unknown; type?: unknown; query?: unknown; id?: unknown }
  try {
    input = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const { action, type, query, id } = input
  if (type !== 'movie' && type !== 'tv') return json({ error: 'invalid type' }, 400)

  try {
    if (action === 'search' && typeof query === 'string' && query.trim().length >= 2) {
      const result = await tmdb(`/search/${type}`, { query: query.trim() })
      return json(result.results.slice(0, 10).map((r: unknown) => normalizeTmdbHit(type, r)))
    }
    if (action === 'details' && /^\d+$/.test(String(id))) {
      const result = await tmdb(`/${type}/${id}`)
      return json(type === 'movie' ? normalizeTmdbMovie(result) : normalizeTmdbTv(result))
    }
    return json({ error: 'invalid action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 502)
  }
})
