import { useSyncExternalStore } from 'react'

/** The desktop layouts start where the rail does (layout-and-navigation.md). */
const desktopQuery = '(min-width: 64rem)'

const listeners = new Set<() => void>()
let openModals = 0
/** The layout shown when the first open modal opened, kept until the last one closes. */
let held: boolean | null = null

function matches() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(desktopQuery).matches
}

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(desktopQuery) : null
  media?.addEventListener('change', onChange)
  return () => {
    listeners.delete(onChange)
    media?.removeEventListener('change', onChange)
  }
}

function isDesktop() {
  return held ?? matches()
}

/**
 * Keeps the page's layout while a sheet or dialog is open (`useModal` calls it).
 * A page renders a different tree on each side of the breakpoint, so swapping
 * it under an open sheet would close the sheet and lose what was typed in it.
 * The sheet follows the width on its own (CSS); the page catches up once the
 * last modal closes. Returns the release.
 */
export function holdLayout() {
  if (openModals === 0) held = matches()
  openModals++
  let released = false
  return () => {
    if (released) return
    released = true
    openModals--
    if (openModals === 0) {
      held = null
      notify()
    }
  }
}

/**
 * Whether the desktop layout of a page is shown. A page renders one layout, not
 * both hidden by CSS, so assistive technology and tests meet each control once.
 * Both layouts read the same queries and offer the same actions (028 §5).
 */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, isDesktop, () => false)
}
