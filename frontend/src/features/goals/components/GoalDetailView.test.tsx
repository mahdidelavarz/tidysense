import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listProjects } from '../../projects/services/projects-api'
import { getProgress } from '../../structure/services/progress-api'
import { getGoal, previewGoalTerminal, terminateGoal } from '../services/goals-api'
import { GoalDetailView } from './GoalDetailView'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, 'aria-label': label }: { children: React.ReactNode; 'aria-label'?: string }) => <a href="/" aria-label={label}>{children}</a>,
}))
vi.mock('../../structure/services/progress-api', () => ({ getProgress: vi.fn() }))
vi.mock('../../today/services/today-api', () => ({ getToday: vi.fn().mockResolvedValue({ localDate: '2026-10-14', tasks: [], completedTasks: [], routineOccurrences: [] }) }))
vi.mock('../../planning/services/planning-api', () => ({
  listPlanningFacts: vi.fn().mockResolvedValue([]), removePlanningFact: vi.fn(), listPlanningContinuations: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../projects/services/projects-api', () => ({ listProjects: vi.fn() }))
vi.mock('../../tasks/services/tasks-api', () => ({ completeTask: vi.fn() }))
vi.mock('../services/goals-api', () => ({
  getGoal: vi.fn(), previewGoalTerminal: vi.fn(), terminateGoal: vi.fn(), updateGoal: vi.fn(),
}))

const goal = {
  id: '00000000-0000-0000-0000-000000000010', title: 'یادگیری زبان', desiredOutcome: 'رسیدن به B2',
  status: 'ACTIVE', targetDate: '2026-10-20', reviewDate: '2026-12-01', reviewDateSource: 'SYSTEM_DEFAULT',
  lastContinuationDecisionAt: null, source: 'MANUAL', version: 1,
  createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z', terminalAt: null,
}
const project = {
  id: '00000000-0000-0000-0000-000000000020', goalId: goal.id, title: 'تمرین مکالمه', completionMeaning: null,
  status: 'ACTIVE', targetDate: null, reviewDate: '2026-12-01', reviewDateSource: 'SYSTEM_DEFAULT', source: 'MANUAL',
  version: 1, createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z', terminalAt: null,
}

function renderGoal() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <GoalDetailView goalId={goal.id} />
  </QueryClientProvider>)
}

describe('GoalDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getGoal).mockResolvedValue(goal)
    vi.mocked(listProjects).mockResolvedValue({ items: [project], page: { nextCursor: null, hasMore: false } })
    vi.mocked(getProgress).mockResolvedValue({ goals: [{ goalId: goal.id, activeProjectCount: 1, work: {
  taskCount: 13, doneTaskCount: 8, openTaskCount: 5, todayTaskCount: 2, waitingTaskCount: 1, activeRoutineCount: 2,
  routineTitles: ['ده دقیقه مرور لغت'],
  nextTasks: [
    { id: '00000000-0000-0000-0000-000000000051', title: 'نوشتن تست‌ها', projectId: null, plannedDate: '2026-10-14', isBlocked: false, version: 1 },
    { id: '00000000-0000-0000-0000-000000000052', title: 'انتشار نسخه', projectId: null, plannedDate: null, isBlocked: true, version: 1 },
  ],
} }], projects: [] })
  })

  it('shows how far the Goal has come, what is under it and its next steps', async () => {
    renderGoal()
    expect(await screen.findByText(/از ۱۳ کار انجام شد/)).toBeInTheDocument()
    expect(screen.getByText('۶۲٪')).toBeInTheDocument()
    expect(screen.getByText('۶ روز مانده')).toBeInTheDocument()
    const under = within(screen.getByRole('region', { name: 'زیر این هدف' }))
    expect(under.getByText('تمرین مکالمه')).toBeInTheDocument()
    expect(under.getByText('۲ تا برای امروز، ۱ منتظر کار پیشین')).toBeInTheDocument()
    expect(under.getByText('ده دقیقه مرور لغت')).toBeInTheDocument()
    const next = within(screen.getByRole('region', { name: 'قدم‌های بعدی' }))
    expect(next.getByRole('button', { name: 'تکمیل کار: نوشتن تست‌ها' })).toBeInTheDocument()
    // A step waiting for an earlier one has a lock, not a ring.
    expect(next.queryByRole('button', { name: 'تکمیل کار: انتشار نسخه' })).not.toBeInTheDocument()
    expect(next.getByRole('img', { name: 'منتظر کار پیشین' })).toBeInTheDocument()
  })

  it('names what stands in the way, with a way to open each, and offers only later', async () => {
    vi.mocked(previewGoalTerminal).mockResolvedValue({
      entityId: goal.id, entityType: 'Goal', currentStatus: 'ACTIVE', targetStatus: 'ACHIEVED',
      expectedVersion: 1, canApply: false,
      blockers: [{ resourceType: 'Project', resourceId: project.id, title: 'تمرین مکالمه', status: 'ACTIVE', version: 1 }],
      cascades: [],
      previewHash: 'b'.repeat(64),
    })
    renderGoal()
    fireEvent.click(await screen.findByRole('button', { name: 'به این هدف رسیدم' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'رسیدن به هدف' }))
    expect(dialog.getByText('این‌ها هنوز زیر این هدف فعال‌اند.')).toBeInTheDocument()
    expect(dialog.getByRole('link', { name: 'باز کن: تمرین مکالمه' })).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'باشه، بعداً' })).toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: 'تأیید تحقق هدف' })).not.toBeInTheDocument()
    expect(terminateGoal).not.toHaveBeenCalled()
  })

  it('requires a fresh preview before an explicit terminal command', async () => {
    vi.mocked(previewGoalTerminal).mockResolvedValue({
      entityId: goal.id, entityType: 'Goal', currentStatus: 'ACTIVE', targetStatus: 'ABANDONED',
      expectedVersion: 1, canApply: true, blockers: [],
      cascades: [{ resourceType: 'Project', resourceId: '00000000-0000-0000-0000-000000000050', title: 'پروژه زیر هدف', resultingStatus: 'STOPPED', version: 1 }],
      previewHash: 'c'.repeat(64),
    })
    vi.mocked(terminateGoal).mockResolvedValue({ ...goal, status: 'ABANDONED', version: 2 })
    renderGoal()
    fireEvent.click(await screen.findByRole('button', { name: 'توقف هدف' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'توقف هدف' }))
    expect(dialog.getByText('توقف شکست نیست؛ یعنی جایش را به چیز مهم‌تری دادید.')).toBeInTheDocument()
    // The Projects (and Tasks and Routines) the stop ends under the Goal are listed before confirming.
    expect(dialog.getByText('این پروژه‌ها با تأیید شما متوقف می‌شوند:')).toBeInTheDocument()
    expect(dialog.getByText('پروژه زیر هدف')).toBeInTheDocument()
    fireEvent.click(dialog.getByRole('button', { name: 'تأیید توقف هدف' }))
    await waitFor(() => expect(terminateGoal).toHaveBeenCalledWith(goal.id, expect.objectContaining({ previewHash: 'c'.repeat(64) })))
    expect(await screen.findByText('متوقف‌شده')).toBeInTheDocument()
  })
})
