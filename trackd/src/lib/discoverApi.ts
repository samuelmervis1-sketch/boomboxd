import { supabase } from './supabase'
import type { Rating } from './ratingsApi'

export interface TopRatedAlbum {
  albumId: string
  albumName: string
  albumArtist: string
  albumImage: string | null
  avgRating: number
  ratingCount: number
}

export interface TopRatedTrack {
  trackId: string
  trackName: string
  albumId: string
  albumName: string
  albumArtist: string
  albumImage: string | null
  avgRating: number
  ratingCount: number
}

export interface TrendingItem {
  type: 'album' | 'track'
  id: string
  albumId: string
  name: string
  artist: string
  image: string | null
  ratingCount: number
}

export interface RecommendedItem {
  type: 'album' | 'track'
  id: string
  albumId: string
  name: string
  artist: string
  image: string | null
}

// Supabase JS can't do GROUP BY server-side without a view/RPC, so these
// pull the raw rating rows and aggregate client-side. Fine at this app's
// scale; the `select()` calls are narrowed to only the columns each
// aggregation needs to keep payloads small.

export const discoverApi = {
  async getTopRatedAlbums(limit = 10, minRatings = 2): Promise<TopRatedAlbum[]> {
    const { data, error } = await supabase
      .from('ratings')
      .select('album_id, album_name, album_artist, album_image, rating')
      .is('spotify_track_id', null)

    if (error) throw error

    const byAlbum = new Map<string, TopRatedAlbum & { sum: number }>()
    for (const r of data ?? []) {
      const cur = byAlbum.get(r.album_id) ?? {
        albumId: r.album_id,
        albumName: r.album_name,
        albumArtist: r.album_artist,
        albumImage: r.album_image,
        sum: 0,
        avgRating: 0,
        ratingCount: 0,
      }
      cur.sum += r.rating
      cur.ratingCount += 1
      byAlbum.set(r.album_id, cur)
    }

    return [...byAlbum.values()]
      .filter(a => a.ratingCount >= minRatings)
      .map(a => ({ ...a, avgRating: a.sum / a.ratingCount }))
      .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount)
      .slice(0, limit)
      .map(({ sum: _sum, ...rest }) => rest)
  },

  async getTopRatedSongs(limit = 10, minRatings = 2): Promise<TopRatedTrack[]> {
    const { data, error } = await supabase
      .from('ratings')
      .select('spotify_track_id, track_name, album_id, album_name, album_artist, album_image, rating')
      .not('spotify_track_id', 'is', null)

    if (error) throw error

    const byTrack = new Map<string, TopRatedTrack & { sum: number }>()
    for (const r of data ?? []) {
      const trackId = r.spotify_track_id
      if (!trackId) continue
      const cur = byTrack.get(trackId) ?? {
        trackId,
        trackName: r.track_name ?? '',
        albumId: r.album_id,
        albumName: r.album_name,
        albumArtist: r.album_artist,
        albumImage: r.album_image,
        sum: 0,
        avgRating: 0,
        ratingCount: 0,
      }
      cur.sum += r.rating
      cur.ratingCount += 1
      byTrack.set(trackId, cur)
    }

    return [...byTrack.values()]
      .filter(t => t.ratingCount >= minRatings)
      .map(t => ({ ...t, avgRating: t.sum / t.ratingCount }))
      .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount)
      .slice(0, limit)
      .map(({ sum: _sum, ...rest }) => rest)
  },

  async getRecentlyRatedAlbums(limit = 10): Promise<Rating[]> {
    // Over-fetch since several recent ratings can share the same album —
    // we dedupe down to `limit` unique albums below.
    const { data, error } = await supabase
      .from('ratings')
      .select()
      .is('spotify_track_id', null)
      .order('created_at', { ascending: false })
      .limit(limit * 5)

    if (error) throw error

    const seenAlbums = new Set<string>()
    const result: Rating[] = []
    for (const r of data ?? []) {
      if (seenAlbums.has(r.album_id)) continue
      seenAlbums.add(r.album_id)
      result.push(r)
      if (result.length >= limit) break
    }
    return result
  },

  // Songs and albums with the most *new* ratings in the last `days` days —
  // trending by activity, not by average score.
  async getTrending(limit = 12, days = 7): Promise<TrendingItem[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('ratings')
      .select('album_id, album_name, album_artist, album_image, spotify_track_id, track_name')
      .gte('created_at', since)

    if (error) throw error

    const byItem = new Map<string, TrendingItem>()
    for (const r of data ?? []) {
      const isTrack = !!r.spotify_track_id
      const key = isTrack ? `track:${r.spotify_track_id}` : `album:${r.album_id}`
      const cur = byItem.get(key) ?? {
        type: isTrack ? 'track' as const : 'album' as const,
        id: isTrack ? r.spotify_track_id! : r.album_id,
        albumId: r.album_id,
        name: isTrack ? (r.track_name ?? '') : r.album_name,
        artist: r.album_artist,
        image: r.album_image,
        ratingCount: 0,
      }
      cur.ratingCount += 1
      byItem.set(key, cur)
    }

    return [...byItem.values()]
      .sort((a, b) => b.ratingCount - a.ratingCount)
      .slice(0, limit)
  },

  // "You may also like": finds other users who rated the same albums/songs
  // highly as `userId`, then surfaces those users' other highly-rated
  // albums/songs that `userId` hasn't rated yet. Returns [] when there's
  // not enough overlapping taste data to make a recommendation.
  async getRecommendations(userId: string, limit = 10): Promise<RecommendedItem[]> {
    const HIGH_RATING = 4

    const { data: myRatings, error: myError } = await supabase
      .from('ratings')
      .select('album_id, spotify_track_id, rating')
      .eq('user_id', userId)
      .gte('rating', HIGH_RATING)

    if (myError) throw myError
    if (!myRatings || myRatings.length === 0) return []

    const myAlbumIds = [...new Set(myRatings.filter(r => !r.spotify_track_id).map(r => r.album_id))]
    const myTrackIds = [...new Set(myRatings.filter(r => r.spotify_track_id).map(r => r.spotify_track_id as string))]
    if (myAlbumIds.length === 0 && myTrackIds.length === 0) return []

    const overlapQueries = []
    if (myAlbumIds.length > 0) {
      overlapQueries.push(
        supabase
          .from('ratings')
          .select('user_id')
          .in('album_id', myAlbumIds)
          .is('spotify_track_id', null)
          .gte('rating', HIGH_RATING)
          .neq('user_id', userId)
      )
    }
    if (myTrackIds.length > 0) {
      overlapQueries.push(
        supabase
          .from('ratings')
          .select('user_id')
          .in('spotify_track_id', myTrackIds)
          .gte('rating', HIGH_RATING)
          .neq('user_id', userId)
      )
    }

    const overlapResults = await Promise.all(overlapQueries)
    for (const r of overlapResults) if (r.error) throw r.error

    const similarUserIds = new Set<string>()
    for (const r of overlapResults) for (const row of r.data ?? []) similarUserIds.add(row.user_id)

    // Not enough people share taste with this user yet.
    if (similarUserIds.size === 0) return []

    const { data: theirRatings, error: theirError } = await supabase
      .from('ratings')
      .select('album_id, album_name, album_artist, album_image, spotify_track_id, track_name, rating')
      .in('user_id', [...similarUserIds])
      .gte('rating', HIGH_RATING)

    if (theirError) throw theirError

    const myAlbumSet = new Set(myAlbumIds)
    const myTrackSet = new Set(myTrackIds)
    const scored = new Map<string, RecommendedItem & { score: number }>()

    for (const r of theirRatings ?? []) {
      const isTrack = !!r.spotify_track_id
      if (isTrack && myTrackSet.has(r.spotify_track_id!)) continue
      if (!isTrack && myAlbumSet.has(r.album_id)) continue

      const key = isTrack ? `track:${r.spotify_track_id}` : `album:${r.album_id}`
      const cur = scored.get(key) ?? {
        type: isTrack ? 'track' as const : 'album' as const,
        id: isTrack ? r.spotify_track_id! : r.album_id,
        albumId: r.album_id,
        name: isTrack ? (r.track_name ?? '') : r.album_name,
        artist: r.album_artist,
        image: r.album_image,
        score: 0,
      }
      cur.score += r.rating
      scored.set(key, cur)
    }

    return [...scored.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score: _score, ...rest }) => rest)
  },
}
