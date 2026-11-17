import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// These two values are PUBLIC by design (they ship to the browser).
// The data is protected by Row Level Security in the database.
// Secret keys (Apollo, Cobalt, Rainforest, BlueCart, service-role) are
// NEVER put here — they live in Supabase secrets, used by Edge Functions.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
