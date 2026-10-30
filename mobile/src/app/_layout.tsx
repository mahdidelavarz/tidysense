import { NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic/700Bold'
import { useFonts } from '@expo-google-fonts/vazirmatn/useFonts'
import { Vazirmatn_400Regular } from '@expo-google-fonts/vazirmatn/400Regular'
import { Vazirmatn_500Medium } from '@expo-google-fonts/vazirmatn/500Medium'
import { Vazirmatn_700Bold } from '@expo-google-fonts/vazirmatn/700Bold'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { I18nManager } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { loadThemePreference, usePalette, useTheme } from '../shared/lib/theme'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

// The app is Persian only. The expo-localization plugin (app.json, forcesRTL) sets right-to-left in the
// native build; a build without it would lay every screen out backwards, so say so loudly in development.
if (__DEV__ && !I18nManager.isRTL) console.warn('TidySense: right-to-left is off. Rebuild with `npx expo run:android`.')

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_700Bold, NotoNaskhArabic_700Bold })
  const [themeLoaded, setThemeLoaded] = useState(false)
  const ready = (fontsLoaded || fontError !== null) && themeLoaded

  useEffect(() => {
    loadThemePreference().finally(() => setThemeLoaded(true))
  }, [])

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined)
  }, [ready])

  if (!ready) return null
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Screens />
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

function Screens() {
  const palette = usePalette()
  const theme = useTheme()
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.canvas } }} />
    </>
  )
}
