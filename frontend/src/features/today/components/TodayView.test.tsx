import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getReconcileOverview, resolveReconcilePrompt } from '../../reconcile/services/reconcile-api'
import { completeOccurrence, correctOccurrence, getRoutineWeek, undoOccurrenceDone } from '../../routines/services/routines-api'
import { completeTask, dropTask, undoCompleteTask } from '../../tasks/services/tasks-api'
import { getToday } from '../services/today-api'
import { TodayView } from './TodayView'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, 'aria-label': label }: { children: React.ReactNode; 'aria-label'?: string }) => <a href="/" aria-label={label}>{children}</a>,
}))
vi.mock('../../tasks/services/tasks-api', () => ({
  completeTask: vi.fn(), undoCompleteTask: vi.fn(), carryTask: vi.fn(), dropTask: vi.fn(), listTasks: vi.fn(),
}))
// Parent titles for the badges are a lookup; these tests do not depend on them.
vi.mock('../../goals/services/goals-api', () => ({ listGoals: vi.fn().mockResolvedValue({ items: [], page: { nextCursor: null } }) }))
vi.mock('../../projects/services/projects-api', () => ({ listProjects: vi.fn().mockResolvedValue({ items: [], page: { nextCursor: null } }) }))
vi.mock('../../routines/services/routines-api', () => ({
  completeOccurrence: vi.fn(), correctOccurrence: vi.fn(), undoOccurrenceDone: vi.fn(), getRoutineWeek: vi.fn(),
}))
vi.mock('../../reconcile/services/reconcile-api', () => ({ getReconcileOverview: vi.fn(), resolveReconcilePrompt: vi.fn() }))
vi.mock('../services/today-api', () => ({ getToday: vi.fn() }))

const actionable = {
  id: '00000000-0000-0000-0000-000000000111', goalId: null, projectId: null,
  title: 'کار آماده', description: null, status: 'ACTIVE', plannedDate: '2026-09-28', deadline: null,
  sequenceId: null, sequenceOrder: null, isBlocked: false, blockedBy: [], isProtected: false, carryCount: 0,
  completedForLocalDate: null,
  source: 'MANUAL', version: 3, createdAt: '2026-09-28T00:00:00Z', updatedAt: '2026-09-28T00:00:00Z', terminalAt: null,
}
const quietOverview = {
  localDate: '2026-09-28', eligible: false, severity: 'NONE', triggerReasons: [],
  counts: {
    actionableBacklogCount: 0, oldestUnresolvedAgeDays: null, repeatedCarryTaskCount: 0, deadlineRiskCount: 0,
    affectedParentCount: 0, reviewDueCount: 0, unresolvedCaptureCount: 0,
  },
  attentionCount: 0, promptState: 'NOT_PRESENTED', showPrompt: false,
}
const blocked = {
  ...actionable,
  id: '00000000-0000-0000-0000-000000000112', title: 'کار منتظر', isBlocked: true,
  blockedBy: [{ id: actionable.id, title: actionable.title, status: 'ACTIVE', version: 3 }],
}
const routineId = '00000000-0000-0000-0000-000000000200'
const slot = (id: string, time: string | null, status: string, version = 1) => ({
  id, routineId, routineTitle: 'دارو', scheduledLocalDate: '2026-09-28', scheduledLocalTime: time,
  status, resolvedAt: status === 'PENDING' ? null : '2026-09-28T05:00:00Z', version,
})
const missed = slot('00000000-0000-0000-0000-000000000201', '08:00:00', 'MISSED', 2)
const done = slot('00000000-0000-0000-0000-000000000202', '12:00:00', 'DONE', 2)
const pending = slot('00000000-0000-0000-0000-000000000203', '16:00:00', 'PENDING')

function renderToday() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><TodayView /></QueryClientProvider>)
}

describe('TodayView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getReconcileOverview).mockResolvedValue(quietOverview)
    vi.mocked(getRoutineWeek).mockResolvedValue({ weekStart: '2026-09-26', today: '2026-09-28', routines: [] })
  })

  it('offers Reconcile without blocking Today and hides the offer for the day when declined', async () => {
    vi.mocked(getToday).mockResolvedValue({ localDate: '2026-09-28', tasks: [actionable], completedTasks: [], routineOccurrences: [] })
    vi.mocked(getReconcileOverview).mockResolvedValue({
      ...quietOverview, eligible: true, severity: 'MEDIUM', showPrompt: true, attentionCount: 4,
      counts: { ...quietOverview.counts, actionableBacklogCount: 3, reviewDueCount: 1, oldestUnresolvedAgeDays: 5 },
    })
    vi.mocked(resolveReconcilePrompt).mockResolvedValue({ localDate: '2026-09-28', state: 'SKIPPED' })
    renderToday()

    const offer = within(await screen.findByRole('region', { name: 'پیشنهاد بازبینی' }))
    expect(offer.getByText('بازبینی روزهای قبل')).toBeInTheDocument()
    expect(offer.getByText('۳ کار مانده')).toBeInTheDocument()
    expect(offer.getByText('۱ مرور تعهد')).toBeInTheDocument()
    expect(offer.getByText('قدیمی‌ترین مورد:', { exact: false }).parentElement).toHaveTextContent('۵ روز')
    expect(offer.getByRole('link', { name: 'شروع بازبینی' })).toBeInTheDocument()
    // Today's own work stays usable next to the offer.
    expect(screen.getByRole('button', { name: 'تکمیل کار: کار آماده' })).toBeEnabled()

    vi.mocked(getReconcileOverview).mockResolvedValue({ ...quietOverview, eligible: true, promptState: 'SKIPPED' })
    fireEvent.click(offer.getByRole('button', { name: 'فعلاً نه' }))
    await waitFor(() => expect(resolveReconcilePrompt).toHaveBeenCalledWith('SKIPPED'))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'پیشنهاد بازبینی' })).not.toBeInTheDocument())
    expect(screen.getByText('کار آماده')).toBeInTheDocument()
  })

  it('keeps blocked sequence work as context and completes only actionable work', async () => {
    vi.mocked(getToday).mockResolvedValue({ localDate: '2026-09-28', tasks: [actionable, blocked], completedTasks: [], routineOccurrences: [] })
    vi.mocked(completeTask).mockResolvedValue({
      ...actionable, status: 'COMPLETED', version: 4, completedForLocalDate: '2026-09-28', terminalAt: '2026-09-28T01:00:00Z',
    })
    renderToday()
    expect(await screen.findByText('کار منتظر')).toBeInTheDocument()
    expect(screen.getByText('منتظر کارهای پیشین')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'منتظر کارهای پیشین' })).toBeInTheDocument()
    expect(screen.queryByText('روتین‌های امروز')).not.toBeInTheDocument()
    // A waiting Task has a lock where its ring would be, so only ready work can be completed.
    expect(screen.getAllByRole('button', { name: /^تکمیل کار/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'تکمیل کار: کار آماده' }))
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith(actionable.id, 3, '2026-09-28'))
  })

  it('shows one Routine with a row per slot, each with its own state and action', async () => {
    vi.mocked(getToday).mockResolvedValue({ localDate: '2026-09-28', tasks: [], completedTasks: [], routineOccurrences: [missed, done, pending] })
    vi.mocked(completeOccurrence).mockResolvedValue({ ...pending, status: 'DONE', version: 2 })
    vi.mocked(correctOccurrence).mockResolvedValue({ ...missed, status: 'DONE', version: 3 })
    vi.mocked(undoOccurrenceDone).mockResolvedValue({ ...done, status: 'PENDING', resolvedAt: null, version: 3 })
    renderToday()
    const section = within(await screen.findByRole('region', { name: 'روتین‌های امروز' }))
    expect(section.getAllByRole('heading', { name: 'دارو' })).toHaveLength(1)
    expect(section.getAllByRole('listitem')).toHaveLength(4)
    expect(section.getByText('۰۸:۰۰')).toBeInTheDocument()
    expect(section.getByText('، انجام نشد')).toBeInTheDocument()
    expect(section.getByRole('button', { name: 'لغو انجام: دارو، ۱۲:۰۰' })).toBeInTheDocument()
    expect(screen.queryByText('برای امروز کاری نمانده است.')).not.toBeInTheDocument()

    // Only the pending slot can be marked done; the missed one is corrected, never carried.
    expect(section.getAllByRole('button', { name: /^انجام شد:/ })).toHaveLength(1)
    fireEvent.click(section.getByRole('button', { name: 'انجام شد: دارو، ۱۶:۰۰' }))
    await waitFor(() => expect(completeOccurrence).toHaveBeenCalledWith(pending.id, 1))
    fireEvent.click(section.getByRole('button', { name: 'انجام داده بودم' }))
    await waitFor(() => expect(correctOccurrence).toHaveBeenCalledWith(missed.id, 2, 'DONE'))
    // A done slot pressed again is undone (024 §8 note).
    fireEvent.click(section.getByRole('button', { name: 'لغو انجام: دارو، ۱۲:۰۰' }))
    await waitFor(() => expect(undoOccurrenceDone).toHaveBeenCalledWith(done.id, 2))
  })

  it('labels an untimed occurrence by the day and shows the empty state only with no work at all', async () => {
    vi.mocked(getToday).mockResolvedValueOnce({
      localDate: '2026-09-28', tasks: [], completedTasks: [],
      routineOccurrences: [slot('00000000-0000-0000-0000-000000000204', null, 'PENDING')],
    })
    const view = renderToday()
    expect(await screen.findByRole('button', { name: 'انجام شد: دارو، امروز' })).toBeInTheDocument()
    view.unmount()

    vi.mocked(getToday).mockResolvedValueOnce({ localDate: '2026-09-28', tasks: [], completedTasks: [], routineOccurrences: [] })
    renderToday()
    expect(await screen.findByText('برای امروز کاری نمانده است.')).toBeInTheDocument()
  })

  it('shows work already done today after the open work, its tick pressed again to undo it', async () => {
    const finished = {
      ...actionable, id: '00000000-0000-0000-0000-000000000113', title: 'کار تمام‌شده', status: 'COMPLETED',
      completedForLocalDate: '2026-09-28', terminalAt: '2026-09-28T01:00:00Z',
    }
    vi.mocked(getToday).mockResolvedValue({ localDate: '2026-09-28', tasks: [actionable], completedTasks: [finished], routineOccurrences: [] })
    vi.mocked(undoCompleteTask).mockResolvedValue({ ...finished, status: 'ACTIVE', completedForLocalDate: null, terminalAt: null, version: 4 })
    renderToday()
    const section = within(await screen.findByRole('region', { name: 'کارهای امروز' }))
    const rows = section.getAllByRole('listitem')
    expect(rows.map(row => row.textContent)).toEqual([expect.stringContaining('کار آماده'), expect.stringContaining('کار تمام‌شده')])
    // The count is of the work still open.
    expect(screen.getByRole('heading', { name: /کارهای امروز/ })).toHaveTextContent('۱')
    // Its only control is the tick, and pressing it undoes the completion.
    expect(within(rows[1]).getAllByRole('button')).toHaveLength(1)
    fireEvent.click(within(rows[1]).getByRole('button', { name: 'لغو انجام: کار تمام‌شده' }))
    await waitFor(() => expect(undoCompleteTask).toHaveBeenCalledWith(finished.id, 3))
  })

  it('drops a Task from its hidden actions only after confirmation', async () => {
    vi.mocked(getToday).mockResolvedValue({ localDate: '2026-09-28', tasks: [actionable], completedTasks: [], routineOccurrences: [] })
    vi.mocked(dropTask).mockResolvedValue({ ...actionable, status: 'DROPPED', version: 4, terminalAt: '2026-09-28T01:00:00Z' })
    renderToday()
    fireEvent.click(await screen.findByRole('button', { name: 'اقدام‌های بیشتر: کار آماده' }))
    fireEvent.click(screen.getByRole('button', { name: 'کنار بگذار' }))
    const dialog = within(screen.getByRole('dialog', { name: 'کنار گذاشتن کار' }))
    expect(dropTask).not.toHaveBeenCalled()
    fireEvent.click(dialog.getByRole('button', { name: 'تأیید کنار گذاشتن' }))
    await waitFor(() => expect(dropTask).toHaveBeenCalledWith(actionable.id, 3))
  })

  it('shows a Routine\'s schedule and this week so far from the week read model', async () => {
    vi.mocked(getToday).mockResolvedValue({ localDate: '2026-09-28', tasks: [], completedTasks: [], routineOccurrences: [done, pending] })
    const day = (localDate: string, scheduled: number, doneCount: number) => ({ localDate, scheduled, done: doneCount })
    vi.mocked(getRoutineWeek).mockResolvedValue({
      weekStart: '2026-09-26', today: '2026-09-28',
      routines: [{
        routineId, recurrence: { type: 'DAILY', daysOfWeek: null, dayOfMonth: null }, slotsPerDay: 2,
        days: [
          day('2026-09-26', 2, 2), day('2026-09-27', 2, 0), day('2026-09-28', 2, 1), day('2026-09-29', 2, 0),
          day('2026-09-30', 2, 0), day('2026-10-01', 2, 0), day('2026-10-02', 2, 0),
        ],
      }],
    })
    renderToday()
    const section = within(await screen.findByRole('region', { name: 'روتین‌های امروز' }))
    expect(await section.findByText('هر روز، ۲ نوبت')).toBeInTheDocument()
    expect(section.getByRole('img', { name: 'این هفته: ۱ روز کامل از ۷ روز' })).toBeInTheDocument()
    expect(section.getByText('از ۷ این هفته', { exact: false })).toBeInTheDocument()
  })
})
