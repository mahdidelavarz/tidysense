import { useSyncExternalStore } from 'react'

/**
 * Light/dark appearance. The preference ("system" unless the user chose)
 * lives only in this browser; the resolved theme is the `data-theme`
 * attribute on <html>, which public/theme-init.js sets before first paint so the page
 * never flashes the wrong theme. Keep the storage key in step with it.
 */
export type ThemePreference = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

const storageKey = 'tidysense.theme'
const themeColor: Record<Theme, string> = { light: '#f3f1ec', dark: '#0f1720' }
const listeners = new Set<() => void>()
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

let preference: ThemePreference = readPreference()

function resolve(value: ThemePreference): Theme {
  if (value !== 'system') return value
  return media?.matches ? 'dark' : 'light'
}

function apply() {
  const theme = resolve(preference)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor[theme])
  for (const listener of listeners) listener()
}

// Also applied here, so the theme is right even if the pre-paint script did not run.
if (typeof document !== 'undefined') apply()

media?.addEventListener('change', () => {
  if (preference === 'system') apply()
})

export function setThemePreference(value: ThemePreference) {
  preference = value
  try {
    if (value === 'system') localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, value)
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this visit.
  }
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => preference, () => 'system')
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, () => resolve(preference), () => 'light')
}
