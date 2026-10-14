import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { getOperationsAi, getOperationsHealth, getOperationsInsights, getOperationsMetrics } from '../services/operations-api'
import type {
  MetricResultDto,
  OperationsAiDto,
  OperationsHealthDto,
  OperationsInsightsDto,
  OperationsMetricsDto,
} from '../types/operations.types'
import { OperationsPage } from './OperationsPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../auth/hooks/auth-hooks', () => ({ useCurrentUser: vi.fn() }))
vi.mock('../services/operations-api', () => ({
  getOperationsMetrics: vi.fn(), getOperationsAi: vi.fn(), getOperationsHealth: vi.fn(), getOperationsInsights: vi.fn(),
}))

const health: OperationsHealthDto = {
  alerts: [
    { rule: 'AI_BUDGET_NEAR_LIMIT', severity: 'WARNING', scope: 'PLANNING', value: 1700000, threshold: 1600000 },
    { rule: 'AI_PROVIDER_SPEND_CAP_LATCHED', severity: 'CRITICAL', scope: 'RECONCILE', value: 1, threshold: 0 },
  ],
  lastMaintenanceAt: '2026-10-08T09:00:00Z', lastMaintenanceOutcome: 'SUCCEEDED', stuckExplanations: 0,
  stuckPlanningAttempts: 2, pendingOutboxMessages: 41,
}

const ai: OperationsAiDto = {
  from: '2026-09-10T00:00:00Z', to: '2026-10-08T00:00:00Z', globalKillSwitch: false,
  families: [
    {
      family: 'PLANNING', provider: 'deepseek', sample: false, killSwitch: false, retryEnabled: true,
      providerDisabled: false, circuitOpen: false, spendLatched: false, spentTodayMicros: 1700000, dailyBudgetMicros: 2000000,
    },
    {
      family: 'RECONCILE', provider: 'mock', sample: true, killSwitch: true, retryEnabled: true,
      providerDisabled: false, circuitOpen: false, spendLatched: false, spentTodayMicros: 0, dailyBudgetMicros: 1000000,
    },
  ],
  calls: [{ family: 'PLANNING', calls: 12, latencyP50Ms: 2200, latencyP95Ms: 4700, inputTokens: 21000, outputTokens: 5400, costMicros: 12780 }],
  outcomes: [
    { family: 'PLANNING', outcome: 'SUCCEEDED', failureClass: null, gate: null, count: 11 },
    { family: 'PLANNING', outcome: 'REJECTED', failureClass: 'OUTPUT_INVALID', gate: 'SCHEMA', count: 1 },
  ],
}

const metrics: OperationsMetricsDto = {
  catalogVersion: '2026-10-08.1', from: '2026-09-10T00:00:00Z', to: '2026-10-08T00:00:00Z',
  primary: [
    {
      id: 'H1.REVIEWABLE_DRAFT', definitionVersion: 1, hypothesis: 'H1', metricClass: 'BEHAVIORAL',
      numerator: 'flows that reached a reviewable draft', denominator: 'flows started',
      rows: [{ segment: '', numerator: 3, denominator: 4 }],
    },
    {
      id: 'H2.RECOMMENDATION_APPLICATION', definitionVersion: 1, hypothesis: 'H2', metricClass: 'BEHAVIORAL',
      numerator: 'accepted recommendations by result', denominator: 'accepted recommendations',
      rows: [{ segment: 'APPLIED', numerator: 1, denominator: 2 }, { segment: 'ACCEPTED_CONFLICTED', numerator: 1, denominator: 2 }],
    },
    {
      id: 'H2.MANUAL_ESCAPE', definitionVersion: 1, hypothesis: 'H2', metricClass: 'BEHAVIORAL',
      numerator: 'sessions continued by hand', denominator: 'sessions with a failed explanation', rows: [],
    },
  ],
  internal: [{
    id: 'H1.REVIEWABLE_DRAFT', definitionVersion: 1, hypothesis: 'H1', metricClass: 'BEHAVIORAL',
    numerator: 'flows that reached a reviewable draft', denominator: 'flows started',
    rows: [{ segment: '', numerator: 9, denominator: 9 }],
  }],
  external: [{ id: 'H2.UNDERSTANDING_SCORE', hypothesis: 'H2', instrument: 'Post-session understanding question.' }],
}

const figure = (id: string, rows: Array<[string, number, number]>): MetricResultDto => ({
  id, definitionVersion: 1, hypothesis: 'PRODUCT', metricClass: 'INSIGHT', numerator: 'n', denominator: 'd',
  rows: rows.map(([segment, numerator, denominator]) => ({ segment, numerator, denominator })),
})

const h1Metrics: OperationsMetricsDto = {
  ...metrics,
  primary: [
    ...metrics.primary,
    figure('H1.ACCEPTANCE', [['UNCHANGED', 14, 39], ['EDITED', 25, 39]]),
    figure('H1.DRAFT_DISPOSITION', [['APPLIED', 27, 39], ['CANCELLED_BY_USER', 8, 39], ['EXPIRED_WITHOUT_DECISION', 4, 39]]),
    figure('H1.TIME_TO_DRAFT_SECONDS', [['', 18, 40]]),
    figure('H1.USEFULNESS_RESPONSE', [['5', 9, 27], ['4', 6, 27], ['2', 1, 27], ['NO_RESPONSE', 11, 27]]),
  ],
}

const insights: OperationsInsightsDto = {
  catalogVersion: '2026-10-14.1', from: '2026-09-16T00:00:00Z', to: '2026-10-14T00:00:00Z', internalAccountCount: 4,
  figures: [
    figure('P.ACCOUNTS', [['', 6, 42]]),
    figure('P.ACTIVATION', [['', 27, 42]]),
    figure('P.WEEKLY_ACTIVE', [['', 19, 42]]),
    figure('P.SATISFIED_ACCOUNTS', [['', 21, 30]]),
    figure('P.TASKS_DONE_7D', [['AI', 54, 102], ['MANUAL', 31, 88]]),
    figure('P.TASKS_DONE_7D_ACCOUNTS', [['', 17, 24]]),
    figure('P.FUNNEL_ACCOUNTS', [['STARTED', 38, 38], ['DRAFT', 35, 38], ['DECIDED', 32, 38], ['ACCEPTED', 28, 38], ['APPLIED', 27, 38], ['ALIVE_7D', 21, 38]]),
    figure('P.FUNNEL_FLOWS', [['STARTED', 64, 64], ['DRAFT', 59, 64], ['DECIDED', 51, 64], ['ACCEPTED', 39, 64], ['APPLIED', 38, 64], ['ALIVE_7D', 29, 64]]),
    figure('P.REMOVED_BEFORE_ACCEPTING', [['TASK', 21, 140], ['ROUTINE', 9, 41]]),
    figure('P.REMOVED_BEFORE_ACCEPTING_ACCOUNTS', [['TASK', 9, 28], ['ROUTINE', 7, 28]]),
    figure('P.CLARIFICATION', [['TIMING:ASKED', 9, 40], ['TIMING:ANSWERED', 7, 9], ['TIMING:OTHER', 1, 7], ['TIMING:SKIPPED', 2, 9]]),
    figure('P.CLARIFICATION_ACCOUNTS', [['TIMING', 6, 8]]),
    figure('P.ACCEPTANCE_BY_ANSWERS', [['WITH_ANSWERS', 19, 26], ['WITHOUT_ANSWERS', 20, 33]]),
    figure('P.ACCEPTANCE_BY_ANSWERS_ACCOUNTS', [['WITH_ANSWERS', 15, 20], ['WITHOUT_ANSWERS', 16, 25]]),
    figure('P.RECONCILE_SESSIONS', [['', 74, 22]]),
    figure('P.RECONCILE_DECISIONS_PER_SESSION', [['', 288, 74]]),
    figure('P.RECONCILE_DECISION_MIX', [['DONE', 118, 288], ['TODAY', 95, 288], ['MOVED', 52, 288], ['KEEP', 23, 288]]),
    figure('P.RECONCILE_DECISION_MIX_ACCOUNTS', [['DONE', 20, 22], ['TODAY', 18, 22], ['MOVED', 12, 22], ['KEEP', 6, 22]]),
    figure('P.RECONCILE_REVERTED', [['', 8, 288]]),
    figure('P.RECONCILE_REVERTED_ACCOUNTS', [['', 5, 22]]),
    figure('P.COHORT_RETENTION', [['2026-09-20:0', 9, 9], ['2026-09-20:1', 6, 9], ['2026-10-04:0', 4, 12]]),
    figure('P.SATISFACTION_PROMPTS', [['PLANNING_DRAFT:ANSWERED', 68, 96], ['PLANNING_DRAFT:CLOSED', 28, 96]]),
    figure('P.SATISFACTION_RATING', [['PLANNING_DRAFT:5', 24, 68], ['PLANNING_DRAFT:2', 8, 68]]),
    figure('P.SATISFACTION_MEAN', [['PLANNING_DRAFT', 252, 68]]),
    figure('P.LOW_RATING_REASONS', [['', 10, 12]]),
  ],
  reasons: [{ surface: 'PLANNING_DRAFT', rating: 2, shownOn: '2026-10-11', text: 'برای هفته‌ی اول زیادی شلوغ بود' }],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><OperationsPage /></QueryClientProvider>)
}

const signedInAs = (isOperator: boolean) => vi.mocked(useCurrentUser).mockReturnValue({
  data: { id: '00000000-0000-0000-0000-000000000001', phoneNumber: '+989120000000', displayName: null, setupComplete: true, isOperator },
} as ReturnType<typeof useCurrentUser>)

describe('OperationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signedInAs(true)
    vi.mocked(getOperationsHealth).mockResolvedValue(health)
    vi.mocked(getOperationsAi).mockResolvedValue(ai)
    vi.mocked(getOperationsMetrics).mockResolvedValue(h1Metrics)
    vi.mocked(getOperationsInsights).mockResolvedValue(insights)
  })

  it('does not exist for an account that is not an operator and asks the server nothing', () => {
    signedInAs(false)
    renderPage()
    expect(screen.getByText('این صفحه پیدا نشد.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'عملیات' })).not.toBeInTheDocument()
    expect(getOperationsMetrics).not.toHaveBeenCalled()
    expect(getOperationsHealth).not.toHaveBeenCalled()
    expect(getOperationsInsights).not.toHaveBeenCalled()
  })

  describe('system health', () => {
    it('shows every H1/H2 figure as a numerator with its denominator and never as a bare rate', async () => {
      renderPage()
      expect(screen.getByRole('tab', { name: 'سلامت سیستم' })).toHaveAttribute('aria-selected', 'true')
      // The same metric appears a second time under the internal accounts; the first card is the primary population.
      const draft = within((await screen.findAllByRole('region', { name: 'H1.REVIEWABLE_DRAFT' }))[0])
      expect(draft.getByText('flows that reached a reviewable draft / flows started')).toBeInTheDocument()
      expect(draft.getByRole('listitem')).toHaveTextContent('همه۳ از ۴نمونه‌ی کم')
      expect(screen.queryByText(/٪|%/)).not.toBeInTheDocument()

      // Accepting and applying are separate rows.
      const application = within(screen.getByRole('region', { name: 'H2.RECOMMENDATION_APPLICATION' }))
      expect(application.getAllByRole('listitem').map(x => x.textContent))
        .toEqual(['APPLIED۱ از ۲نمونه‌ی کم', 'ACCEPTED_CONFLICTED۱ از ۲نمونه‌ی کم'])
      // A median is not a share of its denominator: no bar and no «از».
      expect(within(screen.getByRole('region', { name: 'H1.TIME_TO_DRAFT_SECONDS' })).getByRole('listitem'))
        .toHaveTextContent('صورت ۱۸ · مخرج ۴۰')
      // A metric without records says so instead of showing a zero rate.
      expect(within(screen.getByRole('region', { name: 'H2.MANUAL_ESCAPE' })).getByText('در این بازه رکوردی نیست.')).toBeInTheDocument()
      // What the product cannot measure is named, not estimated.
      expect(screen.getByText('H2.UNDERSTANDING_SCORE')).toBeInTheDocument()
      expect(screen.getByText('حساب‌های داخلی (جدا از جمعیت اصلی)')).toBeInTheDocument()
      expect(getOperationsInsights).not.toHaveBeenCalled()
    })

    it('lists active alerts with their severity, the summary tiles and the queues', async () => {
      renderPage()
      const alerts = within(await screen.findByRole('list', { name: 'هشدارهای فعال' }))
      expect(alerts.getAllByRole('listitem')).toHaveLength(2)
      expect(alerts.getByText('AI_BUDGET_NEAR_LIMIT')).toBeInTheDocument()
      expect(alerts.getByText('بحرانی')).toBeInTheDocument()
      expect(alerts.getByText('AI_PROVIDER_SPEND_CAP_LATCHED')).toBeInTheDocument()
      expect(screen.getByText('۱ بحرانی، ۱ هشدار')).toBeInTheDocument()
      expect(screen.getByText('تلاش‌های برنامه‌ریزی گیرکرده').closest('div')?.parentElement).toHaveTextContent('۲')
      expect(screen.getByText('موفق')).toBeInTheDocument()
    })

    it('shows the AI runtime per family, with the sample explainer and a kill switch stated', async () => {
      renderPage()
      const reconcile = within(await screen.findByRole('region', { name: 'خانواده‌ی بازبینی' }))
      expect(reconcile.getByText('mock')).toBeInTheDocument()
      expect(reconcile.getByText(/نمونه/)).toBeInTheDocument()
      expect(reconcile.getByText('توقف:', { exact: false })).toHaveTextContent('توقف: روشن')
      expect(within(screen.getByRole('region', { name: 'خانواده‌ی برنامه‌ریزی' })).getByText('توقف:', { exact: false }))
        .toHaveTextContent('توقف: خاموش')
      expect(within(screen.getByRole('list', { name: 'نتیجه‌ی گام‌ها' })).getByText('SCHEMA')).toBeInTheDocument()
      expect(within(screen.getByRole('table', { name: 'فراخوانی‌های ارائه‌دهنده در بازه' })).getByRole('row', { name: /برنامه‌ریزی ۱۲/ }))
        .toBeInTheDocument()
    })

    it('reads the chosen window again and keeps the rest of the page when one part fails', async () => {
      vi.mocked(getOperationsAi).mockRejectedValue(new Error('unavailable'))
      renderPage()
      await screen.findAllByRole('region', { name: 'H1.REVIEWABLE_DRAFT' })
      expect(within(screen.getByRole('region', { name: 'هوش مصنوعی' })).getByRole('alert')).toBeInTheDocument()
      expect(getOperationsMetrics).toHaveBeenCalledWith(28)

      fireEvent.click(screen.getByRole('button', { name: '۷ روز' }))
      await waitFor(() => expect(getOperationsMetrics).toHaveBeenCalledWith(7))
      expect(screen.getByRole('button', { name: '۷ روز' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('does not show a negative number for maintenance that has never run', async () => {
      vi.mocked(getOperationsHealth).mockResolvedValue({
        ...health, lastMaintenanceAt: null, lastMaintenanceOutcome: null,
        alerts: [{ rule: 'MAINTENANCE_MISSING', severity: 'WARNING', scope: 'MAINTENANCE', value: -1, threshold: 48 }],
      })
      renderPage()
      const alert = within(await screen.findByRole('list', { name: 'هشدارهای فعال' })).getByRole('listitem')
      expect(alert).toHaveTextContent('هنوز مقداری ثبت نشده است')
      expect(alert).not.toHaveTextContent('-')
      expect(screen.getByText('هنوز اجرا نشده')).toBeInTheDocument()
    })

    it('says when there is no alert', async () => {
      vi.mocked(getOperationsHealth).mockResolvedValue({ ...health, alerts: [] })
      renderPage()
      expect(await screen.findByText('هشدار فعالی وجود ندارد.')).toBeInTheDocument()
      expect(screen.getByText('بدون هشدار')).toBeInTheDocument()
    })
  })

  describe('product insights', () => {
    async function openInsights() {
      renderPage()
      fireEvent.click(screen.getByRole('tab', { name: 'سنجش محصول' }))
      await screen.findByRole('region', { name: 'قیف برنامه‌ریزی' })
    }

    it('reads the insights for the window and counts the internal accounts it left out', async () => {
      await openInsights()
      expect(getOperationsInsights).toHaveBeenCalledWith(28)
      expect(screen.getByRole('tab', { name: 'سنجش محصول' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText(/۴ حساب داخلی کنار گذاشته شده/)).toBeInTheDocument()
      expect(screen.getByText('2026-10-14.1')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '۹۰ روز' }))
      await waitFor(() => expect(getOperationsInsights).toHaveBeenCalledWith(90))
    })

    it('shows every figure as x of y, accounts first, and marks a denominator under 10', async () => {
      await openInsights()
      expect(screen.queryByText(/٪|%/)).not.toBeInTheDocument()
      const summary = within(screen.getByRole('region', { name: 'خلاصه' }))
      expect(summary.getByText('۴۲')).toBeInTheDocument()
      expect(summary.getByText('۶ ثبت‌نام در این بازه')).toBeInTheDocument()
      expect(summary.getByText('فعال‌سازی').closest('.ops-tile')).toHaveTextContent('۲۷ از ۴۲')

      // Each stage: accounts, then attempts, and the accounts lost since the stage before.
      const stages = within(screen.getByRole('list', { name: 'مرحله‌های قیف' })).getAllByRole('listitem')
      expect(stages).toHaveLength(6)
      expect(stages[1]).toHaveTextContent('پیش‌نویس آماده۳۵ از ۳۸ حساب۵۹ از ۶۴ تلاش۳ حساب ریزش')
      // Accepted unchanged and after edits are separate; usefulness sits beside behaviour.
      const details = within(screen.getByRole('list', { name: 'جزئیات پیش‌نویس‌ها' }))
      expect(details.getByText(/تأیید بدون تغییر/)).toHaveTextContent('۱۴ از ۳۹ پیش‌نویس')
      expect(details.getByText(/تأیید با ویرایش/)).toHaveTextContent('۲۵ از ۳۹ پیش‌نویس')
      expect(details.getByText(/رد یا رها شد/)).toHaveTextContent('۱۲ از ۳۹ پیش‌نویس')
      expect(details.getByText(/سودمندی/)).toHaveTextContent('۱۵ از ۲۷ برنامه‌ی اعمال‌شده')

      // A clarification kind with 8 accounts is a small sample; it is labelled, not hidden.
      const questions = within(screen.getByRole('region', { name: 'پرسش‌ها' }))
      expect(questions.getByText('TIMING')).toBeInTheDocument()
      expect(questions.getByText(/جواب‌داده:/)).toHaveTextContent('۶ از ۸ حسابنمونه‌ی کم')

      const reconcile = within(screen.getByRole('region', { name: 'بازبینی' }))
      expect(reconcile.getByText('۳٫۹')).toBeInTheDocument()
      expect(reconcile.getByText('۲۸۸ تصمیم در ۷۴ جلسه')).toBeInTheDocument()
      expect(within(reconcile.getByRole('list', { name: 'ترکیب تصمیم‌ها' })).getAllByRole('listitem')[0])
        .toHaveTextContent('انجام شد۲۰ از ۲۲ حساب۱۱۸ از ۲۸۸ تصمیم')

      const retention = within(screen.getByRole('table', { name: 'ماندگاری هفتگی هر هم‌دوره' }))
      expect(retention.getAllByRole('row')).toHaveLength(3)
      expect(retention.getAllByText('نمونه‌ی کم')).toHaveLength(1)
    })

    it('keeps shown, answered and closed apart and lists reasons without identity', async () => {
      await openInsights()
      const satisfaction = within(screen.getByRole('region', { name: 'رضایت از پاسخ‌های هوش مصنوعی' }))
      expect(satisfaction.getByText('هر حساب یک‌بار').parentElement).toHaveTextContent('۲۱ از ۳۰')
      expect(satisfaction.getByText(/جواب داده شد/)).toHaveTextContent('۶۸')
      expect(satisfaction.getByText(/بسته شد بی‌جواب/)).toHaveTextContent('۲۸')
      expect(satisfaction.getByText(/پیش‌نویس برنامه:/)).toHaveTextContent('۳٫۷ روی ۶۸ پاسخ')

      const reasons = within(screen.getByRole('region', { name: 'دلیل‌های نارضایتی' }))
      const reason = reasons.getByRole('listitem')
      expect(reason).toHaveTextContent('ضعیف')
      expect(reason).toHaveTextContent('«برای هفته‌ی اول زیادی شلوغ بود»')
      expect(reason).toHaveTextContent('۱۹ مهر')
      expect(reasons.getByText(/بدون نام و شماره/)).toBeInTheDocument()
    })

    it('moves between the views with the arrow keys', async () => {
      renderPage()
      const health = screen.getByRole('tab', { name: 'سلامت سیستم' })
      fireEvent.keyDown(health, { key: 'ArrowLeft' })
      expect(screen.getByRole('tab', { name: 'سنجش محصول' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: 'سنجش محصول' })).toHaveFocus()
      expect(screen.getByRole('tabpanel')).toHaveAccessibleName('سنجش محصول')
    })

    it('keeps the page when the insights cannot be read', async () => {
      vi.mocked(getOperationsInsights).mockRejectedValue(new Error('unavailable'))
      renderPage()
      fireEvent.click(screen.getByRole('tab', { name: 'سنجش محصول' }))
      expect(await screen.findByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'سلامت سیستم' })).toBeInTheDocument()
    })
  })
})
