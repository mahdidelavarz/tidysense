import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../../../shared/lib/ui-store'
import { currentUser } from '../../auth/services/auth-api'
import type { CurrentUser } from '../../auth/types/auth.types'
import { getPilotNotice } from '../services/pilot-api'
import type { PilotNotice } from '../types/pilot.types'
import { PrivacyPage } from './PrivacyPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../auth/services/auth-api', () => ({ currentUser: vi.fn() }))
vi.mock('../services/pilot-api', () => ({ getPilotNotice: vi.fn() }))

const notice: PilotNotice = {
  noticeVersion: '2026-10-13.1', aiReceivesPlanningText: true, sessionHistoryDays: 180, draftDays: 30,
  diagnosticsDays: 90, erasureCompletionDays: 30, supportContact: 'support@example.test', feedbackInstrumentVersion: 1,
}
const account: CurrentUser = {
  id: '00000000-0000-0000-0000-000000000001', phoneNumber: '+989120000000', displayName: null, setupComplete: true,
  isOperator: false,
}

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

  it('states the configured retention, where planning text goes, the erasure limit and the contact channel', async () => {
    vi.mocked(currentUser).mockResolvedValue(account)
    renderPage()

    const kept = within((await screen.findByRole('heading', { name: 'چه چیزی و تا کی نگه داشته می‌شود' })).closest('section') as HTMLElement)
    expect(kept.getByText(/۳۰ روز پس از پایان پیش‌نویس/)).toBeInTheDocument()
    expect(kept.getByText(/۱۸۰ روز پس از بسته‌شدن/)).toBeInTheDocument()
    expect(kept.getByText(/۹۰ روز نگه داشته می‌شود/)).toBeInTheDocument()
    const ai = within(screen.getByRole('heading', { name: 'هوش مصنوعی' }).closest('section') as HTMLElement)
    expect(ai.getByText(/فقط برای ساختن پیش‌نویس به یک مدل هوش مصنوعی فرستاده می‌شود/)).toBeInTheDocument()
    expect(ai.getByText(/سرورهای آن بیرون از ایران است/)).toBeInTheDocument()
    expect(ai.getByText(/نسخه‌ای از متن فرستاده‌شده یا پاسخ خام مدل را نگه نمی‌دارد/)).toBeInTheDocument()
    expect(ai.getByText(/شماره تلفن شما هرگز فرستاده نمی‌شود/)).toBeInTheDocument()
    expect(ai.getByText(/کار و روتین را دستی بسازید/)).toBeInTheDocument()
    const erasure = within(screen.getByRole('heading', { name: 'حذف حساب و داده‌ها' }).closest('section') as HTMLElement)
    expect(erasure.getByText('support@example.test')).toBeInTheDocument()
    expect(erasure.getByText(/حداکثر تا ۳۰ روز بعد از بین می‌روند/)).toBeInTheDocument()
  })

  it('never asks for or withdraws consent, and names no model or provider', async () => {
    vi.mocked(currentUser).mockResolvedValue(account)
    renderPage()

    const ai = within((await screen.findByRole('heading', { name: 'هوش مصنوعی' })).closest('section') as HTMLElement)
    expect(ai.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/اجازه|DeepSeek|سرویس/)).not.toBeInTheDocument()
  })

  it('is readable without a session and says so when no provider receives text', async () => {
    vi.mocked(currentUser).mockResolvedValue(null)
    vi.mocked(getPilotNotice).mockResolvedValue({ ...notice, aiReceivesPlanningText: false, supportContact: null })
    renderPage()

    expect(await screen.findByText('در این نسخه هیچ متنی برای مدل هوش مصنوعی بیرونی فرستاده نمی‌شود.')).toBeInTheDocument()
    expect(screen.getByText('بازگشت به ورود')).toBeInTheDocument()
    expect(screen.getByText(/با پشتیبانی تماس بگیرید/)).toBeInTheDocument()
  })
})
