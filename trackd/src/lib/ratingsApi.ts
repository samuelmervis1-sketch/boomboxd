import { supabase } from './supabase'

export interface Rating {
  id: string
  user_id: string
  album_id: string
  album_name: string
  album_artist: string
  album_image: string | null
  spotify_track_id: string | null
  track_name: string | null
  rating: number
  review: string | null
  created_at: string
  updated_at: string
}

export const ratingsApi = {
  // ── Album ratings ──────────────────────────────────────────

  async getMyRatings(): Promise<Rating[]> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('user_id', session.user.id)
      .is('spotify_track_id', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async getAlbumRatings(albumId: string): Promise<Rating[]> {
    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('album_id', albumId)
      .is('spotify_track_id', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async getMyRating(albumId: string): Promise<Rating | null> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('user_id', session.user.id)
      .eq('album_id', albumId)
      .is('spotify_track_id', null)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async upsert(params: {
    albumId: string
    albumName: string
    albumArtist: string
    albumImage: string | null
    rating: number
    review: string | null
  }): Promise<Rating> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { data, error } = await supabase
      .from('ratings')
      .upsert(
        {
          user_id: session.user.id,
          album_id: params.albumId,
          album_name: params.albumName,
          album_artist: params.albumArtist,
          album_image: params.albumImage,
          spotify_track_id: null,
          track_name: null,
          rating: params.rating,
          review: params.review,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,album_id,spotify_track_id' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  },

  async remove(albumId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('user_id', session.user.id)
      .eq('album_id', albumId)
      .is('spotify_track_id', null)

    if (error) throw error
  },

  // Batch lookup of the current user's album ratings, keyed by album_id.
  // Used to show existing ratings inline across a list of search results.
  async getMyRatingsForAlbums(albumIds: string[]): Promise<Record<string, Rating>> {
    if (albumIds.length === 0) return {}
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return {}

    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('user_id', session.user.id)
      .in('album_id', albumIds)
      .is('spotify_track_id', null)

    if (error) throw error
    const map: Record<string, Rating> = {}
    for (const r of data ?? []) map[r.album_id] = r
    return map
  },

  // ── Track ratings ──────────────────────────────────────────

  async getTrackRatings(albumId: string): Promise<Rating[]> {
    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('album_id', albumId)
      .not('spotify_track_id', 'is', null)

    if (error) throw error
    return data ?? []
  },

  async getMyTrackRatingsForAlbum(albumId: string): Promise<Rating[]> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('user_id', session.user.id)
      .eq('album_id', albumId)
      .not('spotify_track_id', 'is', null)

    if (error) throw error
    return data ?? []
  },

  async upsertTrack(params: {
    albumId: string
    albumName: string
    albumArtist: string
    albumImage: string | null
    trackId: string
    trackName: string
    rating: number
    review: string | null
  }): Promise<Rating> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { data, error } = await supabase
      .from('ratings')
      .upsert(
        {
          user_id: session.user.id,
          album_id: params.albumId,
          album_name: params.albumName,
          album_artist: params.albumArtist,
          album_image: params.albumImage,
          spotify_track_id: params.trackId,
          track_name: params.trackName,
          rating: params.rating,
          review: params.review,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,album_id,spotify_track_id' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  },

  async removeTrack(albumId: string, trackId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('user_id', session.user.id)
      .eq('album_id', albumId)
      .eq('spotify_track_id', trackId)

    if (error) throw error
  },

  // Track ratings scoped by track alone (for the standalone /track/:id page)

  async getRatingsForTrack(trackId: string): Promise<Rating[]> {
    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('spotify_track_id', trackId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async getMyRatingForTrack(trackId: string): Promise<Rating | null> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('user_id', session.user.id)
      .eq('spotify_track_id', trackId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  // Batch lookup of the current user's track ratings, keyed by spotify_track_id.
  // Used to show existing ratings inline across a list of search results.
  async getMyRatingsForTracks(trackIds: string[]): Promise<Record<string, Rating>> {
    if (trackIds.length === 0) return {}
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return {}

    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('user_id', session.user.id)
      .in('spotify_track_id', trackIds)

    if (error) throw error
    const map: Record<string, Rating> = {}
    for (const r of data ?? []) {
      if (r.spotify_track_id) map[r.spotify_track_id] = r
    }
    return map
  },

  // ── Public profile ───────────────────────────────────────────

  // All of a given user's ratings (albums + tracks together), most recent
  // first. Ratings are publicly readable, so this needs no session — used
  // by the public /user/:username page to show stats and recent activity.
  async getRatingsForUser(userId: string): Promise<Rating[]> {
    const { data, error } = await supabase
      .from('ratings')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },
}
