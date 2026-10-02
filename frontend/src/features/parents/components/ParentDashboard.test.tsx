import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGoal, listGoals } from '../../goals/services/goals-api'
import { listProjects } from '../../projects/services/projects-api'
import { ParentDashboard } from './ParentDashboard'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../goals/services/goals-api', () => ({ createGoal: vi.fn(), listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({ createProject: vi.fn(), listProjects: vi.fn() }))

const empty = { items: [], page: { nextCursor: null, hasMore: false } }

function renderDashboard() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ParentDashboard />
  </QueryClientProvider>)
}

describe('ParentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listGoals).mockResolvedValue(empty)
    vi.mocked(listProjects).mockResolvedValue(empty)
  })

  it('renders explicit empty states', async () => {
    renderDashboard()
    expect(await screen.findByText('هنوز هدفی نساخته‌اید.')).toBeInTheDocument()
    expect(await screen.findByText('هنوز پروژه‌ای نساخته‌اید.')).toBeInTheDocument()
  })

  it('creates a Goal with optional dates left empty', async () => {
    vi.mocked(createGoal).mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000030', title: 'سلامتی', desiredOutcome: 'انرژی پایدار',
      status: 'ACTIVE', targetDate: null, reviewDate: '2026-12-26', reviewDateSource: 'SYSTEM_DEFAULT',
      lastContinuationDecisionAt: null, source: 'MANUAL', version: 1,
      createdAt: '2026-09-27T00:00:00Z', updatedAt: '2026-09-27T00:00:00Z', terminalAt: null,
    })
    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'هدف جدید' }))
    fireEvent.change(screen.getByLabelText('عنوان هدف'), { target: { value: 'سلامتی' } })
    fireEvent.change(screen.getByLabelText('نتیجه مطلوب'), { target: { value: 'انرژی پایدار' } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت هدف' }))
    await waitFor(() => expect(createGoal).toHaveBeenCalled())
    expect(vi.mocked(createGoal).mock.calls[0][0]).toEqual({
      title: 'سلامتی', desiredOutcome: 'انرژی پایدار', targetDate: null, reviewDate: null,
    })
  })

  it('loads the next opaque-cursor page without replacing visible Goals', async () => {
    const firstGoal = {
      id: '00000000-0000-0000-0000-000000000031', title: 'هدف اول', desiredOutcome: 'نتیجه اول',
      status: 'ACTIVE', targetDate: null, reviewDate: '2026-12-01', reviewDateSource: 'SYSTEM_DEFAULT',
      lastContinuationDecisionAt: null, source: 'MANUAL', version: 1,
      createdAt: '2026-09-27T00:00:00Z', updatedAt: '2026-09-27T00:00:00Z', terminalAt: null,
    }
    const secondGoal = { ...firstGoal, id: '00000000-0000-0000-0000-000000000032', title: 'هدف دوم' }
    // The Projects panel independently loads a flat Goal options list (for
    // its own parent-select) through this same mocked function, so the
    // response must be chosen by call arguments, not call order.
    vi.mocked(listGoals).mockImplementation(async (_status, cursor, limit) => {
      if (limit === 100) return empty
      if (!cursor) return { items: [firstGoal], page: { nextCursor: 'opaque-next', hasMore: true } }
      return { items: [secondGoal], page: { nextCursor: null, hasMore: false } }
    })
    renderDashboard()
    expect(await screen.findByText('هدف اول')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'نمایش هدف‌های بیشتر' }))
    expect(await screen.findByText('هدف دوم')).toBeInTheDocument()
    expect(screen.getByText('هدف اول')).toBeInTheDocument()
    const pagedCall = vi.mocked(listGoals).mock.calls.find(call => call[1] === 'opaque-next')
    expect(pagedCall).toBeDefined()
  })
})
