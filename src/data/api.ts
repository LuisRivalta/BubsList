import type { NormalizedMedia } from '../../supabase/functions/_shared/catalog'
import type { Progress } from '../lib/progress'
import { supabase } from '../lib/supabase'
import { completionPhotos, subtreePhotos } from '../lib/tree'
import type { Achievement, AppData, Category, Completion, Media, Photo, Profile, Quest, QuestType, Review } from '../lib/types'

const PAGE = 1000

function check<T>(res: { data: unknown; error: unknown }): T {
  if (res.error) throw res.error
  return res.data as T
}

async function all<T>(table: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const page = check<T[]>(await supabase.from(table).select('*').order('created_at').order('id').range(from, from + PAGE - 1))
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

export async function loadAll(): Promise<AppData> {
  const [profiles, categories, questTypes, media, quests, completions, reviews, photos, achievements] = await Promise.all([
    all<Profile>('profiles'),
    all<Category>('categories'),
    all<QuestType>('quest_types'),
    all<Media>('media'),
    all<Quest>('quests'),
    all<Completion>('completions'),
    all<Review>('reviews'),
    all<Photo>('photos'),
    all<Achievement>('achievements'),
  ])
  return { profiles, categories, questTypes, media, quests, completions, reviews, photos, achievements }
}

// Quests -----------------------------------------------------------------
export type QuestInput = Pick<
  Quest,
  'parent_id' | 'category_id' | 'title' | 'notes' | 'difficulty' | 'media_id' | 'type_id' | 'city' | 'state' | 'country' | 'place_label' | 'lat' | 'lng' | 'scheduled_on' | 'scheduled_time'
>

export const createQuest = async (input: QuestInput) =>
  check<Quest>(await supabase.from('quests').insert(input).select().single())

export async function updateQuest(id: string, patch: Partial<QuestInput & Pick<Quest, 'progress_season' | 'progress_episode'>>) {
  check(await supabase.from('quests').update(patch).eq('id', id))
}

export async function deleteQuest(id: string, data: AppData) {
  await removePhotoFiles(subtreePhotos(data, id))
  check(await supabase.from('quests').delete().eq('id', id))
}

export const setProgress = (id: string, p: Progress | null) =>
  updateQuest(id, { progress_season: p?.season ?? null, progress_episode: p?.episode ?? null })

export const upsertMedia = async (m: NormalizedMedia) =>
  check<Media>(
    await supabase
      .from('media')
      .upsert({ ...m, fetched_at: new Date().toISOString() }, { onConflict: 'source,external_id' })
      .select()
      .single(),
  )

// Completions & reviews --------------------------------------------------
export const createCompletion = async (quest_id: string, done_on: string) =>
  check<Completion>(await supabase.from('completions').insert({ quest_id, done_on }).select().single())

export async function updateCompletion(id: string, done_on: string) {
  check(await supabase.from('completions').update({ done_on }).eq('id', id))
}

export async function deleteCompletion(id: string, data: AppData) {
  await removePhotoFiles(completionPhotos(data, id))
  check(await supabase.from('completions').delete().eq('id', id))
}

export async function saveReview(r: { id?: string; completion_id: string; rating: number; body: string | null }): Promise<Review> {
  const row = { rating: r.rating, body: r.body }
  return check<Review>(
    r.id
      ? await supabase.from('reviews').update(row).eq('id', r.id).select().single()
      : await supabase.from('reviews').insert({ ...row, completion_id: r.completion_id }).select().single(),
  )
}

export async function deleteReview(id: string, data: AppData) {
  await removePhotoFiles(data.photos.filter((p) => p.review_id === id))
  check(await supabase.from('reviews').delete().eq('id', id))
}

// Photos -----------------------------------------------------------------
async function removePhotoFiles(photos: Photo[]) {
  if (photos.length === 0) return
  check(await supabase.storage.from('photos').remove(photos.map((p) => p.storage_path)))
}

export async function uploadPhoto(target: { quest_id: string } | { review_id: string }, blob: Blob): Promise<Photo> {
  const folder = 'quest_id' in target ? `quests/${target.quest_id}` : `reviews/${target.review_id}`
  const storage_path = `${folder}/${crypto.randomUUID()}.jpg`
  check(await supabase.storage.from('photos').upload(storage_path, blob, { contentType: 'image/jpeg' }))
  return check<Photo>(await supabase.from('photos').insert({ ...target, storage_path }).select().single())
}

export async function deletePhoto(photo: Photo) {
  await removePhotoFiles([photo])
  check(await supabase.from('photos').delete().eq('id', photo.id))
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const rows = check<{ path: string | null; signedUrl: string }[]>(await supabase.storage.from('photos').createSignedUrls(paths, 3600))
  return Object.fromEntries(rows.filter((r) => r.path).map((r) => [r.path!, r.signedUrl]))
}

// Categories, achievements, profile ---------------------------------------
export type CategoryInput = Pick<Category, 'name' | 'icon' | 'color'>

export async function saveCategory({ id, ...row }: CategoryInput & { id?: string }) {
  check(id ? await supabase.from('categories').update(row).eq('id', id) : await supabase.from('categories').insert({ ...row, kind: 'general' }))
}

export async function deleteCategory(id: string) {
  check(await supabase.from('categories').delete().eq('id', id))
}

export async function setCategoryPlace(id: string, hasPlace: boolean) {
  check(await supabase.from('categories').update({ has_place: hasPlace }).eq('id', id))
}

export async function saveQuestType({ id, ...row }: { id?: string; category_id: string; name: string }): Promise<QuestType> {
  const res = id
    ? await supabase.from('quest_types').update(row).eq('id', id).select().single()
    : await supabase.from('quest_types').insert(row).select().single()
  return check<QuestType>(res)
}

export async function deleteQuestType(id: string) {
  check(await supabase.from('quest_types').delete().eq('id', id))
}

export type AchievementInput = Omit<Achievement, 'id' | 'created_at'>

export async function saveAchievement({ id, ...row }: AchievementInput & { id?: string }) {
  check(id ? await supabase.from('achievements').update(row).eq('id', id) : await supabase.from('achievements').insert(row))
}

export async function deleteAchievement(id: string) {
  check(await supabase.from('achievements').delete().eq('id', id))
}

export async function setManualUnlock(id: string, date: string | null) {
  check(await supabase.from('achievements').update({ manual_unlocked_on: date }).eq('id', id))
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'display_name' | 'avatar_path'>>) {
  check(await supabase.from('profiles').update(patch).eq('id', id))
}

export async function uploadAvatar(userId: string, blob: Blob, oldPath: string | null) {
  // A fresh path per upload: the same path would keep serving the cached signed URL / CDN copy of the old picture.
  const path = `avatars/${userId}-${Date.now()}.jpg`
  check(await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' }))
  await updateProfile(userId, { avatar_path: path })
  if (oldPath) await supabase.storage.from('photos').remove([oldPath])
}

export const signOut = () => supabase.auth.signOut()
