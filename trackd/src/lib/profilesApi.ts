import { supabase } from './supabase'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export const profilesApi = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async getProfiles(userIds: string[]): Promise<Profile[]> {
    if (userIds.length === 0) return []

    const { data, error } = await supabase
      .from('profiles')
      .select()
      .in('id', userIds)

    if (error) throw error
    return data ?? []
  },

  async updateMyProfile(params: { username: string; displayName: string | null }): Promise<Profile> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const { data, error } = await supabase
      .from('profiles')
      .update({ username: params.username, display_name: params.displayName })
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
