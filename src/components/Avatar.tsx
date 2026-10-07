import { useSignedUrls } from '../data/hooks'
import type { Profile } from '../lib/types'

export default function Avatar({ profile, size = 'sm' }: { profile: Profile; size?: 'sm' | 'lg' }) {
  const url = useSignedUrls(profile.avatar_path ? [profile.avatar_path] : []).data?.[profile.avatar_path ?? '']
  const box = size === 'lg' ? 'size-20 text-3xl ring-4' : 'size-9 text-sm ring-2'
  return url ? (
    <img src={url} alt="" className={`${box} shrink-0 rounded-full object-cover ring-white/70`} />
  ) : (
    <span aria-hidden className={`${box} grid shrink-0 place-items-center rounded-full bg-linear-to-br from-brand to-accent font-display font-bold text-white ring-white/70`}>
      {profile.display_name[0]?.toUpperCase()}
    </span>
  )
}
