import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { checkSupabaseConnection, createSupabaseClient } from '@project-infinity/shared'
import './index.css'
import App from './App.tsx'

const supabase = createSupabaseClient({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})
void checkSupabaseConnection(supabase).then((result) => {
  if (result.success) {
    console.log('[supabase] connectivity check succeeded')
  } else {
    console.error('[supabase] connectivity check failed:', result.message)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
