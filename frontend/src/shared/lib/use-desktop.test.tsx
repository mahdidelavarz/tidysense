import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIsDesktop } from './use-desktop'

describe('useIsDesktop', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is the phone layout where the browser cannot answer', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(() => useIsDesktop()).result.current).toBe(false)
  })

  it('follows the 64rem query as the window changes size', () => {
    let matches = false
    let notify = () => {}
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() { return matches },
      media: query,
      addEventListener: (_: string, listener: () => void) => { notify = listener },
      removeEventListener: () => {},
    }))
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
    act(() => {
      matches = true
      notify()
    })
    expect(result.current).toBe(true)
  })
})
