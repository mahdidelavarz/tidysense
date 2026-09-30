import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listGoals } from '../../goals/services/goals-api'
import { listProjects } from '../../projects/services/projects-api'
import { createTask, listTasks } from '../services/tasks-api'
import { TaskWorkspace } from './TaskWorkspace'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../goals/services/goals-api', () => ({ listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({ listProjects: vi.fn() }))
vi.mock('../services/tasks-api', () => ({
  createTask: vi.fn(),
  listTasks: vi.fn(),
  taskKeys: { all: ['tasks'], list: ['tasks', 'list'], options: ['tasks', 'options'] },
  todayKey: ['today'],
}))

const empty = { items: [], page: { nextCursor: null, hasMore: false } }

function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><TaskWorkspace /></QueryClientProvider>)
}

describe('TaskWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listTasks).mockResolvedValue(empty)
    vi.mocked(listGoals).mockResolvedValue(empty)
    vi.mocked(listProjects).mockResolvedValue(empty)
  })

  it('requires a planned date for a standalone task and submits the canonical shape', async () => {
    vi.mocked(createTask).mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000101', goalId: null, projectId: null,
      title: 'مرور یادداشت‌ها', description: null, status: 'ACTIVE', plannedDate: '2026-09-28',
      deadline: null, sequenceId: null, sequenceOrder: null, isBlocked: false, blockedBy: [],
      completedForLocalDate: null, source: 'MANUAL', version: 1,
      createdAt: '2026-09-28T00:00:00Z', updatedAt: '2026-09-28T00:00:00Z', terminalAt: null,
    })
    renderWorkspace()
    fireEvent.click(await screen.findByRole('button', { name: 'کار جدید' }))
    fireEvent.change(screen.getByLabelText('عنوان کار'), { target: { value: 'مرور یادداشت‌ها' } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت کار' }))
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some(alert => alert.textContent?.includes('کار مستقل باید تاریخ برنامه‌ریزی داشته باشد'))).toBe(true)
    expect(createTask).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('تاریخ برنامه‌ریزی'), { target: { value: '2026-09-28' } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت کار' }))
    await waitFor(() => expect(createTask).toHaveBeenCalled())
    expect(vi.mocked(createTask).mock.calls[0][0]).toEqual({
      title: 'مرور یادداشت‌ها', description: null, goalId: null, projectId: null,
      plannedDate: '2026-09-28', deadline: null, sequenceId: null, sequenceOrder: null,
    })
  })
})
