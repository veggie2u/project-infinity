import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

// Deliberately prefix-agnostic: each app reads its own env vars (VITE_ vs
// EXPO_PUBLIC_) and passes them in here, so this package doesn't need to know
// which bundler it's running under. See TECH-STACK.md Environment/Secrets Management.
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  if (!config.url || !config.anonKey) {
    throw new Error('createSupabaseClient requires both a url and an anonKey')
  }

  return createClient(config.url, config.anonKey)
}
