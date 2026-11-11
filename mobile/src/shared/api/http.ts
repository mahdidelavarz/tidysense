import axios, { AxiosError } from 'axios'
import { randomUUID } from 'expo-crypto'
import { apiBaseUrl } from '../lib/config'
import { clearSession, getToken } from '../lib/session'

// The one HTTP client of the app. Every request says it comes from the native app and, when signed in,
// carries the bearer token (ADR-008). The backend stays authoritative; this file only transports.
export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30_000,
  headers: { 'X-TidySense-Client': 'native' },
})

http.interceptors.request.use(async config => {
  const token = await getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  response => response,
  async error => {
    if (error instanceof AxiosError && error.response?.status === 401 &&
      !error.config?.url?.endsWith('/auth/otp/verify-native')) {
      await clearSession()
    }
    return Promise.reject(error)
  },
)

/** A fresh `Idempotency-Key` for one command, as the web sends. Hermes has no `crypto.randomUUID`. */
export const commandHeaders = () => ({ 'Idempotency-Key': randomUUID() })

// Copied from frontend/src/shared/api/http.ts: the same error shape and Persian fallback.
export type ApiError = {
  status: number
  code: string
  title: string
  detail?: string
  traceId?: string
  currentVersion?: number
  errors?: Record<string, string[]>
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const data = error.response?.data as Partial<ApiError> | undefined
    return {
      status: error.response?.status ?? 0,
      code: data?.code ?? 'UNEXPECTED_ERROR',
      title: data?.title ?? 'خطایی رخ داد',
      detail: data?.detail,
      traceId: data?.traceId,
      currentVersion: data?.currentVersion,
      errors: data?.errors,
    }
  }
  return { status: 0, code: 'UNEXPECTED_ERROR', title: 'خطایی رخ داد' }
}
