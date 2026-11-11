import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { clearSession, getToken, saveSession } from '../lib/session'
import { commandHeaders, http, toApiError } from './http'

function respond(status: number, data: unknown = {}): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    const response = { status, statusText: '', headers: {}, config, data }
    if (status >= 400) throw new AxiosError('failed', String(status), config, undefined, response)
    return response
  }
}

describe('http', () => {
  afterEach(async () => { await clearSession() })

  it('marks every request as the native app and adds the bearer token once signed in', async () => {
    const seen: InternalAxiosRequestConfig[] = []
    http.defaults.adapter = async config => { seen.push(config); return respond(200)(config) }
    await http.get('/users/me')
    expect(seen[0]?.headers['X-TidySense-Client']).toBe('native')
    expect(seen[0]?.headers.Authorization).toBeUndefined()

    await saveSession('token-1', new Date(Date.now() + 60_000).toISOString())
    await http.get('/users/me')
    expect(seen[1]?.headers.Authorization).toBe('Bearer token-1')
  })

  it('forgets the session on a 401', async () => {
    await saveSession('token-2', new Date(Date.now() + 60_000).toISOString())
    http.defaults.adapter = respond(401)
    await expect(http.get('/users/me')).rejects.toBeInstanceOf(AxiosError)
    expect(await getToken()).toBeNull()
  })

  it('keeps the session when only the code was wrong', async () => {
    await saveSession('token-3', new Date(Date.now() + 60_000).toISOString())
    http.defaults.adapter = respond(401)
    await expect(http.post('/auth/otp/verify-native', {})).rejects.toBeInstanceOf(AxiosError)
    expect(await getToken()).toBe('token-3')
  })

  it('maps API problems and falls back to the Persian message', async () => {
    http.defaults.adapter = respond(429, { code: 'RATE_LIMITED', title: 'Too many' })
    const error = await http.get('/x').catch((cause: unknown) => cause)
    expect(toApiError(error)).toMatchObject({ status: 429, code: 'RATE_LIMITED', title: 'Too many' })
    expect(toApiError(new Error('boom'))).toEqual({ status: 0, code: 'UNEXPECTED_ERROR', title: 'خطایی رخ داد' })
  })

  it('gives each command an idempotency key', () => {
    expect(commandHeaders()['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
  })
})
