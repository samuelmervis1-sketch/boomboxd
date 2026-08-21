import type { Rating } from './ratingsApi'

// Album and song ratings live in the same `ratings` table, told apart by
// spotify_track_id: null for an album, a Spotify track id for a song.

export type RatingFilterMode = 'albums' | 'songs' | 'both'

export const RATING_FILTER_OPTIONS: { value: RatingFilterMode; label: string }[] = [
  { value: 'albums', label: 'Albums' },
  { value: 'songs', label: 'Songs' },
  { value: 'both', label: 'Both' },
]

export function isSongRating(rating: Rating): boolean {
  return Boolean(rating.spotify_track_id)
}

export function filterRatings(ratings: Rating[], mode: RatingFilterMode): Rating[] {
  if (mode === 'both') return ratings
  const wantSong = mode === 'songs'
  return ratings.filter(r => isSongRating(r) === wantSong)
}

/** Label for the count stat, which counts a different thing per mode. */
export function countLabel(mode: RatingFilterMode): string {
  return mode === 'albums' ? 'Albums' : mode === 'songs' ? 'Songs' : 'Ratings'
}

export interface RatingStats {
  count: number
  reviews: number
  /** null when nothing is in scope, so callers can render a dash. */
  avg: number | null
}

/** Every stat the profile pages show, derived from an already-filtered set. */
export function ratingStats(ratings: Rating[]): RatingStats {
  const count = ratings.length
  const reviews = ratings.filter(r => r.review && r.review.trim().length > 0).length
  const avg = count > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / count : null
  return { count, reviews, avg }
}
