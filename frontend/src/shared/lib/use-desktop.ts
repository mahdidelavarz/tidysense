import { useSyncExternalStore } from 'react'

/** The desktop layouts start where the rail does (layout-and-navigation.md). */
const desktopQuery = '(min-width: 64rem)'

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia(desktopQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function isDesktop() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(desktopQuery).matches
}

/**
 * Whether the desktop layout of a page is shown. A page renders one layout, not
 * both hidden by CSS, so assistive technology and tests meet each control once.
 * Both layouts read the same queries and offer the same actions (028 §5).
 */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, isDesktop, () => false)
}
