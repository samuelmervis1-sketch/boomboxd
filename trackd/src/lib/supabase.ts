import { createClient } from '@supabase/supabase-js'

// Fall back to a syntactically valid placeholder so createClient doesn't throw
// when credentials haven't been configured yet (new URL() inside the client
// requires a real URL format).
const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseUrl = raw?.startsWith('http') ? raw : 'https://placeholder.supabase.co'
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})
