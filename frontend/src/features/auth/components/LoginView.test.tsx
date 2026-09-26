import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDevelopmentOtp, requestOtp, verifyOtp } from '../services/auth-api'
import { LoginView } from './LoginView'

const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', async importOriginal => {
  const original = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...original, useNavigate: () => navigate }
})
vi.mock('../services/auth-api', () => ({ getDevelopmentOtp: vi.fn(), requestOtp: vi.fn(), verifyOtp: vi.fn() }))

function renderLogin() {
  return render(<QueryClientProvider client={new QueryClient()}>
    <LoginView />
  </QueryClientProvider>)
}

describe('LoginView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses server resend timing and keeps OTP entry available', async () => {
    vi.mocked(requestOtp).mockResolvedValue({ retryAfterSeconds: 120 })
    vi.mocked(getDevelopmentOtp).mockResolvedValue('4321')
    renderLogin()
    fireEvent.change(screen.getByLabelText('شماره موبایل'), { target: { value: '09121234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'دریافت کد' }))
    await waitFor(() => expect(requestOtp).toHaveBeenCalledWith('09121234567'))
    expect(screen.getByLabelText('کد تأیید')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ارسال دوباره تا/ })).toBeDisabled()
    expect(await screen.findByRole('status')).toHaveTextContent('4321')
    expect(getDevelopmentOtp).toHaveBeenCalledWith('09121234567')
  })

  it('keeps the code form visible after a rejected code', async () => {
    vi.mocked(requestOtp).mockResolvedValue({ retryAfterSeconds: 120 })
    vi.mocked(verifyOtp).mockRejectedValue(new Error('rejected'))
    renderLogin()
    fireEvent.change(screen.getByLabelText('شماره موبایل'), { target: { value: '09121234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'دریافت کد' }))
    await screen.findByLabelText('کد تأیید')
    fireEvent.change(screen.getByLabelText('کد تأیید'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'ورود' }))
    await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith('09121234567', '1234'))
    expect(screen.getByLabelText('کد تأیید')).toHaveValue('1234')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
