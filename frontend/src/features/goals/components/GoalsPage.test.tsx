import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../../../shared/lib/ui-store'
import { getProgress } from '../../structure/services/progress-api'
import { listGoals } from '../services/goals-api'
import { GoalsPage } from './GoalsPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, 'aria-label': label }: { children: React.ReactNode; 'aria-label'?: string }) => <a href="/" aria-label={label}>{children}</a>,
}))
vi.mock('../../structure/services/progress-api', () => ({ getProgress: vi.fn() }))
vi.mock('../../today/services/today-api', () => ({ getToday: vi.fn().mockResolvedValue({ localDate: '2026-10-14', tasks: [], completedTasks: [], routineOccurrences: [] }) }))
vi.mock('../services/goals-api', () => ({ listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({ listProjects: vi.fn().mockResolvedValue({ items: [], page: { nextCursor: null, hasMore: false } }) }))

const empty = { items: [], page: { nextCursor: null, hasMore: false } }
const goal = (id: string, title: string, status = 'ACTIVE', reviewDate = '2026-12-01') => ({
  id, title, desiredOutcome: 'نتیجه', status, targetDate: null, reviewDate, reviewDateSource: 'SYSTEM_DEFAULT',
  lastContinuationDecisionAt: null, source: 'MANUAL', version: 1,
  createdAt: '2026-09-27T00:00:00Z', updatedAt: '2026-09-27T00:00:00Z', terminalAt: null,
})
const first = goal('00000000-0000-0000-0000-000000000031', 'هدف اول', 'ACTIVE', '2026-10-17')
const reached = goal('00000000-0000-0000-0000-000000000032', 'هدف تمام‌شده', 'ACHIEVED')

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <GoalsPage />
  </QueryClientProvider>)
}

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiStore.setState({ createTarget: null })
    vi.mocked(getProgress).mockResolvedValue({ goals: [], projects: [] })
  })

  it('opens the shared create flow from the empty state', async () => {
    vi.mocked(listGoals).mockResolvedValue(empty)
    renderPage()
    expect(await screen.findByText('هنوز هدفی نساخته‌اید.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ثبت یک هدف' }))
    expect(useUiStore.getState().createTarget).toBe('goal')
  })

  it('shows Goals in progress with what is under them, offers the nearest review and folds finished Goals', async () => {
    vi.mocked(listGoals).mockResolvedValue({ items: [first, reached], page: { nextCursor: null, hasMore: false } })
    vi.mocked(getProgress).mockResolvedValue({
      goals: [{
        goalId: first.id, activeProjectCount: 2,
        work: { taskCount: 10, doneTaskCount: 4, openTaskCount: 6, todayTaskCount: 1, waitingTaskCount: 0, activeRoutineCount: 3, routineTitles: [], nextTasks: [] },
      }],
      projects: [],
    })
    renderPage()
    const progress = within(await screen.findByRole('region', { name: 'در جریان' }))
    expect(progress.getByText('هدف اول')).toBeInTheDocument()
    expect(await progress.findByText('۶')).toBeInTheDocument()
    expect(progress.getByRole('progressbar', { name: 'کارهای انجام‌شده' })).toHaveAttribute('aria-valuenow', '4')
    expect(screen.getByRole('link', { name: /بازبینی «هدف اول»/ })).toHaveTextContent('موعدش ۳ روز دیگر است')
    // Finished Goals are folded away until asked for.
    expect(screen.getByText('هدف تمام‌شده').closest('ul')).not.toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /پایان‌یافته/ }))
    expect(screen.getByText('هدف تمام‌شده').closest('ul')).toBeVisible()
  })
})
