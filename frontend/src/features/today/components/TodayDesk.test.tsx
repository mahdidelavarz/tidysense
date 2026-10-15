import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onDesktop } from '../../../test/desktop'
import { listGoals } from '../../goals/services/goals-api'
import { listProjects } from '../../projects/services/projects-api'
import { getReconcileOverview } from '../../reconcile/services/reconcile-api'
import { getRoutineWeek } from '../../routines/services/routines-api'
import { getProgress } from '../../structure/services/progress-api'
import { createTask, listTasks } from '../../tasks/services/tasks-api'
import { getToday } from '../services/today-api'
import { TodayView } from './TodayView'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../tasks/services/tasks-api', () => ({
  completeTask: vi.fn(), carryTask: vi.fn(), dropTask: vi.fn(), listTasks: vi.fn(), createTask: vi.fn(),
}))
vi.mock('../../goals/services/goals-api', () => ({ listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({ listProjects: vi.fn() }))
vi.mock('../../structure/services/progress-api', () => ({ getProgress: vi.fn() }))
vi.mock('../../routines/services/routines-api', () => ({
  completeOccurrence: vi.fn(), correctOccurrence: vi.fn(), getRoutineWeek: vi.fn(),
}))
vi.mock('../../reconcile/services/reconcile-api', () => ({ getReconcileOverview: vi.fn(), resolveReconcilePrompt: vi.fn() }))
vi.mock('../services/today-api', () => ({ getToday: vi.fn() }))

const day = '2026-10-15'
const task = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  id, goalId: null, projectId: null, title, description: null, status: 'ACTIVE', plannedDate: day, deadline: null,
  sequenceId: null, sequenceOrder: null, isBlocked: false, blockedBy: [], isProtected: false, carryCount: 0,
  completedForLocalDate: null, source: 'MANUAL', version: 1, createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z', terminalAt: null, ...extra,
})
const open = task('00000000-0000-0000-0000-000000000001', 'ارسال فاکتور')
const finished = task('00000000-0000-0000-0000-000000000002', 'رزرو کلاس', { status: 'COMPLETED', completedForLocalDate: day })
const slot = (id: string, time: string, status: string) => ({
  id, routineId: '00000000-0000-0000-0000-000000000300', routineTitle: 'پیاده‌روی', scheduledLocalDate: day,
  scheduledLocalTime: time, status, resolvedAt: status === 'PENDING' ? null : `${day}T05:00:00Z`, version: 1,
})

function renderToday() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><TodayView /></QueryClientProvider>)
}

describe('Today on desktop', () => {
  onDesktop()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getToday).mockResolvedValue({
      localDate: day, tasks: [open], completedTasks: [finished],
      routineOccurrences: [slot('00000000-0000-0000-0000-000000000301', '07:30:00', 'DONE'), slot('00000000-0000-0000-0000-000000000302', '18:00:00', 'PENDING')],
    } as never)
    vi.mocked(getReconcileOverview).mockResolvedValue({ showPrompt: false, counts: {} } as never)
    vi.mocked(getRoutineWeek).mockResolvedValue({ weekStart: '2026-10-10', today: day, routines: [] } as never)
    vi.mocked(listTasks).mockResolvedValue({
      items: [
        open, finished,
        task('00000000-0000-0000-0000-000000000003', 'ثبت‌نام آزمون', { plannedDate: '2026-10-16', deadline: '2026-10-19' }),
        task('00000000-0000-0000-0000-000000000004', 'تمدید بیمه', { plannedDate: '2026-10-13', deadline: '2026-10-14' }),
        task('00000000-0000-0000-0000-000000000005', 'بسته‌شده با مهلت', { status: 'DROPPED', deadline: '2026-10-15' }),
      ],
      page: { nextCursor: null },
    } as never)
    vi.mocked(listGoals).mockResolvedValue({
      items: [{ id: '00000000-0000-0000-0000-000000000400', title: 'آلمانی B1', status: 'ACTIVE', targetDate: '2026-11-29' }],
      page: { nextCursor: null },
    } as never)
    vi.mocked(listProjects).mockResolvedValue({
      items: [
        { id: '00000000-0000-0000-0000-000000000500', title: 'تمرین مکالمه', status: 'ACTIVE', goalId: null, targetDate: '2026-10-20' },
        { id: '00000000-0000-0000-0000-000000000501', title: 'جابه‌جایی', status: 'ACTIVE', goalId: null, targetDate: null },
      ],
      page: { nextCursor: null },
    } as never)
    vi.mocked(getProgress).mockResolvedValue({
      goals: [{ goalId: '00000000-0000-0000-0000-000000000400', activeProjectCount: 1, work: { taskCount: 15, doneTaskCount: 7 } }],
      projects: [],
    } as never)
  })

  it('sets what the phone already knows beside today: tiles, deadlines and goals', async () => {
    renderToday()
    const tiles = within(await screen.findByRole('region', { name: 'خلاصه‌ی امروز' }))
    expect(tiles.getByText('کارهای امروز').parentElement).toHaveTextContent('۱ از ۲')
    expect(tiles.getByText('نوبت‌های روتین').parentElement).toHaveTextContent('بعدی: ۱۸:۰۰ پیاده‌روی')
    await waitFor(() => expect(tiles.getByText('پروژه‌های در جریان').parentElement).toHaveTextContent('۱ با پایان در ۷ روز آینده'))
    expect(tiles.getByText('هدف‌های فعال').parentElement).toHaveTextContent('نزدیک‌ترین پایان')

    // Only active Tasks with a deadline, nearest first; a passed one says so.
    const deadlines = within(screen.getByRole('region', { name: 'مهلت‌های نزدیک' }))
    expect(deadlines.getAllByRole('listitem').map(item => item.textContent)).toEqual(['تمدید بیمه۱ روز گذشته', 'ثبت‌نام آزمون۴ روز'])
    expect(within(screen.getByRole('region', { name: 'هدف‌ها' })).getByText('۷ از ۱۵ کار')).toBeInTheDocument()

    // Tomorrow comes from the same Task options as the phone's day wheel.
    expect(screen.getByRole('button', { name: /فردا:/ })).toHaveTextContent('۱ کار و ۰ نوبت روتین')
    // There is no search: the phone has none.
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('narrows the list without changing it and adds a Task for the day in view with the phone’s create action', async () => {
    vi.mocked(createTask).mockResolvedValue(task('00000000-0000-0000-0000-000000000009', 'خرید نان') as never)
    renderToday()
    const list = await screen.findByRole('region', { name: 'کارهای امروز' })
    fireEvent.click(within(list).getByRole('button', { name: 'انجام‌شده ۱' }))
    expect(within(list).getByText('رزرو کلاس')).toBeInTheDocument()
    expect(within(list).queryByText('ارسال فاکتور')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('کار تازه برای این روز'), { target: { value: '  خرید نان ' } })
    fireEvent.submit(screen.getByLabelText('کار تازه برای این روز').closest('form') as HTMLFormElement)
    await waitFor(() => expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'خرید نان', plannedDate: day })))
  })
})
