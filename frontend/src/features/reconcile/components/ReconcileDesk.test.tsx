import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getToday } from '../../today/services/today-api'
import type { ReconcileSessionDto } from '../types/reconcile.types'
import { EarlierDays, TodayAfter } from './ReconcileDesk'

vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a> }))
vi.mock('../../today/services/today-api', () => ({ getToday: vi.fn() }))

const item = (taskId: string, plannedDate: string, actionable = true) => ({
  taskId, title: taskId, version: 1, plannedDate, deadline: null, ageDays: 1, carryCount: 0, isProtected: false,
  isBlocked: false, actionable, reasonCodes: [], ruleIds: [], allowedActions: [],
})

describe('Reconcile on desktop', () => {
  it('counts the open Tasks by the earlier day they were planned for, newest first', () => {
    const session = {
      localDate: '2026-10-15',
      executionGroups: [
        { ownerType: 'STANDALONE', ownerId: null, ownerTitle: null, tasks: [item('a', '2026-10-14'), item('b', '2026-10-12'), item('c', '2026-10-14', false)], sequences: [] },
        { ownerType: 'PROJECT', ownerId: 'p', ownerTitle: 'پروژه', tasks: [], sequences: [{ sequenceId: 's', items: [item('d', '2026-10-14')] }] },
      ],
    } as unknown as ReconcileSessionDto
    render(<EarlierDays session={session} />)
    const days = screen.getAllByRole('listitem').map(day => day.textContent)
    expect(days).toEqual([expect.stringMatching(/دیروز۲ مانده$/), expect.stringMatching(/۳ روز پیش۱ مانده$/)])
  })

  it('shows today after the review and marks what a tap of «امروز» brought', async () => {
    vi.mocked(getToday).mockResolvedValue({
      localDate: '2026-10-15', completedTasks: [], routineOccurrences: [],
      tasks: [{ id: 't1', title: 'ارسال فاکتور' }, { id: 't2', title: 'ارزیابی طرح' }],
    } as never)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <TodayAfter quickActions={[
          { id: 'q1', taskId: 't2', actionType: 'CARRY_TO_TODAY', status: 'APPLIED' },
          { id: 'q2', taskId: 't1', actionType: 'CARRY_TO_TODAY', status: 'UNDONE' },
        ] as never} />
      </QueryClientProvider>,
    )
    const panel = within(await screen.findByRole('complementary', { name: 'امروز بعد از بازبینی' }))
    expect(await panel.findByText('ارزیابی طرح')).toBeInTheDocument()
    expect(panel.getByText('ارزیابی طرح').parentElement).toHaveTextContent('تازه')
    expect(panel.getByText('ارسال فاکتور').parentElement).not.toHaveTextContent('تازه')
    expect(panel.getByText(/کار$/)).toHaveTextContent('۱ ← ۲ کار')
  })
})
