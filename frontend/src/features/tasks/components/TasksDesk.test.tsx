import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onDesktop } from '../../../test/desktop'
import { listGoals } from '../../goals/services/goals-api'
import { listProjects } from '../../projects/services/projects-api'
import { getToday } from '../../today/services/today-api'
import { completeTask, listTasks } from '../services/tasks-api'
import { TasksPage } from './TasksPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => <a href="/" className={className}>{children}</a>,
}))
vi.mock('../services/tasks-api', () => ({ listTasks: vi.fn(), completeTask: vi.fn(), getTask: vi.fn() }))
vi.mock('../../goals/services/goals-api', () => ({ listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({ listProjects: vi.fn() }))
vi.mock('../../today/services/today-api', () => ({ getToday: vi.fn() }))

const day = '2026-10-15'
const project = '00000000-0000-0000-0000-000000000500'
const goal = '00000000-0000-0000-0000-000000000400'
const task = (n: number, title: string, extra: Record<string, unknown> = {}) => ({
  id: `00000000-0000-0000-0000-00000000000${n}`, goalId: null, projectId: null, title, description: null, status: 'ACTIVE',
  plannedDate: day, deadline: null, sequenceId: null, sequenceOrder: null, isBlocked: false, blockedBy: [], isProtected: false,
  carryCount: 0, completedForLocalDate: null, source: 'MANUAL', version: 2, createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z', terminalAt: null, ...extra,
})

function renderTasks() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><TasksPage /></QueryClientProvider>)
}

describe('Tasks on desktop', () => {
  onDesktop()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getToday).mockResolvedValue({ localDate: day, tasks: [], completedTasks: [], routineOccurrences: [] } as never)
    vi.mocked(listGoals).mockResolvedValue({ items: [{ id: goal, title: 'آلمانی', status: 'ACTIVE' }], page: { nextCursor: null } } as never)
    vi.mocked(listProjects).mockResolvedValue({
      items: [{ id: project, title: 'آزمون B1', status: 'ACTIVE', goalId: goal }], page: { nextCursor: null },
    } as never)
    // Two pages: desktop reads the list to its end so every view's count is whole.
    vi.mocked(listTasks).mockImplementation(async (_status, cursor) => (cursor
      ? { items: [task(3, 'بدون تاریخ', { plannedDate: null }), task(4, 'تمام‌شده', { status: 'COMPLETED', completedForLocalDate: day })], page: { nextCursor: null } }
      : { items: [task(1, 'امروزی'), task(2, 'لغت فصل ۴', { projectId: project, plannedDate: '2026-10-12' })], page: { nextCursor: 'next' } }) as never)
  })

  it('reads every page and counts each view from the same list', async () => {
    renderTasks()
    const views = within(await screen.findByRole('navigation', { name: 'نماهای کارها' }))
    await waitFor(() => expect(listTasks).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(views.getByRole('button', { name: /همه‌ی کارهای باز/ })).toHaveTextContent('۳'))
    expect(views.getByRole('button', { name: /^امروز/ })).toHaveTextContent('۱')
    expect(views.getByRole('button', { name: /از روزهای قبل/ })).toHaveTextContent('۱')
    expect(views.getByRole('button', { name: /پایان‌یافته/ })).toHaveTextContent('۱')
    // A Task under a Project counts toward that Project's Goal.
    expect(views.getByRole('button', { name: /آلمانی/ })).toHaveTextContent('۱')

    fireEvent.click(views.getByRole('button', { name: /بدون تاریخ/ }))
    const list = within(screen.getAllByRole('region', { name: 'بدون تاریخ' })[0])
    expect(list.getByText('بدون تاریخ', { selector: 'a' })).toBeInTheDocument()
    expect(list.queryByText('امروزی')).not.toBeInTheDocument()
  })

  it('completes from the ring exactly as the phone list does', async () => {
    vi.mocked(completeTask).mockResolvedValue(task(1, 'امروزی', { status: 'COMPLETED' }) as never)
    renderTasks()
    fireEvent.click(await screen.findByRole('button', { name: 'تکمیل کار: امروزی' }))
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 2, day))
    expect(screen.getByText('کاری انتخاب نشده است.')).toBeInTheDocument()
  })
})
