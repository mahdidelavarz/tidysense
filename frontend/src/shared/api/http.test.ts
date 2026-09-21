import { describe, expect, it } from 'vitest'
import { toApiError } from './http'

describe('toApiError', () => {
  it('returns a safe stable fallback for unknown failures', () => {
    expect(toApiError(new Error('secret internal detail'))).toEqual({
      status: 0,
      code: 'UNEXPECTED_ERROR',
      title: 'خطایی رخ داد',
    })
  })
})
