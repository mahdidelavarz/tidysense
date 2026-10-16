import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listGoals } from '../../goals/services/goals-api'
import { listProjects } from '../../projects/services/projects-api'
import { getToday } from '../../today/services/today-api'
import { changeTaskSequence, getTask, listTasks, previewTaskSequence } from '../services/tasks-api'
import { TaskDetailView } from './TaskDetailView'
import { TaskForm } from './TaskForm'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => <a href="/" className={className}>{children}</a>,
}))
vi.mock('../services/tasks-api', () => ({
  listTasks: vi.fn(), getTask: vi.fn(), previewTaskSequence: vi.fn(), changeTaskSequence: vi.fn(),
}))
vi.mock('../../goals/services/goals-api', () => ({ listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({ listProjects: vi.fn() }))
vi.mock('../../today/services/today-api', () => ({ getToday: vi.fn() }))

const day = '2026-10-16'
const goal = '00000000-0000-0000-0000-000000000400'
const sequence = '00000000-0000-0000-0000-000000000900'
const id = (n: number) => `00000000-0000-0000-0000-00000000000${n}`
const task = (n: number, title: string, extra: Record<string, unknown> = {}) => ({
  id: id(n), goalId: goal, projectId: null, title, description: null, status: 'ACTIVE', plannedDate: day,
  deadline: null, sequenceId: null, sequenceOrder: null, isBlocked: false, blockedBy: [], isProtected: false,
  carryCount: 0, completedForLocalDate: null, source: 'MANUAL', version: 2, createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z', terminalAt: null, ...extra,
})

function renderTask(taskId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><TaskDetailView taskId={taskId} /></QueryClientProvider>)
}

describe('A sequence built and changed by hand (029 §9.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getToday).mockResolvedValue({ localDate: day, tasks: [], completedTasks: [], routineOccurrences: [] } as never)
    vi.mocked(listGoals).mockResolvedValue({ items: [{ id: goal, title: 'آلمانی', status: 'ACTIVE' }], page: { nextCursor: null } } as never)
    vi.mocked(listProjects).mockResolvedValue({ items: [], page: { nextCursor: null } } as never)
  })

  it('makes a Task follow another of the same Goal after the server previews who will wait', async () => {
    const free = [task(1, 'خرید کارتن'), task(2, 'بسته‌بندی کتاب‌ها'), task(3, 'جای دیگر', { goalId: null })]
    vi.mocked(listTasks).mockResolvedValue({ items: free, page: { nextCursor: null } } as never)
    vi.mocked(getTask).mockResolvedValue(free[1] as never)
    const preview = {
      action: 'FOLLOW', taskId: id(2),
      steps: [
        { taskId: id(1), title: 'خرید کارتن', status: 'ACTIVE', changed: true, waits: false },
        { taskId: id(2), title: 'بسته‌بندی کتاب‌ها', status: 'ACTIVE', changed: true, waits: true },
      ],
      expectedMembers: [{ taskId: id(1), version: 2 }, { taskId: id(2), version: 2 }],
    }
    vi.mocked(previewTaskSequence).mockResolvedValue(preview as never)
    vi.mocked(changeTaskSequence).mockResolvedValue(task(2, 'بسته‌بندی کتاب‌ها', { sequenceId: sequence, sequenceOrder: 20 }) as never)
    renderTask(id(2))

    fireEvent.click(await screen.findByRole('button', { name: 'بعد از…' }))
    const sheet = within(await screen.findByRole('dialog', { name: 'بعد از کار دیگری' }))
    fireEvent.click(sheet.getByRole('button', { name: /بعد از کدام کار؟/ }))
    // Only active Tasks of the same Goal, never the Task itself.
    expect(sheet.queryByRole('option', { name: 'جای دیگر' })).not.toBeInTheDocument()
    expect(sheet.queryByRole('option', { name: 'بسته‌بندی کتاب‌ها' })).not.toBeInTheDocument()
    fireEvent.click(sheet.getByRole('option', { name: 'خرید کارتن' }))

    await waitFor(() => expect(previewTaskSequence).toHaveBeenCalledWith(id(2), 'FOLLOW', id(1)))
    expect(await sheet.findByText('«بسته‌بندی کتاب‌ها» بعد از «خرید کارتن» می‌آید و تا انجام آن منتظر می‌ماند.')).toBeInTheDocument()
    expect(within(sheet.getByRole('list')).getAllByRole('listitem')[1]).toHaveTextContent('منتظر می‌ماند')
    // Asked once for the choice made, not again on every render.
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(previewTaskSequence).toHaveBeenCalledTimes(1)
    expect(sheet.getByRole('button', { name: 'تأیید' })).toBeEnabled()
    // Nothing changes until it is confirmed, and then exactly what was previewed is sent.
    expect(changeTaskSequence).not.toHaveBeenCalled()
    fireEvent.click(sheet.getByRole('button', { name: 'تأیید' }))
    await waitFor(() => expect(changeTaskSequence).toHaveBeenCalledWith(id(2), 'FOLLOW', id(1), preview.expectedMembers))
  })

  it('moves only within the unresolved part, takes a Task out, and previews again when the sequence changed', async () => {
    const steps = [
      task(1, 'انجام‌شده', { status: 'COMPLETED', sequenceId: sequence, sequenceOrder: 10 }),
      task(2, 'دوم', { sequenceId: sequence, sequenceOrder: 20 }),
      task(3, 'سوم', { sequenceId: sequence, sequenceOrder: 30, isBlocked: true, blockedBy: [{ id: id(2), title: 'دوم' }] }),
    ]
    vi.mocked(listTasks).mockResolvedValue({ items: steps, page: { nextCursor: null } } as never)
    vi.mocked(getTask).mockResolvedValue(steps[1] as never)
    const leaving = {
      action: 'LEAVE', taskId: id(2), steps: [],
      expectedMembers: steps.map(x => ({ taskId: x.id, version: 2 })),
    }
    vi.mocked(previewTaskSequence).mockResolvedValue(leaving as never)
    vi.mocked(changeTaskSequence).mockRejectedValueOnce(Object.assign(new Error('stale'), {
      isAxiosError: true, response: { status: 409, data: { code: 'CONFLICT_STALE_VERSION' } },
    }))
    renderTask(id(2))

    // The step before is done, so it cannot move earlier; the next one is open, so it can move later.
    expect(await screen.findByRole('button', { name: 'زودتر' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'دیرتر' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'بیرون از ترتیب' }))
    const sheet = within(await screen.findByRole('dialog', { name: 'بیرون از ترتیب' }))
    await waitFor(() => expect(previewTaskSequence).toHaveBeenCalledWith(id(2), 'LEAVE', undefined))
    expect(await sheet.findByText(/دیگر ترتیبی نمی‌ماند/)).toBeInTheDocument()
    fireEvent.click(sheet.getByRole('button', { name: 'تأیید' }))
    await waitFor(() => expect(changeTaskSequence).toHaveBeenCalledWith(id(2), 'LEAVE', null, leaving.expectedMembers))
    // Refused as stale: the change is previewed again from what is true now.
    await waitFor(() => expect(previewTaskSequence).toHaveBeenCalledTimes(2))
  })

  it('a new Task follows the chosen Task only while it still belongs to the same owner', async () => {
    const other = '00000000-0000-0000-0000-000000000401'
    const goals = [
      { id: goal, title: 'آلمانی', status: 'ACTIVE' },
      { id: other, title: 'اسباب‌کشی', status: 'ACTIVE' },
    ]
    const onSubmit = vi.fn()
    const view = (
      <TaskForm today={day} goals={goals as never} projects={[]} tasks={[task(1, 'ثبت‌نام کلاس')] as never}
        pending={false} error={null} onSubmit={onSubmit} onCancel={() => {}} />
    )
    const submitWithOwnerChange = async (change: boolean) => {
      const { unmount } = render(view)
      fireEvent.change(screen.getByLabelText('چه کاری باید انجام شود؟'), { target: { value: 'خرید کتاب' } })
      fireEvent.click(screen.getByRole('button', { name: 'آلمانی' }))
      fireEvent.click(screen.getByRole('button', { name: /جزئیات بیشتر/ }))
      fireEvent.click(screen.getByLabelText(/ترتیب انجام/))
      fireEvent.click(screen.getByRole('option', { name: 'بعد از «ثبت‌نام کلاس»' }))
      if (change) fireEvent.click(screen.getByRole('button', { name: 'اسباب‌کشی' }))
      fireEvent.click(screen.getByRole('button', { name: 'افزودن به امروز' }))
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      const followAfter = onSubmit.mock.calls[0][1]
      onSubmit.mockClear()
      unmount()
      return followAfter
    }

    expect(await submitWithOwnerChange(false)).toBe(id(1))
    // Moved to another Goal, the Task it was to follow is no longer a choice, and nothing is sent for it.
    expect(await submitWithOwnerChange(true)).toBeUndefined()
  })
})
