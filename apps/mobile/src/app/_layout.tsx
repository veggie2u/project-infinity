import { useEffect } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { HeroUINativeProvider } from 'heroui-native'
import { checkSupabaseConnection, createSupabaseClient } from '@project-infinity/shared'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import AppTabs from '@/components/app-tabs'
import '../global.css'

SplashScreen.preventAutoHideAsync()

export default function TabLayout() {
  const colorScheme = useColorScheme()

  useEffect(() => {
    const supabase = createSupabaseClient({
      url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    })
    void checkSupabaseConnection(supabase).then((result) => {
      if (result.success) {
        console.log('[supabase] connectivity check succeeded')
      } else {
        console.error('[supabase] connectivity check failed:', result.message)
      }
    })
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <AppTabs />
        </ThemeProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  )
}
