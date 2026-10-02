// Auth HTTP operations only. No React Query, no component concerns — hooks
// in ../hooks call these and own caching/state.
import { http } from '../../../shared/api/http'
import type { CurrentUser, RequestOtp, VerifyOtp } from '../types/auth.types'

/** Fetches the current session's user, or `null` when there is no authenticated session (401). */
export async function currentUser(): Promise<CurrentUser | null> {
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
 * Development-only convenience: reads back the OTP just issued so a local
 * tester does not need a real SMS provider. Not available outside the
 * Development profile (see backend/Controllers/Auth/AuthController.cs).
 */
export async function getDevelopmentOtp(phoneNumber: string): Promise<string> {
  const response = await http.get<{ code: string }>('/dev/otp/latest', { params: { phoneNumber } })
  return response.data.code
}

/** Verifies an OTP and completes login, returning the now-current user. */
export async function verifyOtp(phoneNumber: string, code: string): Promise<CurrentUser> {
  const response = await http.post<CurrentUser>('/auth/otp/verify', {
    phoneNumber,
    code,
    purpose: 'LOGIN',
  } satisfies VerifyOtp)
  return response.data
}

/** Ends the current session, or every session for the user when `all` is set. */
export async function logout(all = false): Promise<void> {
  await http.post(all ? '/auth/logout-all' : '/auth/logout', {})
}
