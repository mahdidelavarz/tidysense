import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../../../shared/lib/ui-store'
import { currentUser } from '../../auth/services/auth-api'
import type { CurrentUser } from '../../auth/types/auth.types'
import { getPilotNotice, setAiConsent } from '../services/pilot-api'
import type { PilotNotice } from '../types/pilot.types'
import { PrivacyPage } from './PrivacyPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../auth/services/auth-api', () => ({ currentUser: vi.fn() }))
vi.mock('../services/pilot-api', () => ({ getPilotNotice: vi.fn(), setAiConsent: vi.fn() }))

const notice: PilotNotice = {
  noticeVersion: '2026-10-09.1', aiProviderName: 'DeepSeek', sessionHistoryDays: 180, draftDays: 30,
  diagnosticsDays: 90, erasureCompletionDays: 30, supportContact: 'support@example.test', feedbackInstrumentVersion: 1,
}
const account = (granted: boolean): CurrentUser => ({
  id: '00000000-0000-0000-0000-000000000001', phoneNumber: '+989120000000', displayName: null, setupComplete: true,
  isOperator: false, aiConsentRequired: true, aiConsentGranted: granted,
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><PrivacyPage /></QueryClientProvider>)
}

describe('PrivacyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiStore.setState({ toasts: [] })
    vi.mocked(getPilotNotice).mockResolvedValue(notice)
  })

  it('states the configured retention, the provider, the erasure limit and the contact channel', async () => {
    vi.mocked(currentUser).mockResolvedValue(account(false))
    renderPage()

    const kept = within((await screen.findByRole('heading', { name: 'چه چیزی و تا کی نگه داشته می‌شود' })).closest('section') as HTMLElement)
    expect(kept.getByText(/۳۰ روز پس از پایان پیش‌نویس/)).toBeInTheDocument()
    expect(kept.getByText(/۱۸۰ روز پس از بسته‌شدن/)).toBeInTheDocument()
    expect(kept.getByText(/۹۰ روز نگه داشته می‌شود/)).toBeInTheDocument()
    expect(screen.getByText('DeepSeek')).toBeInTheDocument()
    expect(screen.getByText(/سرورهایش بیرون از ایران است/)).toBeInTheDocument()
    expect(await screen.findByText('اجازه نداده‌اید')).toBeInTheDocument()
    const erasure = within(screen.getByRole('heading', { name: 'حذف حساب و داده‌ها' }).closest('section') as HTMLElement)
    expect(erasure.getByText('support@example.test')).toBeInTheDocument()
    expect(erasure.getByText(/حداکثر تا ۳۰ روز بعد از بین می‌روند/)).toBeInTheDocument()
  })

  it('withdraws consent only after an explicit confirmation', async () => {
    vi.mocked(currentUser).mockResolvedValue(account(true))
    vi.mocked(setAiConsent).mockResolvedValue(account(false))
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'پس گرفتن اجازه' }))
    expect(setAiConsent).not.toHaveBeenCalled()
    const dialog = within(screen.getByRole('dialog', { name: 'اجازه استفاده از هوش مصنوعی پس گرفته شود؟' }))
    fireEvent.click(dialog.getByRole('button', { name: 'پس گرفتن اجازه' }))
    await waitFor(() => expect(setAiConsent).toHaveBeenCalledWith(false, null))
    expect(await screen.findByText('اجازه نداده‌اید')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is readable without a session and says so when no provider receives text', async () => {
    vi.mocked(currentUser).mockResolvedValue(null)
    vi.mocked(getPilotNotice).mockResolvedValue({ ...notice, aiProviderName: null, supportContact: null })
    renderPage()

    expect(await screen.findByText('در این نسخه هیچ متنی برای سرویس هوش مصنوعی بیرونی فرستاده نمی‌شود.')).toBeInTheDocument()
    expect(screen.getByText('بازگشت به ورود')).toBeInTheDocument()
    expect(screen.getByText(/با پشتیبانی تماس بگیرید/)).toBeInTheDocument()
    expect(screen.queryByText(/اجازه نداده‌اید|اجازه داده‌اید/)).not.toBeInTheDocument()
  })
})
