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
}
