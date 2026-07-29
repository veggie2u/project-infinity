import type { SupabaseClient } from '@supabase/supabase-js'

export type SupabaseConnectionCheckResult = { success: true } | { success: false; message: string }

// Trivial connectivity check for ROADMAP 0.4 — no schema exists yet, so this
// calls the Auth API rather than querying a table, just to prove env vars +
// client wiring actually reach the hosted project end to end. Logging is left
// to the caller since this package stays environment-agnostic (no DOM/Node lib).
export async function checkSupabaseConnection(
  client: SupabaseClient,
): Promise<SupabaseConnectionCheckResult> {
  const { error } = await client.auth.getSession()

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true }
}
