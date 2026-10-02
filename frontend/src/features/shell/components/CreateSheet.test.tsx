import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toIsoDate } from '../../../shared/lib/date'
import { useUiStore } from '../../../shared/lib/ui-store'
import { createCapture } from '../../captures/services/captures-api'
import { createGoal, listGoals } from '../../goals/services/goals-api'
import { listProjects } from '../../projects/services/projects-api'
import { createTask, listTasks } from '../../tasks/services/tasks-api'
import { CreateSheet } from './CreateSheet'

vi.mock('../../captures/services/captures-api', () => ({ createCapture: vi.fn() }))
vi.mock('../../goals/services/goals-api', () => ({ createGoal: vi.fn(), listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({ createProject: vi.fn(), listProjects: vi.fn() }))
vi.mock('../../tasks/services/tasks-api', () => ({ createTask: vi.fn(), listTasks: vi.fn() }))

const empty = { items: [], page: { nextCursor: null, hasMore: false } }

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><CreateSheet /></QueryClientProvider>)
}

describe('CreateSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiStore.setState({ createTarget: null, toasts: [] })
    vi.mocked(listGoals).mockResolvedValue(empty)
    vi.mocked(listProjects).mockResolvedValue(empty)
    vi.mocked(listTasks).mockResolvedValue(empty)
  })

  it('renders nothing until a create flow is requested, then offers the four kinds', () => {
    const view = renderSheet()
    expect(view.container).toBeEmptyDOMElement()
    act(() => useUiStore.getState().openCreate('menu'))
    expect(screen.getByRole('dialog', { name: 'چه چیزی اضافه می‌کنید؟' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^روتین/ })).toBeInTheDocument()
    act(() => useUiStore.getState().openCreate('routine'))
    expect(screen.getByRole('dialog', { name: 'روتین جدید' })).toBeInTheDocument()
    act(() => useUiStore.getState().openCreate('menu'))
    fireEvent.click(screen.getByRole('button', { name: /^هدف/ }))
    expect(useUiStore.getState().createTarget).toBe('goal')
    expect(screen.getByRole('dialog', { name: 'هدف جدید' })).toBeInTheDocument()
  })

  it('creates a Goal with optional dates left empty, then closes and confirms', async () => {
    vi.mocked(createGoal).mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000030', title: 'سلامتی', desiredOutcome: 'انرژی پایدار',
      status: 'ACTIVE', targetDate: null, reviewDate: '2026-12-26', reviewDateSource: 'SYSTEM_DEFAULT',
      lastContinuationDecisionAt: null, source: 'MANUAL', version: 1,
      createdAt: '2026-09-27T00:00:00Z', updatedAt: '2026-09-27T00:00:00Z', terminalAt: null,
    })
    useUiStore.getState().openCreate('goal')
    renderSheet()
    fireEvent.change(screen.getByLabelText('عنوان هدف'), { target: { value: 'سلامتی' } })
    fireEvent.change(screen.getByLabelText('نتیجه مطلوب'), { target: { value: 'انرژی پایدار' } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت هدف' }))
    await waitFor(() => expect(createGoal).toHaveBeenCalled())
    expect(vi.mocked(createGoal).mock.calls[0][0]).toEqual({
      title: 'سلامتی', desiredOutcome: 'انرژی پایدار', targetDate: null, reviewDate: null,
    })
    await waitFor(() => expect(useUiStore.getState().createTarget).toBeNull())
    expect(useUiStore.getState().toasts.map(toast => toast.message)).toEqual(['هدف ساخته شد.'])
  })

  it('saves a title with no date and no parent as a quick capture, not as a Task', async () => {
    vi.mocked(createCapture).mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000401', title: 'تماس با دندان‌پزشک', status: 'UNRESOLVED',
      source: 'MANUAL', version: 1, createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z',
      resolvedAt: null,
    })
    useUiStore.getState().openCreate('task')
    renderSheet()
    fireEvent.change(screen.getByLabelText('عنوان کار'), { target: { value: 'تماس با دندان‌پزشک' } })
    // The form says what will happen before the user submits.
    expect(screen.getByRole('status')).toHaveTextContent('یادداشت سریع')
    fireEvent.click(screen.getByRole('button', { name: 'ذخیره یادداشت' }))
    await waitFor(() => expect(createCapture).toHaveBeenCalledWith('تماس با دندان‌پزشک'))
    expect(createTask).not.toHaveBeenCalled()
    await waitFor(() => expect(useUiStore.getState().createTarget).toBeNull())
    expect(useUiStore.getState().toasts.map(toast => toast.message)).toEqual(['یادداشت ذخیره شد.'])
  })

  it('creates a standalone Task once a date is picked in the calendar', async () => {
    const today = toIsoDate(new Date())
    vi.mocked(createTask).mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000101', goalId: null, projectId: null,
      title: 'مرور یادداشت‌ها', description: null, status: 'ACTIVE', plannedDate: today,
      deadline: null, sequenceId: null, sequenceOrder: null, isBlocked: false, blockedBy: [],
      isProtected: false, carryCount: 0, completedForLocalDate: null, source: 'MANUAL', version: 1,
      createdAt: '2026-09-28T00:00:00Z', updatedAt: '2026-09-28T00:00:00Z', terminalAt: null,
    })
    useUiStore.getState().openCreate('task')
    renderSheet()
    fireEvent.change(screen.getByLabelText('عنوان کار'), { target: { value: 'مرور یادداشت‌ها' } })
    fireEvent.click(screen.getByLabelText('تاریخ برنامه‌ریزی'))
    fireEvent.click(screen.getByRole('button', { name: 'امروز' }))
    fireEvent.click(screen.getByRole('button', { name: 'ساخت کار' }))
    await waitFor(() => expect(createTask).toHaveBeenCalled())
    expect(vi.mocked(createTask).mock.calls[0][0]).toEqual({
      title: 'مرور یادداشت‌ها', description: null, goalId: null, projectId: null,
      plannedDate: today, deadline: null, sequenceId: null, sequenceOrder: null, isProtected: false,
    })
    expect(createCapture).not.toHaveBeenCalled()
  })
})
