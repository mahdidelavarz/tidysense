import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getGoal, previewGoalTerminal, terminateGoal } from '../services/goals-api'
import { GoalDetailView } from './GoalDetailView'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../planning/services/planning-api', () => ({ listPlanningFacts: vi.fn().mockResolvedValue([]), removePlanningFact: vi.fn() }))
vi.mock('../services/goals-api', () => ({
  getGoal: vi.fn(), previewGoalTerminal: vi.fn(), terminateGoal: vi.fn(), updateGoal: vi.fn(),
}))

const goal = {
  id: '00000000-0000-0000-0000-000000000010', title: 'یادگیری زبان', desiredOutcome: 'رسیدن به B2',
  status: 'ACTIVE', targetDate: null, reviewDate: '2026-12-01', reviewDateSource: 'SYSTEM_DEFAULT',
  lastContinuationDecisionAt: null, source: 'MANUAL', version: 1,
  createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z', terminalAt: null,
}

function renderGoal() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <GoalDetailView goalId={goal.id} />
  </QueryClientProvider>)
}

describe('GoalDetailView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows active Project blockers and does not offer terminal confirmation', async () => {
    vi.mocked(getGoal).mockResolvedValue(goal)
    vi.mocked(previewGoalTerminal).mockResolvedValue({
      entityId: goal.id, entityType: 'Goal', currentStatus: 'ACTIVE', targetStatus: 'ACHIEVED',
      expectedVersion: 1, canApply: false,
      blockers: [{ resourceType: 'Project', resourceId: '00000000-0000-0000-0000-000000000020', status: 'ACTIVE', version: 1 }],
      cascades: [],
      previewHash: 'b'.repeat(64),
    })
    renderGoal()
    fireEvent.click(await screen.findByRole('button', { name: 'تحقق هدف' }))
    expect(await screen.findByText(/ابتدا پروژه‌های فعال/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'مشاهده پروژه فعال' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تأیید تحقق هدف' })).not.toBeInTheDocument()
    expect(terminateGoal).not.toHaveBeenCalled()
  })

  it('requires a fresh preview before an explicit terminal command', async () => {
    vi.mocked(getGoal).mockResolvedValue(goal)
    vi.mocked(previewGoalTerminal).mockResolvedValue({
      entityId: goal.id, entityType: 'Goal', currentStatus: 'ACTIVE', targetStatus: 'ABANDONED',
      expectedVersion: 1, canApply: true, blockers: [], cascades: [], previewHash: 'c'.repeat(64),
    })
    vi.mocked(terminateGoal).mockResolvedValue({ ...goal, status: 'ABANDONED', version: 2 })
    renderGoal()
    fireEvent.click(await screen.findByRole('button', { name: 'رها کردن هدف' }))
    fireEvent.click(await screen.findByRole('button', { name: 'تأیید رها کردن هدف' }))
    await waitFor(() => expect(terminateGoal).toHaveBeenCalledWith(goal.id, expect.objectContaining({ previewHash: 'c'.repeat(64) })))
    expect(await screen.findByText('رهاشده')).toBeInTheDocument()
  })
})
