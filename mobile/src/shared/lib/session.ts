import * as SecureStore from 'expo-secure-store'

// The signed-in session of this device: the bearer token from `otp/verify-native` (ADR-008). It lives only in
// the Android Keystore through expo-secure-store, never in plain storage, logs or crash reports. A copy is kept
// in memory so every request does not read the keystore.

const tokenKey = 'tidysense.session.token'
const expiresKey = 'tidysense.session.expiresAt'

let cached: string | null | undefined
const signedOutListeners = new Set<() => void>()

/** The stored token, or `null` when signed out or expired. */
export async function getToken(): Promise<string | null> {
  if (cached === undefined) {
    const [token, expiresAt] = await Promise.all([
      SecureStore.getItemAsync(tokenKey),
      SecureStore.getItemAsync(expiresKey),
    ])
    cached = token && expiresAt && Date.parse(expiresAt) > Date.now() ? token : null
  }
  return cached
}

/** Stores the session returned by a native sign-in. */
export async function saveSession(token: string, expiresAt: string): Promise<void> {
  await SecureStore.setItemAsync(tokenKey, token)
  await SecureStore.setItemAsync(expiresKey, expiresAt)
  cached = token
}

/** Forgets the session on this device and tells listeners (the auth hooks) the user is signed out. */
export async function clearSession(): Promise<void> {
  cached = null
  await Promise.all([SecureStore.deleteItemAsync(tokenKey), SecureStore.deleteItemAsync(expiresKey)])
  for (const listener of signedOutListeners) listener()
}

/** Called when the session ends without the user asking: a 401 from the API. */
export function onSignedOut(listener: () => void): () => void {
  signedOutListeners.add(listener)
  return () => signedOutListeners.delete(listener)
}
