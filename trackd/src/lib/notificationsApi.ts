import { supabase } from './supabase'
import { profilesApi, type Profile } from './profilesApi'

export type NotificationType = 'follow' | 'like'

export interface NotificationRating {
  id: string
  album_id: string
  album_name: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  actor_id: string
  rating_id: string | null
  read: boolean
  created_at: string
  actor: Profile | null
  rating: NotificationRating | null
}

export const notificationsApi = {
  async getNotifications(limit = 20): Promise<Notification[]> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('notifications')
      .select('*, rating:ratings(id, album_id, album_name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    const rows = data ?? []

    // actor_id references auth.users, not profiles, so PostgREST can't embed
    // it — batch-fetch actor profiles separately, same as Feed/UserProfile.
    const actorIds = [...new Set(rows.map(r => r.actor_id))]
    const actors = actorIds.length ? await profilesApi.getProfiles(actorIds) : []
    const actorsById = Object.fromEntries(actors.map(p => [p.id, p]))

    return rows.map(r => ({ ...r, actor: actorsById[r.actor_id] ?? null }))
  },

  async getUnreadCount(): Promise<number> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return 0

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('read', false)

    if (error) throw error
    return count ?? 0
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', session.user.id)

    if (error) throw error
  },

  async markAllAsRead(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false)

    if (error) throw error
  },
}
