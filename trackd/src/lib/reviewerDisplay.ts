import type { Profile } from './profilesApi'

const REVIEWER_PALETTE = ['#e8ff6b', '#ff6b6b', '#6bffb8', '#6bb8ff', '#ff6bcd', '#ffb86b']

export function reviewerColor(userId: string): string {
  let hash = 0
  for (const ch of userId) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return REVIEWER_PALETTE[Math.abs(hash) % REVIEWER_PALETTE.length]
}

export function reviewerName(profile: Profile | undefined): string {
  return profile?.display_name || profile?.username || 'boomboxd fan'
}

export function reviewerInitial(profile: Profile | undefined): string {
  const name = reviewerName(profile)
  return name[0]?.toUpperCase() ?? '?'
}
