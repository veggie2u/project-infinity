import { describe, expect, it } from 'vitest'
import { createSupabaseClient } from './supabase-client'

describe('createSupabaseClient', () => {
  it('creates a client given a valid url and anonKey', () => {
    const client = createSupabaseClient({
      url: 'https://example.supabase.co',
      anonKey: 'test-anon-key',
    })

    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  it('throws if url is missing', () => {
    expect(() => createSupabaseClient({ url: '', anonKey: 'test-anon-key' })).toThrow(
      'createSupabaseClient requires both a url and an anonKey',
    )
  })

  it('throws if anonKey is missing', () => {
    expect(() => createSupabaseClient({ url: 'https://example.supabase.co', anonKey: '' })).toThrow(
      'createSupabaseClient requires both a url and an anonKey',
    )
  })
})
