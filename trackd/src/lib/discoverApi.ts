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
}
