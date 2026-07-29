import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { checkSupabaseConnection } from './check-supabase-connection'

function mockClient(getSessionResult: { error: { message: string } | null }): SupabaseClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue(getSessionResult),
    },
  } as unknown as SupabaseClient
}

describe('checkSupabaseConnection', () => {
  it('reports success when the session check has no error', async () => {
    const result = await checkSupabaseConnection(mockClient({ error: null }))
    expect(result).toEqual({ success: true })
  })

  it('reports failure with the error message when the session check fails', async () => {
    const result = await checkSupabaseConnection(
      mockClient({ error: { message: 'network unreachable' } }),
    )
    expect(result).toEqual({ success: false, message: 'network unreachable' })
  })
})
