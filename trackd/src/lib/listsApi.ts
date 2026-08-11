import { supabase } from './supabase'

export interface List {
  id: string
  user_id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
}

export interface ListItem {
  id: string
  list_id: string
  spotify_album_id: string | null
  album_name: string
  album_artist: string | null
  album_image: string | null
  spotify_track_id: string | null
  track_name: string | null
  position: number
  previous_position: number | null
  created_at: string
}

export interface AddListItemParams {
  albumId: string
  albumName: string
  albumArtist: string | null
  albumImage: string | null
  trackId?: string | null
  trackName?: string | null
}

export const listsApi = {
  async getMyLists(): Promise<List[]> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('lists')
      .select()
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async getUserLists(userId: string): Promise<List[]> {
    const { data, error } = await supabase
      .from('lists')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  // Only lists a user has made public — for the public /user/:username page.
  async getPublicLists(userId: string): Promise<List[]> {
    const { data, error } = await supabase
      .from('lists')
      .select()
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  // Lightweight item count for a list card — a head request with no rows.
  async getListItemCount(listId: string): Promise<number> {
    const { count, error } = await supabase
      .from('list_items')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', listId)

    if (error) throw error
    return count ?? 0
  },

  async getList(listId: string): Promise<List | null> {
    const { data, error } = await supabase
      .from('lists')
      .select()
      .eq('id', listId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async createList(params: { title: string; description: string | null; isPublic?: boolean }): Promise<List> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { data, error } = await supabase
      .from('lists')
      .insert({
        user_id: session.user.id,
        title: params.title,
        description: params.description,
        is_public: params.isPublic ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteList(listId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', listId)
      .eq('user_id', session.user.id)

    if (error) throw error
  },

  async getListItems(listId: string): Promise<ListItem[]> {
    const { data, error } = await supabase
      .from('list_items')
      .select()
      .eq('list_id', listId)
      .order('position', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  // Appends to the end of the list; new entries have no previous_position
  // so they render with a dash until the next reorder.
  async addItem(listId: string, params: AddListItemParams): Promise<ListItem> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const existing = await listsApi.getListItems(listId)
    const nextPosition = existing.length > 0 ? Math.max(...existing.map(i => i.position)) + 1 : 1

    const { data, error } = await supabase
      .from('list_items')
      .insert({
        list_id: listId,
        spotify_album_id: params.albumId,
        album_name: params.albumName,
        album_artist: params.albumArtist,
        album_image: params.albumImage,
        spotify_track_id: params.trackId ?? null,
        track_name: params.trackName ?? null,
        position: nextPosition,
        previous_position: null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async removeItem(itemId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
  },

  // Persists a new item order. `previousPosition` should be each item's
  // position immediately before this reorder, so the up/down arrows compare
  // correctly against the freshly saved position.
  async reorderItems(updates: { id: string; position: number; previousPosition: number | null }[]): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const results = await Promise.all(
      updates.map(u =>
        supabase
          .from('list_items')
          .update({ position: u.position, previous_position: u.previousPosition })
          .eq('id', u.id)
      )
    )
    const failed = results.find(r => r.error)
    if (failed?.error) throw failed.error
  },
}
