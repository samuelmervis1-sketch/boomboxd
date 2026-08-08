import { supabase } from './supabase'
import type { Rating } from './ratingsApi'

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export const followsApi = {
  async followUser(followingId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: session.user.id, following_id: followingId })

    if (error) throw error
  },

  async unfollowUser(followingId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', session.user.id)
      .eq('following_id', followingId)

    if (error) throw error
  },

  // People a given user follows
  async getFollowing(userId: string): Promise<Follow[]> {
    const { data, error } = await supabase
      .from('follows')
      .select()
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  // People who follow a given user
  async getFollowers(userId: string): Promise<Follow[]> {
    const { data, error } = await supabase
      .from('follows')
      .select()
      .eq('following_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  // Whether the signed-in user follows the given user
  async isFollowing(userId: string): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)
      .maybeSingle()

    if (error) throw error
    return !!data
  },

  // Chronological album ratings from people the signed-in user follows
  async getFeedRatings(): Promise<Rating[]> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const following = await followsApi.getFollowing(session.user.id)
    const followingIds = following.map(f => f.following_id)
    if (followingIds.length === 0) return []

    const { data, error } = await supabase
      .from('ratings')
      .select()
      .in('user_id', followingIds)
      .is('spotify_track_id', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },
}
