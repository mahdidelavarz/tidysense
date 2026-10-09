import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { getOperationsAi, getOperationsHealth, getOperationsMetrics } from '../services/operations-api'
import type { OperationsAiDto, OperationsHealthDto, OperationsMetricsDto } from '../types/operations.types'
import { OperationsPage } from './OperationsPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../auth/hooks/auth-hooks', () => ({ useCurrentUser: vi.fn() }))
vi.mock('../services/operations-api', () => ({
  getOperationsMetrics: vi.fn(), getOperationsAi: vi.fn(), getOperationsHealth: vi.fn(),
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
    vi.mocked(getOperationsMetrics).mockResolvedValue(metrics)
  })

  it('does not exist for an account that is not an operator and asks the server nothing', () => {
    signedInAs(false)
    renderPage()
    expect(screen.getByText('این صفحه پیدا نشد.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'عملیات' })).not.toBeInTheDocument()
    expect(getOperationsMetrics).not.toHaveBeenCalled()
    expect(getOperationsHealth).not.toHaveBeenCalled()
  })

  it('shows every figure as a numerator with its denominator and never as a bare rate', async () => {
    renderPage()
    // The same metric appears a second time under the internal accounts; the first table is the primary population.
    const draft = within((await screen.findAllByRole('table', { name: /H1\.REVIEWABLE_DRAFT/ }))[0])
    expect(draft.getByText('flows that reached a reviewable draft / flows started')).toBeInTheDocument()
    expect(draft.getByRole('row', { name: 'همه ۳ ۴' })).toBeInTheDocument()
    expect(screen.queryByText(/٪|%/)).not.toBeInTheDocument()

    // Accepting and applying are separate rows.
    const application = within(screen.getByRole('table', { name: /H2\.RECOMMENDATION_APPLICATION/ }))
    expect(application.getByRole('row', { name: 'APPLIED ۱ ۲' })).toBeInTheDocument()
    expect(application.getByRole('row', { name: 'ACCEPTED_CONFLICTED ۱ ۲' })).toBeInTheDocument()
    // A metric without records says so instead of showing a zero rate.
    expect(within(screen.getByRole('table', { name: /H2\.MANUAL_ESCAPE/ })).getByText('در این بازه رکوردی نیست.')).toBeInTheDocument()
    // What the product cannot measure is named, not estimated.
    expect(screen.getByText('H2.UNDERSTANDING_SCORE')).toBeInTheDocument()
    expect(screen.getByText('حساب‌های داخلی (جدا از جمعیت اصلی)')).toBeInTheDocument()
  })

  it('lists active alerts with their severity and the state of maintenance', async () => {
    renderPage()
    const alerts = within(await screen.findByRole('list', { name: 'هشدارهای فعال' }))
    expect(alerts.getAllByRole('listitem')).toHaveLength(2)
    expect(alerts.getByText('AI_BUDGET_NEAR_LIMIT')).toBeInTheDocument()
    expect(alerts.getByText('بحرانی')).toBeInTheDocument()
    expect(alerts.getByText('AI_PROVIDER_SPEND_CAP_LATCHED')).toBeInTheDocument()
    expect(screen.getByText('تلاش‌های برنامه‌ریزی گیرکرده').nextElementSibling).toHaveTextContent('۲')
  })

  it('shows the AI runtime per family, with the sample explainer and a kill switch stated', async () => {
    renderPage()
    const families = within(await screen.findByRole('table', { name: /وضعیت خانواده‌ها/ }))
    const reconcile = within(families.getByRole('row', { name: /RECONCILE/ }))
    expect(reconcile.getByText('mock')).toBeInTheDocument()
    expect(reconcile.getByText('روشن')).toBeInTheDocument()
    expect(within(families.getByRole('row', { name: /PLANNING/ })).getByText('خاموش')).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: 'نتیجهٔ گام‌های عملیات در بازه' })).getByText('SCHEMA')).toBeInTheDocument()
  })

  it('reads the chosen window again and keeps the rest of the page when one part fails', async () => {
    vi.mocked(getOperationsAi).mockRejectedValue(new Error('unavailable'))
    renderPage()
    await screen.findAllByRole('table', { name: /H1\.REVIEWABLE_DRAFT/ })
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
  })
})
