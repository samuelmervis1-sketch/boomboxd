import { supabase } from './supabase'

export interface ReviewLike {
  id: string
  user_id: string
  rating_id: string
  created_at: string
}

export interface LikeInfo {
  count: number
  liked: boolean
}

export const reviewLikesApi = {
  async likeReview(ratingId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('review_likes')
      .insert({ user_id: session.user.id, rating_id: ratingId })

    if (error) throw error
  },

  async unlikeReview(ratingId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('review_likes')
      .delete()
      .eq('user_id', session.user.id)
      .eq('rating_id', ratingId)

    if (error) throw error
  },

  // Batch fetch like counts and whether the signed-in user has liked each
  // rating, keyed by rating_id. Used to render heart buttons across a page
  // of reviews without one round trip per card.
  async getLikesForRatings(ratingIds: string[]): Promise<Record<string, LikeInfo>> {
    if (ratingIds.length === 0) return {}
    const { data: { session } } = await supabase.auth.getSession()

    const { data, error } = await supabase
      .from('review_likes')
      .select('rating_id, user_id')
      .in('rating_id', ratingIds)

    if (error) throw error

    const result: Record<string, LikeInfo> = {}
    for (const id of ratingIds) result[id] = { count: 0, liked: false }
    for (const row of data ?? []) {
      const entry = result[row.rating_id] ??= { count: 0, liked: false }
      entry.count += 1
      if (session && row.user_id === session.user.id) entry.liked = true
    }
    return result
  },

  async getMyLikedReviews(): Promise<ReviewLike[]> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('review_likes')
      .select()
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },
}
