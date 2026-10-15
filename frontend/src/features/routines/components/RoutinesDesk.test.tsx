import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onDesktop } from '../../../test/desktop'
import { getToday } from '../../today/services/today-api'
import { completeOccurrence, getRoutineWeek, listRoutines } from '../services/routines-api'
import { RoutinesPage } from './RoutinesPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => <a href="/" className={className}>{children}</a>,
}))
vi.mock('../services/routines-api', () => ({
  listRoutines: vi.fn(), getRoutineWeek: vi.fn(), completeOccurrence: vi.fn(), correctOccurrence: vi.fn(),
}))
vi.mock('../../goals/services/goals-api', () => ({ listGoals: vi.fn().mockResolvedValue({ items: [], page: { nextCursor: null } }) }))
vi.mock('../../projects/services/projects-api', () => ({ listProjects: vi.fn().mockResolvedValue({ items: [], page: { nextCursor: null } }) }))
vi.mock('../../today/services/today-api', () => ({ getToday: vi.fn() }))

const walk = '00000000-0000-0000-0000-000000000300'
const routine = (id: string, title: string, status = 'ACTIVE') => ({
  id, goalId: null, projectId: null, title, description: null, status, timesOfDay: ['07:30:00', '18:00:00'],
  recurrence: { type: 'DAILY', daysOfWeek: null, dayOfMonth: null }, recurrenceTimezone: 'Asia/Tehran',
  effectiveFromLocalDate: '2026-10-01', effectiveUntilLocalDate: null, source: 'MANUAL',
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', stoppedAt: status === 'ACTIVE' ? null : '2026-10-04T10:00:00Z',
})
const days = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']

function renderRoutines() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><RoutinesPage /></QueryClientProvider>)
}

describe('Routines on desktop', () => {
  onDesktop()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listRoutines).mockResolvedValue({
      items: [routine(walk, 'پیاده‌روی'), routine('00000000-0000-0000-0000-000000000301', 'مدیتیشن صبح', 'STOPPED')],
      page: { nextCursor: null },
    } as never)
    vi.mocked(getRoutineWeek).mockResolvedValue({
      weekStart: days[0], today: '2026-10-15',
      routines: [{
        routineId: walk, slotsPerDay: 2,
        days: days.map(date => ({ localDate: date, scheduled: 2, done: date === '2026-10-14' ? 1 : date === '2026-10-13' ? 2 : 0 })),
      }],
    } as never)
    vi.mocked(getToday).mockResolvedValue({
      localDate: '2026-10-15', tasks: [], completedTasks: [],
      routineOccurrences: [
        { id: 'o1', routineId: walk, routineTitle: 'پیاده‌روی', scheduledLocalDate: '2026-10-15', scheduledLocalTime: '07:30:00', status: 'DONE', resolvedAt: '2026-10-15T04:00:00Z', version: 2 },
        { id: 'o2', routineId: walk, routineTitle: 'پیاده‌روی', scheduledLocalDate: '2026-10-15', scheduledLocalTime: '18:00:00', status: 'PENDING', resolvedAt: null, version: 1 },
      ],
    } as never)
  })

  it('shows the week from the counts the phone reads and completes today’s slot in place', async () => {
    renderRoutines()
    const table = within(await screen.findByRole('table', { name: 'روتین‌های این هفته به تفکیک روز' }))
    const row = within(table.getByRole('row', { name: /پیاده‌روی/ }))
    // Days gone are counts, today is its slots, days ahead are the planned times.
    expect(row.getByText('۲ از ۲')).toBeInTheDocument()
    expect(row.getByText('۱ از ۲')).toBeInTheDocument()
    expect(row.getByRole('button', { name: 'انجام‌شده: نوبت ۰۷:۳۰ پیاده‌روی' })).toBeDisabled()
    expect(table.getByRole('row', { name: /مدیتیشن صبح/ })).toHaveTextContent('این هفته نوبتی ندارد')

    vi.mocked(completeOccurrence).mockResolvedValue({} as never)
    fireEvent.click(row.getByRole('button', { name: 'انجام نوبت ۱۸:۰۰ پیاده‌روی' }))
    await waitFor(() => expect(completeOccurrence).toHaveBeenCalledWith('o2', 1))
    expect(screen.getByRole('region', { name: 'خلاصه‌ی روتین‌ها' })).toHaveTextContent('۱ از ۲')
  })
})
