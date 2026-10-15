import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onDesktop } from '../../../test/desktop'
import { listProjects } from '../../projects/services/projects-api'
import { getProgress } from '../../structure/services/progress-api'
import { getToday } from '../../today/services/today-api'
import { listGoals } from '../services/goals-api'
import { GoalsPage } from './GoalsPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => <a href="/" className={className}>{children}</a>,
}))
vi.mock('../services/goals-api', () => ({ listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({ listProjects: vi.fn() }))
vi.mock('../../structure/services/progress-api', () => ({ getProgress: vi.fn() }))
vi.mock('../../today/services/today-api', () => ({ getToday: vi.fn() }))

const day = '2026-10-15'
const goal = (id: string, title: string, targetDate: string | null) => ({
  id, title, desiredOutcome: '', status: 'ACTIVE', targetDate, reviewDate: null, createdAt: '2026-10-01T00:00:00Z',
})
const project = (id: string, title: string, goalId: string | null, targetDate: string | null) => ({
  id, title, goalId, status: 'ACTIVE', targetDate, reviewDate: null, completionMeaning: null, createdAt: '2026-10-05T00:00:00Z',
})
const work = (taskCount: number, doneTaskCount: number) => ({
  taskCount, doneTaskCount, openTaskCount: taskCount - doneTaskCount, todayTaskCount: 0, waitingTaskCount: 0,
  activeRoutineCount: 0, routineTitles: [], nextTasks: [],
})

function renderGoals() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><GoalsPage /></QueryClientProvider>)
}

describe('Goals on desktop', () => {
  onDesktop()

  beforeEach(() => {
    vi.mocked(getToday).mockResolvedValue({ localDate: day, tasks: [], completedTasks: [], routineOccurrences: [] } as never)
    vi.mocked(listGoals).mockResolvedValue({
      items: [goal('g1', 'آلمانی B1', '2026-12-10'), goal('g2', 'سلامتی', null)], page: { nextCursor: null },
    } as never)
    vi.mocked(listProjects).mockResolvedValue({
      items: [project('p1', 'آزمون', 'g1', '2026-10-25'), project('p2', 'جابه‌جایی', null, null)], page: { nextCursor: null },
    } as never)
    vi.mocked(getProgress).mockResolvedValue({
      goals: [{ goalId: 'g1', activeProjectCount: 1, work: work(14, 3) }, { goalId: 'g2', activeProjectCount: 0, work: work(0, 0) }],
      projects: [{ projectId: 'p1', work: work(6, 2) }, { projectId: 'p2', work: work(0, 0) }],
    } as never)
  })

  it('states what needs a look as facts, never as a forecast', async () => {
    renderGoals()
    const attention = within(await screen.findByRole('complementary', { name: 'نیاز به توجه' }))
    expect(attention.getByText('«آزمون»: ۱۰ روز مانده')).toBeInTheDocument()
    expect(attention.getByText('۴ کار باز دارد.')).toBeInTheDocument()
    expect(attention.getByText('«جابه‌جایی» هنوز کاری ندارد')).toBeInTheDocument()
    expect(attention.getByText('«جابه‌جایی» به هدفی وصل نیست')).toBeInTheDocument()
    expect(attention.getByText('«سلامتی» تاریخ پایان ندارد')).toBeInTheDocument()
    expect(screen.queryByText(/با این سرعت|می‌رسد/)).not.toBeInTheDocument()
  })

  it('draws each Project from when it was made to its target date, with its Tasks done', async () => {
    renderGoals()
    const timeline = within(await screen.findByRole('region', { name: 'خط زمانی پروژه‌ها' }))
    const exam = within(timeline.getByRole('region', { name: 'آلمانی B1' }))
    expect(exam.getByText(/۲ از ۶/)).toHaveTextContent('۲ از ۶ · ۱۰ روز مانده')
    expect(exam.getByText(/از ۱۳ مهر تا ۳ آبان/)).toBeInTheDocument()
    expect(within(timeline.getByRole('region', { name: 'بدون هدف' })).getByText(/بدون تاریخ پایان/)).toBeInTheDocument()

    // The phone's cards are one switch away.
    fireEvent.click(screen.getByRole('button', { name: 'کارت‌ها' }))
    expect(screen.getByRole('region', { name: 'کارت‌های هدف' })).toBeInTheDocument()
  })
})
