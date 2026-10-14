import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guidesSeen } from '../types/welcome.storage'
import { WelcomeFlow } from './WelcomeFlow'

const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

describe('WelcomeFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('goes from the welcome image through three guides to sign-in, then is seen on this device', () => {
    render(<WelcomeFlow />)
    // The welcome is the image, the mark and «شروع» only.
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['شروع'])
    fireEvent.click(screen.getByRole('button', { name: 'شروع' }))

    expect(screen.getByRole('heading', { name: 'از یک جمله، تا یک برنامه‌ی کامل' })).toHaveFocus()
    expect(screen.getByText('زیر ۲ دقیقه')).toBeInTheDocument()
    // The first page has skip but no back.
    expect(screen.getByRole('button', { name: 'رد شدن' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'قبلی' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'بعدی' }))

    expect(screen.getByText('زیر ۵ ثانیه')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'قبلی' }))
    expect(screen.getByText('زیر ۲ دقیقه')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'بعدی' }))
    fireEvent.click(screen.getByRole('button', { name: 'بعدی' }))

    // The last page has back and «شروع کنیم», and no skip.
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
    expect(screen.queryByRole('button', { name: 'رد شدن' })).not.toBeInTheDocument()
    expect(guidesSeen()).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'شروع کنیم' }))
    expect(guidesSeen()).toBe(true)
    expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
  })

  it('marks the guides seen when they are skipped', () => {
    render(<WelcomeFlow />)
    fireEvent.click(screen.getByRole('button', { name: 'شروع' }))
    fireEvent.click(screen.getByRole('button', { name: 'رد شدن' }))
    expect(guidesSeen()).toBe(true)
    expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
  })
})
