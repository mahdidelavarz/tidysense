import type { components } from '../../../shared/api/generated'
import { http } from '../../../shared/api/http'

export type CurrentUser = components['schemas']['CurrentUserDto']
export type RequestOtp = components['schemas']['RequestOtpDto']
export type VerifyOtp = components['schemas']['VerifyOtpDto']

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

export async function requestOtp(phoneNumber: string): Promise<{ retryAfterSeconds: number }> {
  const response = await http.post<{ retryAfterSeconds: number }>('/auth/otp/request', {
    phoneNumber,
    purpose: 'LOGIN',
  } satisfies RequestOtp)
  return response.data
}

export async function getDevelopmentOtp(phoneNumber: string): Promise<string> {
  const response = await http.get<{ code: string }>('/dev/otp/latest', { params: { phoneNumber } })
  return response.data.code
}

export async function verifyOtp(phoneNumber: string, code: string): Promise<CurrentUser> {
  const response = await http.post<CurrentUser>('/auth/otp/verify', {
    phoneNumber,
    code,
    purpose: 'LOGIN',
  } satisfies VerifyOtp)
  return response.data
}

export async function logout(all = false): Promise<void> {
  await http.post(all ? '/auth/logout-all' : '/auth/logout', {})
}
