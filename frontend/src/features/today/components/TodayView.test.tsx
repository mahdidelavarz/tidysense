import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completeTask } from '../../tasks/services/tasks-api'
import { getToday } from '../services/today-api'
import { TodayView } from './TodayView'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../tasks/services/tasks-api', () => ({ completeTask: vi.fn() }))
vi.mock('../services/today-api', () => ({ getToday: vi.fn() }))

const actionable = {
  id: '00000000-0000-0000-0000-000000000111', goalId: null, projectId: null,
  title: 'کار آماده', description: null, status: 'ACTIVE', plannedDate: '2026-09-28', deadline: null,
  sequenceId: null, sequenceOrder: null, isBlocked: false, blockedBy: [], completedForLocalDate: null,
  source: 'MANUAL', version: 3, createdAt: '2026-09-28T00:00:00Z', updatedAt: '2026-09-28T00:00:00Z', terminalAt: null,
}
const blocked = {
  ...actionable,
  id: '00000000-0000-0000-0000-000000000112', title: 'کار منتظر', isBlocked: true,
  blockedBy: [{ id: actionable.id, title: actionable.title, status: 'ACTIVE', version: 3 }],
}

function renderToday() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><TodayView /></QueryClientProvider>)
}

describe('TodayView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps blocked sequence work as context and completes only actionable work', async () => {
    vi.mocked(getToday).mockResolvedValue({ localDate: '2026-09-28', tasks: [actionable, blocked] })
    vi.mocked(completeTask).mockResolvedValue({
      ...actionable, status: 'COMPLETED', version: 4, completedForLocalDate: '2026-09-28', terminalAt: '2026-09-28T01:00:00Z',
    })
    renderToday()
    expect(await screen.findByText('کار منتظر')).toBeInTheDocument()
    expect(screen.getByText('منتظر تکمیل کارهای پیشین')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'تکمیل کار' })
    expect(buttons[1]).toBeDisabled()
    fireEvent.click(buttons[0])
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith(actionable.id, 3, '2026-09-28'))
  })
})
