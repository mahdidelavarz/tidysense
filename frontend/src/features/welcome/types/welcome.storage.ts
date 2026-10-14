// The first-run guides are seen once per device (Discussion 028 §4.2). The
// mark lives only in this browser: no account exists yet, and nothing about
// the guides is recorded on the server.

const key = 'tidysense:guides-seen'

/** Whether this device has already been through the welcome and guides. Unreadable storage counts as seen, so the guides never stand in the way. */
export function guidesSeen(): boolean {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return true
  }
}

/** Remembers on this device that the guides were seen or skipped. */
export function markGuidesSeen() {
  try {
    window.localStorage.setItem(key, '1')
  } catch {
    // Without storage the guides may show again; that is accepted (028 §4.2).
  }
}

/** The guides are for phones; desktop goes straight to sign-in (028 §4.1). */
export function isPhoneWidth(): boolean {
  return typeof window.matchMedia === 'function' && !window.matchMedia('(min-width: 64rem)').matches
}
