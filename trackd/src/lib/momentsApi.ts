import { supabase } from './supabase'

export interface Moment {
  id: string
  user_id: string
  spotify_track_id: string
  track_name: string
  album_id: string
  album_name: string
  album_image: string | null
  timestamp_seconds: number
  comment_text: string
  created_at: string
}

export const momentsApi = {
  async getMomentsForTrack(trackId: string): Promise<Moment[]> {
    const { data, error } = await supabase
      .from('moments')
      .select()
      .eq('spotify_track_id', trackId)
      .order('timestamp_seconds', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async getMomentsForAlbum(albumId: string): Promise<Moment[]> {
    const { data, error } = await supabase
      .from('moments')
      .select()
      .eq('album_id', albumId)
      .order('timestamp_seconds', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async createMoment(params: {
    trackId: string
    trackName: string
    albumId: string
    albumName: string
    albumImage: string | null
    timestampSeconds: number
    commentText: string
  }): Promise<Moment> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { data, error } = await supabase
      .from('moments')
      .insert({
        user_id: session.user.id,
        spotify_track_id: params.trackId,
        track_name: params.trackName,
        album_id: params.albumId,
        album_name: params.albumName,
        album_image: params.albumImage,
        timestamp_seconds: params.timestampSeconds,
        comment_text: params.commentText,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteMoment(momentId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('moments')
      .delete()
      .eq('id', momentId)
      .eq('user_id', session.user.id)

    if (error) throw error
  },
}
