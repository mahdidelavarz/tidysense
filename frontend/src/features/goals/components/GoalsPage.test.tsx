import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../../../shared/lib/ui-store'
import { listGoals } from '../services/goals-api'
import { GoalsPage } from './GoalsPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../services/goals-api', () => ({ listGoals: vi.fn() }))

const empty = { items: [], page: { nextCursor: null, hasMore: false } }
const firstGoal = {
  id: '00000000-0000-0000-0000-000000000031', title: 'هدف اول', desiredOutcome: 'نتیجه اول',
  status: 'ACTIVE', targetDate: null, reviewDate: '2026-12-01', reviewDateSource: 'SYSTEM_DEFAULT',
  lastContinuationDecisionAt: null, source: 'MANUAL', version: 1,
  createdAt: '2026-09-27T00:00:00Z', updatedAt: '2026-09-27T00:00:00Z', terminalAt: null,
}

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <GoalsPage />
  </QueryClientProvider>)
}

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiStore.setState({ createTarget: null })
  })

  it('defaults to active Goals and opens the shared create flow from the empty state', async () => {
    vi.mocked(listGoals).mockResolvedValue(empty)
    renderPage()
    expect(await screen.findByText('هدف فعالی ندارید.')).toBeInTheDocument()
    expect(vi.mocked(listGoals).mock.calls[0][0]).toBe('ACTIVE')
    fireEvent.click(screen.getByRole('button', { name: 'ثبت یک هدف' }))
    expect(useUiStore.getState().createTarget).toBe('goal')
  })

  it('switches to every status when the filter changes', async () => {
    vi.mocked(listGoals).mockResolvedValue(empty)
    renderPage()
    await screen.findByText('هدف فعالی ندارید.')
    fireEvent.click(screen.getByRole('button', { name: 'همه' }))
    expect(await screen.findByText('هنوز هدفی نساخته‌اید.')).toBeInTheDocument()
    await waitFor(() => expect(vi.mocked(listGoals).mock.calls.some(call => call[0] === undefined)).toBe(true))
  })

  it('loads the next opaque-cursor page without replacing visible Goals', async () => {
    const secondGoal = { ...firstGoal, id: '00000000-0000-0000-0000-000000000032', title: 'هدف دوم' }
    vi.mocked(listGoals).mockImplementation(async (_status, cursor) => cursor
      ? { items: [secondGoal], page: { nextCursor: null, hasMore: false } }
      : { items: [firstGoal], page: { nextCursor: 'opaque-next', hasMore: true } })
    renderPage()
    expect(await screen.findByText('هدف اول')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'نمایش هدف‌های بیشتر' }))
    expect(await screen.findByText('هدف دوم')).toBeInTheDocument()
    expect(screen.getByText('هدف اول')).toBeInTheDocument()
    expect(vi.mocked(listGoals).mock.calls.some(call => call[1] === 'opaque-next')).toBe(true)
  })
})
