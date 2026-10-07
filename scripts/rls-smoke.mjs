import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const tables = ['profiles', 'categories', 'media', 'quests', 'completions', 'reviews', 'photos', 'achievements']
let failed = false
const fail = (msg) => {
  console.error('FAIL', msg)
  failed = true
}

const anon = createClient(url, key, { auth: { persistSession: false } })
for (const t of tables) {
  const { data, error } = await anon.from(t).select('*').limit(1)
  if (error && error.code !== '42501') fail(`${t}: ${error.code} ${error.message}`)
  else if (data && data.length > 0) fail(`${t}: anon read ${data.length} row(s)`)
  else console.log('ok   anon blocked:', t)
}
const { data: files } = await anon.storage.from('photos').list('', { limit: 1 })
if (files && files.length > 0) fail('storage: anon listed photos')

const authed = createClient(url, key, { auth: { persistSession: false } })
const { error: loginError } = process.env.BUBS_EMAIL
  ? await authed.auth.signInWithPassword({ email: process.env.BUBS_EMAIL, password: process.env.BUBS_PASSWORD })
  : { error: null }
if (!process.env.BUBS_EMAIL) console.log('skip logged-in check (BUBS_EMAIL not set)')
else if (loginError) fail(`login: ${loginError.message}`)
else {
  const { data: cats, error } = await authed.from('categories').select('name').eq('builtin', true)
  if (error || cats.length !== 7) fail(`categories: expected 7 builtin, got ${cats?.length} ${error?.message ?? ''}`)
  else console.log('ok   authed reads 7 builtin categories')
  const { count } = await authed.from('achievements').select('*', { count: 'exact', head: true })
  console.log('info achievements:', count)
  const { data: profiles } = await authed.from('profiles').select('display_name')
  console.log('info profiles:', profiles?.map((p) => p.display_name).join(', '))
}
process.exit(failed ? 1 : 0)
