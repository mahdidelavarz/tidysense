import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Sheet } from '../ui/Sheet'
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

  it('keeps the page layout while a sheet is open, so the sheet and what was typed survive a resize', () => {
    let matches = true
    const notify = new Set<() => void>()
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() { return matches },
      media: query,
      addEventListener: (_: string, listener: () => void) => notify.add(listener),
      removeEventListener: (_: string, listener: () => void) => notify.delete(listener),
    }))
    const resize = (wide: boolean) => act(() => {
      matches = wide
      for (const listener of notify) listener()
    })
    // A page that renders a different tree on each side of the breakpoint, as the Task page does.
    function Layout({ name }: { name: string }) {
      const [open, setOpen] = useState(false)
      return (
        <section aria-label={name}>
          <button type="button" onClick={() => setOpen(true)}>ویرایش</button>
          {open && (
            <Sheet title="ویرایش کار" onClose={() => setOpen(false)}>
              <input aria-label="عنوان" />
            </Sheet>
          )}
        </section>
      )
    }
    function Page() {
      return useIsDesktop() ? <Layout name="desktop" /> : <Layout name="phone" />
    }
    render(<Page />)

    fireEvent.click(screen.getByRole('button', { name: 'ویرایش' }))
    fireEvent.change(screen.getByLabelText('عنوان'), { target: { value: 'نیمه‌نوشته' } })
    resize(false)
    expect(screen.getByRole('region', { name: 'desktop' })).toBeInTheDocument()
    expect(screen.getByLabelText('عنوان')).toHaveValue('نیمه‌نوشته')

    // Closed, the page takes the layout of the width it now has.
    fireEvent.click(screen.getByRole('button', { name: 'بستن' }))
    expect(screen.getByRole('region', { name: 'phone' })).toBeInTheDocument()
    resize(true)
    expect(screen.getByRole('region', { name: 'desktop' })).toBeInTheDocument()
  })
})
