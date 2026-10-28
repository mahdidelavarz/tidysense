import * as SecureStore from 'expo-secure-store'
import { useColorScheme } from 'react-native'
import { create } from 'zustand'
import { dark, light, type Palette } from '../ui/tokens'

/**
 * Light/dark appearance, as on the web (frontend/src/shared/lib/theme.ts): "system" unless the user chose.
 * The choice is kept on this device only. expo-secure-store is the one device store the app has; this value
 * is not secret.
 */
export type ThemePreference = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

const storageKey = 'tidysense.theme'

type ThemeState = { preference: ThemePreference; setPreference: (value: ThemePreference) => void }

export const useThemeStore = create<ThemeState>(set => ({
  preference: 'system',
  setPreference: value => {
    set({ preference: value })
    const write = value === 'system' ? SecureStore.deleteItemAsync(storageKey) : SecureStore.setItemAsync(storageKey, value)
    // Storage can fail; the choice then lasts until the app closes.
    write.catch(() => undefined)
  },
}))

/** Reads the stored choice once at startup. */
export async function loadThemePreference(): Promise<void> {
  try {
    const value = await SecureStore.getItemAsync(storageKey)
    if (value === 'light' || value === 'dark') useThemeStore.setState({ preference: value })
  } catch {
    // Keep "system".
  }
}

export function useTheme(): Theme {
  const preference = useThemeStore(state => state.preference)
  const system = useColorScheme()
  if (preference !== 'system') return preference
  return system === 'dark' ? 'dark' : 'light'
}

/** The colours of the current theme. */
export function usePalette(): Palette {
  return useTheme() === 'dark' ? dark : light
}
