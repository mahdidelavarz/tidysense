// Auth HTTP operations only, as in frontend/src/features/auth/services/auth-api.ts. Hooks in ../hooks call
// these and own caching. The app signs in through `otp/verify-native` (ADR-008).
import { http } from '../../../shared/api/http'
import { clearSession, getToken, saveSession } from '../../../shared/lib/session'
import type { CurrentUser, NativeSession, RequestOtp, VerifyOtp } from '../types/auth.types'

/** Fetches the signed-in user, or `null` when this device has no session or the API refuses it (401). */
export async function currentUser(): Promise<CurrentUser | null> {
  if (!(await getToken())) return null
  try {
    const response = await http.get<CurrentUser>('/users/me')
    return response.data
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const response = (error as { response?: { status?: number } }).response
      if (response?.status === 401) return null
    }
    throw error
  }
}

/** Requests a login OTP for a phone number. */
export async function requestOtp(phoneNumber: string): Promise<{ retryAfterSeconds: number }> {
  const response = await http.post<{ retryAfterSeconds: number }>('/auth/otp/request', {
    phoneNumber,
    purpose: 'LOGIN',
  } satisfies RequestOtp)
  return response.data
}

/**
 * Development only: reads back the code just issued, so testing needs no SMS. The backend answers it only in
 * Development with `Development:ShowLoginCode` (`./dev.ps1 mobile-backend` sets it).
 */
export async function getDevelopmentOtp(phoneNumber: string): Promise<string> {
  const response = await http.get<{ code: string }>('/dev/otp/latest', { params: { phoneNumber } })
  return response.data.code
}

/** Verifies an OTP, stores the session in the keystore, and returns the now-current user. */
export async function verifyOtp(phoneNumber: string, code: string): Promise<CurrentUser> {
  const response = await http.post<NativeSession>('/auth/otp/verify-native', {
    phoneNumber,
    code,
    purpose: 'LOGIN',
  } satisfies VerifyOtp)
  await saveSession(response.data.accessToken, response.data.expiresAt)
  return response.data.user
}

/** Ends the session (or every session of the user when `all` is set) and forgets it on this device. */
export async function logout(all = false): Promise<void> {
  try {
    await http.post(all ? '/auth/logout-all' : '/auth/logout', {})
  } finally {
    await clearSession()
  }
}
