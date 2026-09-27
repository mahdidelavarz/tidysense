import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listGoals } from '../../goals/services/goals-api'
import { getProject, previewProjectTerminal, terminateProject, updateProject } from '../services/projects-api'
import { ProjectReadView } from './ProjectReadView'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../goals/services/goals-api', () => ({ listGoals: vi.fn() }))
vi.mock('../services/projects-api', () => ({
  getProject: vi.fn(), previewProjectTerminal: vi.fn(), terminateProject: vi.fn(), updateProject: vi.fn(),
}))

const project = {
  id: '00000000-0000-0000-0000-000000000001', goalId: null, title: 'پروژه آزمایشی',
  completionMeaning: 'خروجی روشن', status: 'ACTIVE', targetDate: null,
  reviewDate: '2026-10-01', reviewDateSource: 'SYSTEM_DEFAULT', source: 'MANUAL', version: 1,
  createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z', terminalAt: null,
}

function renderProject() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><ProjectReadView projectId={project.id} /></QueryClientProvider>)
}

describe('ProjectReadView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listGoals).mockResolvedValue({ items: [], page: { nextCursor: null, hasMore: false } })
  })

  it('announces the loading state', () => {
    vi.mocked(getProject).mockReturnValue(new Promise(() => {}))
    renderProject()
    expect(screen.getByRole('status')).toHaveTextContent('در حال دریافت پروژه')
  })

  it('shows ownership-safe not found copy', async () => {
    const error = new AxiosError('not found')
    Object.assign(error, { response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND' } } })
    vi.mocked(getProject).mockRejectedValue(error)
    renderProject()
    expect(await screen.findByRole('alert')).toHaveTextContent('پروژه پیدا نشد')
  })

  it('previews and explicitly confirms project completion', async () => {
    vi.mocked(getProject).mockResolvedValue(project)
    vi.mocked(previewProjectTerminal).mockResolvedValue({
      entityId: project.id, entityType: 'Project', currentStatus: 'ACTIVE', targetStatus: 'COMPLETED',
      expectedVersion: 1, canApply: true, blockers: [], previewHash: 'a'.repeat(64),
    })
    vi.mocked(terminateProject).mockResolvedValue({ ...project, status: 'COMPLETED', version: 2 })
    renderProject()
    expect(await screen.findByRole('heading', { name: 'پروژه آزمایشی' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'تکمیل پروژه' }))
    expect(await screen.findByRole('heading', { name: 'تأیید تکمیل پروژه' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'تأیید تکمیل پروژه' }))
    await waitFor(() => expect(terminateProject).toHaveBeenCalled())
    expect(await screen.findByText('تکمیل‌شده')).toBeInTheDocument()
  })

  it('submits an edit with the authoritative version', async () => {
    vi.mocked(getProject).mockResolvedValue(project)
    vi.mocked(updateProject).mockResolvedValue({ ...project, title: 'پروژه ویرایش‌شده', version: 2 })
    renderProject()
    fireEvent.click(await screen.findByRole('button', { name: 'ویرایش پروژه' }))
    fireEvent.change(screen.getByLabelText('عنوان پروژه'), { target: { value: 'پروژه ویرایش‌شده' } })
    fireEvent.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }))
    await waitFor(() => expect(updateProject).toHaveBeenCalledWith(project.id,
      expect.objectContaining({ title: 'پروژه ویرایش‌شده', expectedVersion: 1 })))
    expect(await screen.findByRole('heading', { name: 'پروژه ویرایش‌شده' })).toBeInTheDocument()
  })
})
