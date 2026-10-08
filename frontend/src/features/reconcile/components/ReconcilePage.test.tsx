import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays } from 'date-fns-jalali'
import { toIsoDate } from '../../../shared/lib/date'
import { useUiStore } from '../../../shared/lib/ui-store'
import { reviewGoal } from '../../goals/services/goals-api'
import { completeTask } from '../../tasks/services/tasks-api'
import {
  cancelReconcileExplanation,
  createReconcilePreview,
  dismissReconcileRecommendation,
  getReconcileSession,
  openReconcileSession,
  requestReconcileExplanation,
  submitReconcileConfirmation,
} from '../services/reconcile-api'
import type {
  ActionConfirmationDto,
  ReconcileExplanationDto,
  ReconcileRecommendationEvidenceDto,
  ReconcileSessionDto,
  ReconcileTaskItemDto,
} from '../types/reconcile.types'
import { ReconcilePage } from './ReconcilePage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../services/reconcile-api', () => ({
  openReconcileSession: vi.fn(), getReconcileSession: vi.fn(), completeReconcileSession: vi.fn(),
  createReconcilePreview: vi.fn(), submitReconcileConfirmation: vi.fn(),
  requestReconcileExplanation: vi.fn(), cancelReconcileExplanation: vi.fn(), dismissReconcileRecommendation: vi.fn(),
}))
vi.mock('../../tasks/services/tasks-api', () => ({ completeTask: vi.fn() }))
vi.mock('../../goals/services/goals-api', () => ({ reviewGoal: vi.fn(), listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({ reviewProject: vi.fn(), listProjects: vi.fn() }))
vi.mock('../../captures/services/captures-api', () => ({ discardCapture: vi.fn() }))

const sessionId = '00000000-0000-0000-0000-000000000900'
const sequenceId = '00000000-0000-0000-0000-000000000700'
const goalId = '00000000-0000-0000-0000-000000000030'

const item = (id: string, title: string, overrides: Partial<ReconcileTaskItemDto> = {}): ReconcileTaskItemDto => ({
  taskId: id, title, version: 1, plannedDate: '2026-09-28', deadline: null, ageDays: 4, carryCount: 0,
  isProtected: false, isBlocked: false, actionable: true, reasonCodes: ['EXECUTION_OVERDUE'], ruleIds: [],
  allowedActions: ['COMPLETE_TASK', 'REPLAN_TASKS', 'DROP_TASKS', 'KEEP_TASKS'], ...overrides,
})
const loose = item('00000000-0000-0000-0000-000000000111', 'پرداخت قبض')
const head = item('00000000-0000-0000-0000-000000000121', 'طراحی اولیه')
const blocked = item('00000000-0000-0000-0000-000000000122', 'بازبینی طرح', {
  isBlocked: true, actionable: false, allowedActions: ['REPLAN_TASKS', 'DROP_TASKS'],
})

const session: ReconcileSessionDto = {
  id: sessionId, status: 'OPEN', version: 1, localDate: '2026-10-02', rulesCatalogVersion: '2026-10-02.1',
  openedAt: '2026-10-02T06:00:00Z', completedAt: null, openedSeverity: 'LIGHT', openedActionableBacklogCount: 2,
  severity: 'LIGHT', triggerReasons: ['EXECUTION_OVERDUE', 'REVIEW_DUE'],
  counts: {
    actionableBacklogCount: 2, oldestUnresolvedAgeDays: 4, repeatedCarryTaskCount: 0, deadlineRiskCount: 0,
    affectedParentCount: 1, reviewDueCount: 1, unresolvedCaptureCount: 1,
  },
  executionGroups: [
    {
      ownerType: 'PROJECT', ownerId: '00000000-0000-0000-0000-000000000040', ownerTitle: 'بازطراحی سایت',
      sequences: [{
        sequenceId, reasonCodes: ['EXECUTION_OVERDUE'], ruleIds: [],
        allowedActions: ['SEQUENCE_CARRY_ALL', 'SEQUENCE_DROP_ALL'], droppedPredecessor: null, items: [head, blocked],
      }],
      tasks: [],
    },
    { ownerType: 'STANDALONE', ownerId: null, ownerTitle: null, sequences: [], tasks: [loose] },
  ],
  commitmentReviews: [{
    entityType: 'GOAL', id: goalId, title: 'یادگیری زبان', version: 3, reviewDate: '2026-10-01', targetDate: null,
    allowedActions: ['CONTINUE', 'REVIEW_LATER', 'ABANDON_GOAL'],
    undatedTasks: [{ id: '00000000-0000-0000-0000-000000000131', title: 'انتخاب کتاب', version: 1, deadline: null }],
  }],
  captures: [{
    id: '00000000-0000-0000-0000-000000000401', title: 'ایده هدیه', status: 'UNRESOLVED', source: 'MANUAL',
    version: 1, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', resolvedAt: null,
  }],
  ruleMatches: [],
  ai: { availability: 'NOT_ELIGIBLE', sample: false, explanation: null },
}

const preview = (overrides: Partial<ActionConfirmationDto>): ActionConfirmationDto => ({
  id: '00000000-0000-0000-0000-000000000800', reconcileSessionId: sessionId, actionType: 'KEEP_TASKS',
  status: 'CREATED', canApply: true, items: [], warnings: [], previewHash: 'A'.repeat(64),
  expiresAt: '2026-10-02T06:15:00Z', ...overrides,
})

const previewItem = (task: ReconcileTaskItemDto, classification: string, resultingStatus = 'ACTIVE') => ({
  taskId: task.taskId, title: task.title, expectedVersion: 1, classification,
  currentPlannedDate: task.plannedDate, resultingPlannedDate: task.plannedDate, resultingStatus,
})

function apiError(status: number, code: string) {
  return new AxiosError('failed', undefined, undefined, undefined, { status, data: { code } } as AxiosResponse)
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><ReconcilePage /></QueryClientProvider>)
}

describe('ReconcilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiStore.setState({ toasts: [] })
    vi.mocked(openReconcileSession).mockResolvedValue(session)
    vi.mocked(getReconcileSession).mockResolvedValue(session)
  })

  it('shows execution, commitment-review and capture lanes separately with a non-colour severity label', async () => {
    renderPage()
    const execution = within(await screen.findByRole('region', { name: 'تصمیم‌های اجرایی' }))
    expect(screen.getByText('شدت: سبک')).toBeInTheDocument()
    expect(execution.getByText('پروژه: بازطراحی سایت')).toBeInTheDocument()
    expect(execution.getByText('کارهای مستقل')).toBeInTheDocument()

    // The blocked member is context under its sequence: it cannot be completed or kept on its own.
    const sequence = within(execution.getByRole('article', { name: 'دنباله کارها' }))
    expect(sequence.getByText('منتظر کار پیشین')).toBeInTheDocument()
    expect(sequence.getByRole('button', { name: 'انجام شد: طراحی اولیه' })).toBeInTheDocument()
    expect(sequence.queryByRole('button', { name: 'انجام شد: بازبینی طرح' })).not.toBeInTheDocument()
    expect(sequence.queryByRole('button', { name: 'فعلاً بماند: بازبینی طرح' })).not.toBeInTheDocument()

    const reviews = within(screen.getByRole('region', { name: 'مرور تعهدها' }))
    expect(reviews.getByText('آیا می‌خواهید این هدف را ادامه دهید؟')).toBeInTheDocument()
    expect(reviews.getByText('انتخاب کتاب')).toBeInTheDocument()
    expect(reviews.queryByText(/گذشته/)).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'یادداشت‌های سریع' })).getByText('ایده هدیه')).toBeInTheDocument()

    vi.mocked(completeTask).mockResolvedValue({} as never)
    fireEvent.click(execution.getByRole('button', { name: 'انجام شد: پرداخت قبض' }))
    // Completion is recorded for the session's local date, not the browser's.
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith(loose.taskId, 1, '2026-10-02'))
  })

  it('applies an action only after the server preview is shown and confirmed', async () => {
    vi.mocked(createReconcilePreview).mockResolvedValue(preview({ items: [previewItem(loose, 'WILL_KEEP')] }))
    vi.mocked(submitReconcileConfirmation).mockResolvedValue({
      confirmationId: '00000000-0000-0000-0000-000000000800', status: 'RESOLVED', actionType: 'KEEP_TASKS', affectedCount: 1,
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'فعلاً بماند: پرداخت قبض' }))
    await waitFor(() => expect(createReconcilePreview).toHaveBeenCalledWith(
      sessionId, { actionType: 'KEEP_TASKS', taskIds: [loose.taskId] }))
    expect(submitReconcileConfirmation).not.toHaveBeenCalled()

    const dialog = within(await screen.findByRole('dialog', { name: 'بدون تغییر بماند' }))
    expect(await dialog.findByText('بدون تغییر می‌ماند')).toBeInTheDocument()
    fireEvent.click(dialog.getByRole('button', { name: 'تأیید و اعمال' }))
    await waitFor(() => expect(submitReconcileConfirmation).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000800', []))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // The lanes are re-read from the server instead of being edited locally.
    await waitFor(() => expect(getReconcileSession).toHaveBeenCalledWith(sessionId))
  })

  it('requires warnings to be acknowledged and recovers from a stale preview without applying anything', async () => {
    const warning = {
      warningId: 'PARENT_LEFT_WITHOUT_ACTIVE_TASKS', code: 'PARENT_LEFT_WITHOUT_ACTIVE_TASKS',
      affectedEntityIds: ['00000000-0000-0000-0000-000000000040'], warningHash: 'B'.repeat(64),
    }
    const dropPreview = preview({
      actionType: 'DROP_TASKS', items: [previewItem(loose, 'WILL_DROP', 'DROPPED')], warnings: [warning],
    })
    // Every preview the server builds is a new confirmation with its own identity.
    vi.mocked(createReconcilePreview)
      .mockResolvedValueOnce(dropPreview)
      .mockResolvedValueOnce({ ...dropPreview, id: '00000000-0000-0000-0000-000000000801' })
    vi.mocked(submitReconcileConfirmation).mockRejectedValueOnce(apiError(409, 'CONFIRMATION_STALE'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'کنار گذاشتن: پرداخت قبض' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'کنار گذاشتن' }))
    const apply = await dialog.findByRole('button', { name: 'تأیید و اعمال' })
    expect(apply).toBeDisabled()
    fireEvent.click(dialog.getByRole('checkbox'))
    expect(apply).toBeEnabled()
    fireEvent.click(apply)
    await waitFor(() => expect(submitReconcileConfirmation).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000800', [warning]))

    expect(await dialog.findByText(/چیزی اعمال نشد/)).toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: 'تأیید و اعمال' })).not.toBeInTheDocument()
    fireEvent.click(dialog.getByRole('button', { name: 'پیش‌نمایش تازه' }))
    await waitFor(() => expect(createReconcilePreview).toHaveBeenCalledTimes(2))
    // The fresh preview starts unacknowledged again.
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأیید و اعمال' })).toBeDisabled())
  })

  it('asks for a date before previewing a whole-sequence carry and refuses a blocked preview', async () => {
    vi.mocked(createReconcilePreview).mockResolvedValue(preview({
      actionType: 'SEQUENCE_CARRY_ALL', canApply: false,
      items: [previewItem(head, 'WILL_SHIFT_NORMALLY'), previewItem(blocked, 'HAS_TEMPORAL_CONFLICT')],
    }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'انتقال کل دنباله' }))
    const sheet = within(screen.getByRole('dialog', { name: 'انتقال کل دنباله' }))
    expect(createReconcilePreview).not.toHaveBeenCalled()
    fireEvent.click(sheet.getByLabelText('تاریخ جدید'))
    fireEvent.click(sheet.getByRole('button', { name: 'فردا' }))
    fireEvent.click(sheet.getByRole('button', { name: 'دیدن پیش‌نمایش' }))
    await waitFor(() => expect(createReconcilePreview).toHaveBeenCalledWith(sessionId, {
      actionType: 'SEQUENCE_CARRY_ALL', sequenceId, plannedDate: toIsoDate(addDays(new Date(), 1)),
    }))

    expect(await screen.findByText('از مهلتش می‌گذرد')).toBeInTheDocument()
    expect(screen.getByText(/به این شکل قابل اعمال نیست/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تأیید و اعمال' })).not.toBeInTheDocument()
  })

  it('answers the Goal continuation check from the review lane', async () => {
    vi.mocked(reviewGoal).mockResolvedValue({ id: goalId } as never)
    renderPage()
    const reviews = within(await screen.findByRole('region', { name: 'مرور تعهدها' }))
    fireEvent.click(reviews.getByRole('button', { name: 'ادامه می‌دهم' }))
    await waitFor(() => expect(reviewGoal).toHaveBeenCalledWith(goalId, 'CONTINUE', 3))
    await waitFor(() => expect(useUiStore.getState().toasts.map(toast => toast.message)).toEqual(['هدف ادامه می‌یابد.']))
  })

  it('shows a calm empty state when nothing is waiting and an explicit state when Reconcile is unavailable', async () => {
    vi.mocked(openReconcileSession).mockResolvedValueOnce({
      ...session, severity: 'NONE', executionGroups: [], commitmentReviews: [], captures: [],
      counts: { ...session.counts, actionableBacklogCount: 0, reviewDueCount: 0, unresolvedCaptureCount: 0 },
    })
    const view = renderPage()
    expect(await screen.findByText('چیزی برای بازبینی نمانده است.')).toBeInTheDocument()
    view.unmount()

    vi.mocked(openReconcileSession).mockRejectedValueOnce(apiError(500, 'UNEXPECTED_ERROR'))
    renderPage()
    expect(await screen.findByText('بازبینی در دسترس نیست.')).toBeInTheDocument()
    expect(screen.getByText('رفتن به امروز')).toBeInTheDocument()
  })

  describe('AI explanation', () => {
    const recommendationId = '00000000-0000-0000-0000-000000000a01'
    const evidence = (taskIds: string[], overrides: Partial<ReconcileRecommendationEvidenceDto> = {}): ReconcileRecommendationEvidenceDto => ({
      kind: 'TASK', taskIds, sequenceId: null, reasonCodes: ['EXECUTION_OVERDUE'], ruleIds: ['R2'],
      allowedActions: ['REPLAN_TASKS', 'KEEP_TASKS'], ageDays: 8, carryCount: 0, isProtected: false, daysToDeadline: null,
      memberCount: 1, blockedMemberCount: 0, hasDroppedPredecessor: false, evidenceQuality: 'SUFFICIENT', ...overrides,
    })
    const explanation = (overrides: Partial<ReconcileExplanationDto> = {}): ReconcileExplanationDto => ({
      id: '00000000-0000-0000-0000-000000000a00', status: 'READY', failureCode: null, isCurrent: true,
      summary: 'چند کار از تاریخ خود گذشته‌اند.', createdAt: '2026-10-02T06:01:00Z',
      recommendations: [{
        id: recommendationId, ruleId: 'R2', actionType: 'KEEP_TASKS', taskIds: [loose.taskId, head.taskId],
        sequenceId: null, explanation: 'از تاریخ این کارها مدتی گذشته است.', status: 'OPEN', commandStatus: null,
        tasks: [{ id: loose.taskId, title: loose.title }, { id: head.taskId, title: head.title }],
        evidence: [evidence([loose.taskId], { ageDays: 9, carryCount: 2 }), evidence([head.taskId])],
      }],
      ...overrides,
    })
    const withAi = (ai: Partial<ReconcileSessionDto['ai']>): ReconcileSessionDto =>
      ({ ...session, ai: { availability: 'AVAILABLE', sample: false, explanation: null, ...ai } })

    it('is offered only as an option and opens the ordinary preview for the Tasks the user kept', async () => {
      vi.mocked(openReconcileSession).mockResolvedValue(withAi({}))
      vi.mocked(requestReconcileExplanation).mockResolvedValue(withAi({ explanation: explanation() }))
      vi.mocked(createReconcilePreview).mockResolvedValue(preview({ items: [previewItem(loose, 'WILL_KEEP')] }))
      renderPage()
      const card = within(await screen.findByRole('region', { name: /توضیح هوش مصنوعی/ }))
      // The user is told what leaves the device before asking.
      expect(card.getByText(/عنوان و متن کارهای شما فرستاده نمی‌شود/)).toBeInTheDocument()
      expect(requestReconcileExplanation).not.toHaveBeenCalled()
      fireEvent.click(card.getByRole('button', { name: 'توضیح بده' }))

      expect(await card.findByText('چند کار از تاریخ خود گذشته‌اند.')).toBeInTheDocument()
      const recommendation = within(card.getByRole('article', { name: 'پیشنهاد: بدون تغییر بماند' }))
      // The rule is named apart from the AI text, and nothing has been applied.
      expect(recommendation.getByText('قاعده: مدت زیادی از تاریخش گذشته')).toBeInTheDocument()
      expect(recommendation.getByText('از تاریخ این کارها مدتی گذشته است.')).toBeInTheDocument()
      expect(recommendation.getByText('توضیح هوش مصنوعی:')).toBeInTheDocument()
      // The facts come from the planner and stand beside each Task, apart from the AI text.
      expect(recommendation.getByText('۹ روز گذشته · ۲ بار منتقل شده')).toBeInTheDocument()
      expect(card.getByText(/تا پیش‌نمایش را تأیید نکنید چیزی تغییر نمی‌کند/)).toBeInTheDocument()
      expect(createReconcilePreview).not.toHaveBeenCalled()
      // The deterministic lanes stay beside it.
      expect(screen.getByRole('button', { name: 'فعلاً بماند: پرداخت قبض' })).toBeInTheDocument()

      fireEvent.click(recommendation.getByRole('checkbox', { name: 'طراحی اولیه' }))
      fireEvent.click(recommendation.getByRole('button', { name: 'دیدن پیش‌نمایش' }))
      await waitFor(() => expect(createReconcilePreview).toHaveBeenCalledWith(
        sessionId, { actionType: 'KEEP_TASKS', taskIds: [loose.taskId], recommendationId }))
      expect(submitReconcileConfirmation).not.toHaveBeenCalled()
      expect(await screen.findByRole('dialog', { name: 'بدون تغییر بماند' })).toBeInTheDocument()
    })

    it('asks for a date before previewing a recommended move and lets a recommendation be declined', async () => {
      vi.mocked(openReconcileSession).mockResolvedValue(withAi({
        sample: true,
        explanation: explanation({
          recommendations: [{
            id: recommendationId, ruleId: 'R6', actionType: 'SEQUENCE_CARRY_ALL', taskIds: [head.taskId, blocked.taskId],
            sequenceId, explanation: 'این دنباله از تاریخش گذشته است.', status: 'OPEN', commandStatus: null,
            tasks: [{ id: head.taskId, title: head.title }, { id: blocked.taskId, title: blocked.title }],
            evidence: [evidence([head.taskId, blocked.taskId], { kind: 'SEQUENCE', sequenceId, memberCount: 2, blockedMemberCount: 1 })],
          }],
        }),
      }))
      vi.mocked(dismissReconcileRecommendation).mockResolvedValue({ id: recommendationId, disposition: 'REJECTED' })
      renderPage()
      const card = within(await screen.findByRole('region', { name: /توضیح هوش مصنوعی/ }))
      expect(card.getByText('نمونه')).toBeInTheDocument()
      const recommendation = within(card.getByRole('article', { name: 'پیشنهاد: انتقال کل دنباله' }))
      // A sequence is taken whole: its members cannot be picked apart here.
      expect(recommendation.queryByRole('checkbox')).not.toBeInTheDocument()
      expect(recommendation.getByText('دنباله‌ای از ۲ کار · ۱ کار منتظر کار پیشین · ۸ روز گذشته')).toBeInTheDocument()
      fireEvent.click(recommendation.getByRole('button', { name: 'دیدن پیش‌نمایش' }))
      expect(createReconcilePreview).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog', { name: 'انتقال کل دنباله' })).toBeInTheDocument()

      fireEvent.click(recommendation.getByRole('button', { name: 'نمی‌خواهم' }))
      await waitFor(() => expect(dismissReconcileRecommendation).toHaveBeenCalledWith(recommendationId))
    })

    it('can be cancelled while running and never hides the lanes when it fails, is outdated or is switched off', async () => {
      vi.mocked(openReconcileSession).mockResolvedValueOnce(withAi({ explanation: explanation({ status: 'RUNNING', summary: null, recommendations: [] }) }))
      vi.mocked(cancelReconcileExplanation).mockResolvedValue(withAi({}))
      const running = renderPage()
      expect(await screen.findByText(/در حال آماده‌سازی توضیح/)).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'تصمیم‌های اجرایی' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'انصراف' }))
      expect(await screen.findByRole('button', { name: 'توضیح بده' })).toBeInTheDocument()
      running.unmount()

      vi.mocked(openReconcileSession).mockResolvedValueOnce(withAi({
        explanation: explanation({ status: 'FAILED', failureCode: 'EXPLANATION_INVALID', summary: null, recommendations: [] }),
      }))
      vi.mocked(requestReconcileExplanation).mockRejectedValueOnce(apiError(429, 'AI_RATE_LIMITED'))
      const failed = renderPage()
      expect(await screen.findByText(/قابل استفاده نبود و کنار گذاشته شد/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'فعلاً بماند: پرداخت قبض' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }))
      expect(await screen.findByText(/به سقف درخواست توضیح رسیده‌اید/)).toBeInTheDocument()
      failed.unmount()

      vi.mocked(openReconcileSession).mockResolvedValueOnce(withAi({
        explanation: explanation({
          isCurrent: false,
          recommendations: [
            { ...explanation().recommendations[0], status: 'OUTDATED' },
            { ...explanation().recommendations[0], id: '00000000-0000-0000-0000-000000000a02', status: 'ACCEPTED', commandStatus: 'CONFLICTED' },
            { ...explanation().recommendations[0], id: '00000000-0000-0000-0000-000000000a03', status: 'ACCEPTED_EDITED', commandStatus: 'SUCCEEDED' },
          ],
        }),
      }))
      const outdated = renderPage()
      expect(await screen.findByText('از زمان این توضیح، وضعیت کارها تغییر کرده است.')).toBeInTheDocument()
      expect(screen.queryByText('چند کار از تاریخ خود گذشته‌اند.')).not.toBeInTheDocument()
      expect(screen.getByText(/این پیشنهاد دیگر معتبر نیست/)).toBeInTheDocument()
      // Accepted is never shown as applied unless the command says so.
      expect(screen.getByText(/این پیشنهاد را پذیرفتید، اما اعمال نشد/)).toBeInTheDocument()
      expect(screen.getByText('این پیشنهاد را با تغییر پذیرفتید و اعمال شد.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'دیدن پیش‌نمایش' })).not.toBeInTheDocument()
      outdated.unmount()

      vi.mocked(openReconcileSession).mockResolvedValueOnce(withAi({ availability: 'DISABLED' }))
      renderPage()
      expect(await screen.findByText(/توضیح هوشمند اکنون خاموش است/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'توضیح بده' })).not.toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'تصمیم‌های اجرایی' })).toBeInTheDocument()
    })
  })
})
