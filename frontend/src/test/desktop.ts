import { afterEach, beforeEach, vi } from 'vitest'

/** Renders the desktop layouts: jsdom has no `matchMedia`, so every width query answers as a 1440px screen. */
export function onDesktop() {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: /min-width/.test(query),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })
}
