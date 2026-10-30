import * as SecureStore from 'expo-secure-store'
import { clearSession, getToken, onSignedOut, saveSession } from './session'

// The module as a new app start sees it: nothing cached yet.
function freshGetToken(): Promise<string | null> {
  let getFresh: () => Promise<string | null> = async () => null
  jest.isolateModules(() => { getFresh = (require('./session') as typeof import('./session')).getToken })
  return getFresh()
}

describe('session', () => {
  it('reads a stored session at start and treats an expired one as signed out', async () => {
    await SecureStore.setItemAsync('tidysense.session.token', 'stored')
    await SecureStore.setItemAsync('tidysense.session.expiresAt', new Date(Date.now() + 60_000).toISOString())
    expect(await freshGetToken()).toBe('stored')

    await SecureStore.setItemAsync('tidysense.session.expiresAt', new Date(Date.now() - 1000).toISOString())
    expect(await freshGetToken()).toBeNull()
  })

  it('tells listeners when the session is cleared', async () => {
    const listener = jest.fn()
    const stop = onSignedOut(listener)
    await saveSession('t', new Date(Date.now() + 60_000).toISOString())
    expect(await getToken()).toBe('t')
    await clearSession()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(await getToken()).toBeNull()
    expect(await SecureStore.getItemAsync('tidysense.session.token')).toBeNull()
    stop()
  })
})
