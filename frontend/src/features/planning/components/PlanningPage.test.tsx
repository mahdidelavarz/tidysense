import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../../../shared/lib/ui-store'
import { currentUser } from '../../auth/services/auth-api'
import type { CurrentUser } from '../../auth/types/auth.types'
import { answerAiFeedback, requestAiFeedbackPrompt } from '../../feedback/services/feedback-api'
import { listGoals } from '../../goals/services/goals-api'
import { getPilotNotice, submitPilotFeedback } from '../../pilot/services/pilot-api'
import {
  cancelPlanningAttempt,
  cancelPlanningDraft,
  createPlanningPreview,
  getPlanningActive,
  getPlanningAttempt,
  getPlanningConfirmation,
  getPlanningDraft,
  revisePlanningDraft,
  startPlanningAttempt,
  submitPlanningConfirmation,
} from '../services/planning-api'
import type {
  PlanningApplyResultDto,
  PlanningAttemptDto,
  PlanningConfirmationDto,
  PlanningDraftDto,
  PlanningProposal,
  PlanningProposalViewDto,
} from '../types/planning.types'
import { PlanningPage } from './PlanningPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))
vi.mock('../../auth/services/auth-api', () => ({ currentUser: vi.fn() }))
vi.mock('../../pilot/services/pilot-api', () => ({
  getPilotNotice: vi.fn(), submitPilotFeedback: vi.fn(),
}))
vi.mock('../../feedback/services/feedback-api', () => ({
  requestAiFeedbackPrompt: vi.fn(), answerAiFeedback: vi.fn(), closeAiFeedback: vi.fn(),
}))
vi.mock('../../goals/services/goals-api', () => ({ listGoals: vi.fn() }))
vi.mock('../../projects/services/projects-api', () => ({
  listProjects: vi.fn().mockResolvedValue({ items: [], page: { nextCursor: null, hasMore: false } }),
}))
vi.mock('../services/planning-api', () => ({
  getPlanningActive: vi.fn(), startPlanningAttempt: vi.fn(), getPlanningAttempt: vi.fn(),
  cancelPlanningAttempt: vi.fn(), getPlanningDraft: vi.fn(), revisePlanningDraft: vi.fn(),
  cancelPlanningDraft: vi.fn(), createPlanningPreview: vi.fn(), getPlanningConfirmation: vi.fn(),
  submitPlanningConfirmation: vi.fn(),
}))

const attemptId = '00000000-0000-0000-0000-000000000a01'
const draftId = '00000000-0000-0000-0000-000000000d01'
const confirmationId = '00000000-0000-0000-0000-000000000c01'
const goalId = '00000000-0000-0000-0000-000000000010'
const intention = 'می‌خواهم زبان انگلیسی یاد بگیرم'

const attempt = (status: string, overrides: Partial<PlanningAttemptDto> = {}): PlanningAttemptDto => ({
  id: attemptId, clientAttemptId: 'client-attempt-1', status, intention, goalId: null, projectId: null,
  failureCode: null, draftId: status === 'SUCCEEDED' ? draftId : null, createdAt: '2026-10-03T06:00:00Z',
  completedAt: status === 'QUEUED' || status === 'RUNNING' ? null : '2026-10-03T06:00:01Z', ...overrides,
})

const proposal = (id: string, entityType: string, title: string, overrides: Partial<PlanningProposal> = {}): PlanningProposal => ({
  draftId: id, entityType, title, description: null, parentDraftId: null, underContext: false, source: 'INFERRED',
  confidence: 'MEDIUM', included: true, desiredOutcome: null, completionMeaning: null, targetDate: null,
  reviewDate: null, reviewDateSource: null, plannedDate: null, deadline: null, recurrence: null, timesOfDay: null,
  effectiveFromLocalDate: null, ...overrides,
})

const view = (item: PlanningProposal, overrides: Partial<PlanningProposalViewDto> = {}): PlanningProposalViewDto => ({
  proposal: item, state: 'INCLUDED', excludedByAncestor: false, issues: [], ...overrides,
})

const goal = proposal('goal', 'GOAL', 'یادگیری زبان', {
  desiredOutcome: 'رسیدن به سطح B2', reviewDate: '2027-01-01', reviewDateSource: 'SYSTEM_DEFAULT',
})
const step = proposal('step-1', 'TASK', 'روشن‌کردن اولین قدم', { parentDraftId: 'goal', plannedDate: '2026-10-03' })
const far = proposal('far', 'TASK', 'کار دور', { plannedDate: '2026-10-20' })

const draft = (overrides: Partial<PlanningDraftDto> = {}): PlanningDraftDto => ({
  id: draftId, attemptId, status: 'REVIEWABLE', revision: 1, expiresAt: '2026-10-04T06:00:00Z', context: null,
  summary: 'پیش‌نویس نمونه', windowStart: '2026-10-03', windowEnd: '2026-10-09',
  proposals: [view(goal), view(step)],
  facts: [{
    fact: {
      draftId: 'fact-friday', factType: 'UNAVAILABLE_WEEKDAY', strength: 'HARD', scopeDraftId: 'goal', included: true,
      value: { weekdays: [5], localDate: null, startLocalDate: null, endLocalDate: null, text: null },
    },
    category: 'AVAILABILITY', state: 'INCLUDED', excludedByAncestor: false, issues: [],
  }],
  assumptions: [{ draftId: 'step-1', text: 'تاریخ‌ها پیشنهادی‌اند.' }], unresolvedQuestions: [], draftIssues: [],
  firstWeek: [{ draftId: 'step-1', date: '2026-10-03' }], canApply: true, linkedConfirmationId: null, removedItems: [],
  ...overrides,
})

const confirmation = (overrides: Partial<PlanningConfirmationDto> = {}): PlanningConfirmationDto => ({
  id: confirmationId, draftId, revision: 1, status: 'CREATED',
  items: [
    { draftId: 'goal', entityType: 'GOAL', title: goal.title, parentDraftId: null, underContext: false },
    { draftId: 'step-1', entityType: 'TASK', title: step.title, parentDraftId: 'goal', underContext: false },
  ],
  facts: [{ draftId: 'fact-friday', factType: 'UNAVAILABLE_WEEKDAY', strength: 'HARD' }], warnings: [],
  noFactsRemembered: false, previewHash: 'A'.repeat(64), expiresAt: '2026-10-03T06:15:00Z', result: null, ...overrides,
})

const result: PlanningApplyResultDto = {
  confirmationId, status: 'RESOLVED', goalId, projectIds: [], taskIds: ['00000000-0000-0000-0000-000000000111'],
  routineIds: [], factCount: 1,
}

const account = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
  id: '00000000-0000-0000-0000-000000000001', phoneNumber: '+989120000000', displayName: null, setupComplete: true,
  isOperator: false, ...overrides,
})

function apiError(status: number, code: string) {
  return new AxiosError('failed', undefined, undefined, undefined, { status, data: { code } } as AxiosResponse)
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><PlanningPage /></QueryClientProvider>)
}

/** Opens the page on an existing draft, as after "continue previous draft". */
async function openDraft(value: PlanningDraftDto) {
  vi.mocked(getPlanningActive).mockResolvedValue({ attempt: null, draft: value, sampleGenerator: true })
  vi.mocked(getPlanningDraft).mockResolvedValue(value)
  const page = renderPage()
  fireEvent.click(await screen.findByRole('button', { name: 'ادامه پیش‌نویس قبلی' }))
  await screen.findByRole('heading', { name: 'ساختار پیشنهادی' })
  return page
}

describe('PlanningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiStore.setState({ toasts: [], createTarget: null, focused: false })
    vi.mocked(listGoals).mockResolvedValue({ items: [], page: { nextCursor: null, hasMore: false } })
    vi.mocked(getPlanningActive).mockResolvedValue({ attempt: null, draft: null, sampleGenerator: true })
    vi.mocked(currentUser).mockResolvedValue(account())
    vi.mocked(requestAiFeedbackPrompt).mockResolvedValue({ promptId: null, instrumentVersion: 1 })
  })

  it('opens the intention form at once with a model behind it, without a consent step or a named provider', async () => {
    vi.mocked(getPlanningActive).mockResolvedValue({ attempt: null, draft: null, sampleGenerator: false })
    renderPage()

    expect(await screen.findByLabelText('روی چه چیزی می‌خواهید پیش بروید؟')).toBeInTheDocument()
    expect(screen.getByText('تا خودتان تأیید نکنید، چیزی ساخته نمی‌شود.')).toBeInTheDocument()
    // The same four steps on every entry, starting at «نوشتن»; a real model is not called a sample.
    const steps = within(screen.getByRole('list', { name: 'مراحل برنامه‌ریزی' }))
    expect(steps.getAllByRole('listitem').map(item => item.textContent)).toEqual(['۱نوشتن', '۲پرسش‌ها', '۳مرور', '۴تأیید'])
    expect(steps.getByRole('listitem', { current: 'step' })).toHaveTextContent('نوشتن')
    expect(screen.queryByText(/به‌صورت نمونه/)).not.toBeInTheDocument()
    expect(useUiStore.getState().focused).toBe(false)
    // Disclosure lives on the privacy page only (Discussion 027): no consent card, provider or data-location line here.
    expect(screen.queryByText(/اجازه|بیرون از ایران|سرویس/)).not.toBeInTheDocument()
    expect(getPilotNotice).not.toHaveBeenCalled()
  })

  it('plans inside an existing Goal when one is chosen while writing', async () => {
    vi.mocked(listGoals).mockResolvedValue({
      items: [{ id: goalId, title: 'آلمانی تا B1', status: 'ACTIVE' } as never],
      page: { nextCursor: null, hasMore: false },
    })
    vi.mocked(startPlanningAttempt).mockResolvedValue(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('QUEUED'))
    renderPage()
    const none = await screen.findByRole('button', { name: 'هیچ‌کدام' })
    expect(none).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(await screen.findByRole('button', { name: 'آلمانی تا B1' }))
    expect(screen.getByRole('button', { name: 'آلمانی تا B1' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('روی چه چیزی می‌خواهید پیش بروید؟'), { target: { value: intention } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(1))
    expect(vi.mocked(startPlanningAttempt).mock.calls[0][1]).toMatchObject({ goalId, projectId: undefined })
  })

  it('starts one attempt, polls it by id and shows the validated draft as an unapproved hierarchy', async () => {
    vi.mocked(startPlanningAttempt).mockResolvedValue(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('SUCCEEDED'))
    vi.mocked(getPlanningDraft).mockResolvedValue(draft({
      proposals: [view(goal), view(step), view(far, {
        state: 'BLOCKED', issues: [{ code: 'DATE_OUTSIDE_WINDOW', severity: 'BLOCKING', origin: 'RULE' }],
      })],
      canApply: false,
    }))
    renderPage()

    const input = await screen.findByLabelText('روی چه چیزی می‌خواهید پیش بروید؟')
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))
    expect(await screen.findByText('بنویسید می‌خواهید روی چه چیزی پیش بروید.')).toBeInTheDocument()
    expect(startPlanningAttempt).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: intention } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(1))
    expect(vi.mocked(startPlanningAttempt).mock.calls[0][1]).toEqual({
      intention, goalId: undefined, projectId: undefined, replaceActive: false,
    })
    // Queued is shown as queued: no partial output and no claim of a draft.
    expect(await screen.findByText('در صف ساخت پیش‌نویس…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'ساختار پیشنهادی' })).not.toBeInTheDocument()

    await waitFor(() => expect(getPlanningAttempt).toHaveBeenCalledWith(attemptId), { timeout: 3000 })
    expect(await screen.findByText('پیش‌نویس؛ هنوز چیزی ساخته نشده', {}, { timeout: 3000 })).toBeInTheDocument()
    // Reconnecting or polling never starts another generation.
    expect(startPlanningAttempt).toHaveBeenCalledTimes(1)
    // No questions were asked, so «پرسش‌ها» shows as passed, not hidden; the review has the screen to itself.
    const steps = within(screen.getByRole('list', { name: 'مراحل برنامه‌ریزی' }))
    expect(steps.getByRole('listitem', { current: 'step' })).toHaveTextContent('مرور')
    expect(steps.getByText(/پرسش‌ها/)).toHaveTextContent('پرسش‌ها، انجام شد')
    expect(useUiStore.getState().focused).toBe(true)
    expect(screen.getByText(`«${intention}»`)).toBeInTheDocument()

    // The child is nested under its parent, not flattened beside it.
    const goalCard = within(screen.getByRole('article', { name: goal.title }))
    expect(goalCard.getByRole('checkbox', { name: `در برنامه باشد: ${step.title}` })).toBeInTheDocument()
    expect(goalCard.getByText('فرض: تاریخ‌ها پیشنهادی‌اند.')).toBeInTheDocument()
    expect(goalCard.getByText('مستقیم زیر این هدف')).toBeInTheDocument()
    expect(screen.getByText('مستقل')).toBeInTheDocument()

    // A blocked item says why, offers its fix, and the decision at the foot leads there instead of being dead.
    expect(screen.getByText(/نیازمند اصلاح: تاریخ بیرون از هفت روز پیش رو است/)).toBeInTheDocument()
    expect(screen.getByText('۱ مورد نیاز به اصلاح دارد.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'مرور نهایی و تأیید' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'اول ۱ مورد را اصلاح کنید' }))
    expect(screen.getByRole('button', { name: `اصلاح: ${far.title}` })).toHaveFocus()
    expect(createPlanningPreview).not.toHaveBeenCalled()
  })

  it('may ask about a draft once it was cancelled, never while it is under review', async () => {
    vi.mocked(requestAiFeedbackPrompt).mockResolvedValue({ promptId: '00000000-0000-0000-0000-0000000000f1', instrumentVersion: 1 })
    vi.mocked(answerAiFeedback).mockResolvedValue()
    vi.mocked(cancelPlanningDraft).mockResolvedValue(draft({ status: 'CANCELLED', canApply: false }))
    await openDraft(draft())
    expect(requestAiFeedbackPrompt).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'لغو' }))
    expect(await screen.findByText('برنامه‌ریزی لغو شد.')).toBeInTheDocument()
    await waitFor(() => expect(requestAiFeedbackPrompt).toHaveBeenCalledWith('PLANNING_DRAFT', draftId))
    // The prompt sits inside the page and blocks nothing: the next step stays available.
    fireEvent.click(await screen.findByRole('button', { name: 'معمولی' }))
    await waitFor(() => expect(answerAiFeedback).toHaveBeenCalledWith('00000000-0000-0000-0000-0000000000f1', 3, null))
    expect(screen.getByRole('button', { name: 'شروع دوباره' })).toBeEnabled()
  })

  it('never replaces an unapproved draft silently', async () => {
    const existing = draft({ linkedConfirmationId: confirmationId })
    const page = await openDraft(existing)
    expect(getPlanningDraft).toHaveBeenCalledWith(draftId)
    // A linked confirmation is not success: the draft is still only reviewable.
    expect(screen.queryByText('برنامه ساخته شد.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'مرور نهایی و تأیید' })).toBeEnabled()
    // Rewriting from the review says the draft will be replaced, and replaces it only when asked to.
    fireEvent.click(screen.getByRole('button', { name: 'ویرایش نوشته' }))
    expect(screen.getByText('با ساخت پیش‌نویس تازه، پیش‌نویس قبلی کنار گذاشته می‌شود.')).toBeInTheDocument()
    expect(useUiStore.getState().focused).toBe(false)
    page.unmount()

    vi.mocked(startPlanningAttempt).mockResolvedValue(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('QUEUED'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'شروع تازه و کنار گذاشتن قبلی' }))
    expect(screen.getByText('با ساخت پیش‌نویس تازه، پیش‌نویس قبلی کنار گذاشته می‌شود.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('روی چه چیزی می‌خواهید پیش بروید؟'), { target: { value: intention } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(1))
    expect(vi.mocked(startPlanningAttempt).mock.calls[0][1]).toMatchObject({ replaceActive: true })
    // The replaced draft ended without being applied, so it may be asked about.
    await waitFor(() => expect(requestAiFeedbackPrompt).toHaveBeenCalledWith('PLANNING_DRAFT', draftId))
  })

  it('keeps the input after a failed attempt and offers retry, edit and the manual path', async () => {
    vi.mocked(startPlanningAttempt).mockResolvedValue(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('FAILED', { failureCode: 'DRAFT_INVALID' }))
    renderPage()
    fireEvent.change(await screen.findByLabelText('روی چه چیزی می‌خواهید پیش بروید؟'), { target: { value: intention } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))

    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('ساخت پیش‌نویس انجام نشد')
    expect(screen.getByText(/پیش‌نویس ساخته‌شده معتبر نبود/)).toBeInTheDocument()
    expect(screen.getByText(intention)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'خودم دستی می‌سازم' }))
    expect(useUiStore.getState().createTarget).toBe('menu')

    // A retry is a new attempt with its own identity and the same input.
    fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(2))
    const [first, second] = vi.mocked(startPlanningAttempt).mock.calls
    expect(second[1]).toMatchObject({ intention })
    expect(second[0]).not.toBe(first[0])

    fireEvent.click(await screen.findByRole('button', { name: 'ویرایش نوشته' }, { timeout: 3000 }))
    expect(screen.getByLabelText('روی چه چیزی می‌خواهید پیش بروید؟')).toHaveValue(intention)
  })

  it('resumes a running attempt by id and shows a cancellation as cancelled, not as a failure', async () => {
    vi.mocked(getPlanningActive).mockResolvedValue({ attempt: attempt('RUNNING'), draft: null, sampleGenerator: true })
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('RUNNING'))
    vi.mocked(cancelPlanningAttempt).mockResolvedValue(attempt('CANCELLED'))
    renderPage()
    expect(await screen.findByText('در حال ساخت پیش‌نویس…')).toBeInTheDocument()
    expect(startPlanningAttempt).not.toHaveBeenCalled()

    fireEvent.click(await screen.findByRole('button', { name: 'لغو' }))
    await waitFor(() => expect(cancelPlanningAttempt).toHaveBeenCalledWith(attemptId))
    expect(await screen.findByText('برنامه‌ریزی لغو شد.')).toBeInTheDocument()
    expect(screen.getByText('چیزی ساخته نشد.')).toBeInTheDocument()
    expect(screen.queryByText('ساخت پیش‌نویس انجام نشد')).not.toBeInTheDocument()
  })

  it('stores an edit as a new revision and shows the server result, including an excluded subtree', async () => {
    await openDraft(draft())
    vi.mocked(revisePlanningDraft).mockResolvedValueOnce(draft({
      revision: 2,
      proposals: [
        view({ ...goal, included: false }, { state: 'EXCLUDED' }),
        view(step, { state: 'EXCLUDED', excludedByAncestor: true }),
      ],
      firstWeek: [], canApply: true,
    }))

    fireEvent.click(screen.getByRole('checkbox', { name: `در برنامه باشد: ${goal.title}` }))
    await waitFor(() => expect(revisePlanningDraft).toHaveBeenCalledTimes(1))
    const [id, expectedRevision, edit] = vi.mocked(revisePlanningDraft).mock.calls[0]
    expect([id, expectedRevision]).toEqual([draftId, 1])
    // The whole edited list is sent; the child is not rewritten by the client.
    expect(edit.proposals.map(item => [item.draftId, item.included])).toEqual([['goal', false], ['step-1', true]])
    expect(edit.facts).toHaveLength(1)

    expect(await screen.findByText('چون مورد بالاتر کنار گذاشته شده، این مورد هم ساخته نمی‌شود.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: `در برنامه باشد: ${step.title}` })).toBeChecked()

    // A stale edit is reported; the stored draft is not overwritten locally.
    vi.mocked(revisePlanningDraft).mockRejectedValueOnce(apiError(409, 'CONFLICT_STALE_VERSION'))
    const remembered = screen.getByRole('button', { name: /^یادم بماند: روزهای غیرقابل‌استفاده هفته: جمعه/ })
    expect(remembered).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(remembered)
    expect(await screen.findByText(/در جای دیگری تغییر کرده است/)).toBeInTheDocument()
    expect(vi.mocked(revisePlanningDraft).mock.calls[1][1]).toBe(2)
  })

  it('says why the week is detailed, marks estimates, names what was left out and removes a sequence as one', async () => {
    const dated = { ...goal, targetDate: '2027-03-21' }
    const second = proposal('step-2', 'TASK', 'انجام اولین قدم', { parentDraftId: 'goal', plannedDate: '2026-10-04', sequenceKey: 's1', sequenceOrder: 2 })
    const first = { ...step, sequenceKey: 's1', sequenceOrder: 1 }
    await openDraft(draft({
      proposals: [view(dated, { issues: [{ code: 'ASSUMED_DATES', severity: 'INFO', origin: 'GENERATOR' }] }), view(first), view(second)],
      removedItems: [{ entityType: 'TASK', title: 'هماهنگی انتقال گاز' }, { entityType: 'FACT', title: null }],
    }))

    expect(screen.getByText(/هفته‌ی بعد را با توجه به اینکه این هفته چطور پیش رفت می‌سازیم/)).toBeInTheDocument()
    expect(screen.getByText(/\(تخمینی\)/)).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('نتوانستیم درست بچینیم و کنار گذاشتیم: «هماهنگی انتقال گاز»، یک جزئیات برنامه')
    expect(screen.getByText(/قدم ۲ از ۲، بعد از «روشن‌کردن اولین قدم»/)).toBeInTheDocument()

    vi.mocked(revisePlanningDraft).mockResolvedValueOnce(draft({ revision: 2 }))
    fireEvent.click(screen.getByRole('button', { name: 'برداشتن ترتیب: روشن‌کردن اولین قدم، انجام اولین قدم' }))
    await waitFor(() => expect(revisePlanningDraft).toHaveBeenCalledTimes(1))
    // Every Task of the chain loses its order together; nothing else changes.
    const sent = vi.mocked(revisePlanningDraft).mock.calls[0][2].proposals
    expect(sent.map(item => [item.draftId, item.sequenceKey ?? null, item.sequenceOrder ?? null])).toEqual([
      ['goal', null, null], ['step-1', null, null], ['step-2', null, null],
    ])
    expect(sent.map(item => item.plannedDate)).toEqual([null, '2026-10-03', '2026-10-04'])
  })

  it('edits a proposal through the sheet without creating anything', async () => {
    await openDraft(draft())
    vi.mocked(revisePlanningDraft).mockResolvedValue(draft({ revision: 2 }))
    fireEvent.click(screen.getByRole('button', { name: `ویرایش: ${step.title}` }))
    const sheet = within(screen.getByRole('dialog', { name: 'ویرایش کار پیشنهادی' }))
    fireEvent.change(sheet.getByLabelText('عنوان'), { target: { value: 'قدم تازه' } })
    // Detaching from the parent is an explicit ownership edit.
    fireEvent.click(sheet.getByLabelText('جایگاه'))
    fireEvent.click(sheet.getByRole('option', { name: 'مستقل' }))
    fireEvent.click(sheet.getByRole('button', { name: 'ذخیره در پیش‌نویس' }))

    await waitFor(() => expect(revisePlanningDraft).toHaveBeenCalledTimes(1))
    const edited = vi.mocked(revisePlanningDraft).mock.calls[0][2].proposals.find(item => item.draftId === 'step-1')
    expect(edited).toMatchObject({ title: 'قدم تازه', parentDraftId: null, underContext: false, plannedDate: '2026-10-03', entityType: 'TASK' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('creates the plan only after the server preview is acknowledged and its command answers', async () => {
    const warning = {
      warningId: 'DESCENDANTS_EXCLUDED_WITH_PARENT', code: 'DESCENDANTS_EXCLUDED_WITH_PARENT',
      affectedDraftIds: ['step-1'], warningHash: 'B'.repeat(64),
    }
    await openDraft(draft())
    // Every preview the server builds is a new confirmation with its own identity.
    vi.mocked(createPlanningPreview)
      .mockResolvedValueOnce(confirmation({ warnings: [warning] }))
      .mockResolvedValueOnce(confirmation({ id: '00000000-0000-0000-0000-000000000c02', warnings: [warning] }))
    vi.mocked(submitPlanningConfirmation)
      .mockRejectedValueOnce(apiError(409, 'CONFIRMATION_STALE'))
      .mockResolvedValueOnce(result)

    fireEvent.click(screen.getByRole('button', { name: 'مرور نهایی و تأیید' }))
    await waitFor(() => expect(createPlanningPreview).toHaveBeenCalledWith(draftId, 1))
    const dialog = within(await screen.findByRole('dialog', { name: 'مرور نهایی و تأیید' }))
    expect(await dialog.findByText(goal.title)).toBeInTheDocument()
    expect(submitPlanningConfirmation).not.toHaveBeenCalled()

    // The four steps end here, and the button names how much is made.
    expect(dialog.getByText('۴ از ۴')).toBeInTheDocument()
    const submit = dialog.getByRole('button', { name: 'تأیید و ساخت ۲ مورد' })
    expect(submit).toBeDisabled()
    fireEvent.click(dialog.getByRole('checkbox'))
    expect(submit).toBeEnabled()
    fireEvent.click(submit)
    await waitFor(() => expect(submitPlanningConfirmation).toHaveBeenCalledWith(confirmationId, [warning]))

    // Stale: nothing was created, and the only way forward is a fresh preview and a fresh acknowledgement.
    expect(await dialog.findByText(/هیچ موردی ساخته نشد/)).toBeInTheDocument()
    expect(screen.queryByText('برنامه ساخته شد.')).not.toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: /^تأیید و ساخت/ })).not.toBeInTheDocument()
    fireEvent.click(dialog.getByRole('button', { name: 'پیش‌نمایش تازه' }))
    await waitFor(() => expect(createPlanningPreview).toHaveBeenCalledTimes(2))
    const fresh = await screen.findByRole('button', { name: /^تأیید و ساخت/ })
    expect(fresh).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /زیر یک مورد کنارگذاشته‌شده/ }))
    fireEvent.click(fresh)

    expect(await screen.findByText('برنامه ساخته شد.')).toBeInTheDocument()
    expect(screen.getByText(/یک هدف، ۱ کار ساخته شد/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reads the confirmation instead of submitting twice when a submission gets no answer', async () => {
    await openDraft(draft())
    vi.mocked(createPlanningPreview).mockResolvedValue(confirmation())
    vi.mocked(submitPlanningConfirmation).mockRejectedValue(new AxiosError('Network Error'))
    vi.mocked(getPlanningConfirmation).mockResolvedValue(confirmation({ status: 'RESOLVED', result }))

    fireEvent.click(screen.getByRole('button', { name: 'مرور نهایی و تأیید' }))
    fireEvent.click(await screen.findByRole('button', { name: /^تأیید و ساخت/ }))
    await waitFor(() => expect(getPlanningConfirmation).toHaveBeenCalledWith(confirmationId))
    expect(await screen.findByText('برنامه ساخته شد.')).toBeInTheDocument()
    expect(submitPlanningConfirmation).toHaveBeenCalledTimes(1)

    // The optional question is about this plan, is answered once and never blocks the way on.
    vi.mocked(submitPilotFeedback).mockResolvedValue()
    const question = within(screen.getByRole('group', { name: 'این برنامه چقدر برای شروع کار به دردتان می‌خورد؟' }))
    expect(screen.getByText('رفتن به امروز')).toBeInTheDocument()
    fireEvent.click(question.getByRole('button', { name: '۴ از ۵' }))
    await waitFor(() => expect(submitPilotFeedback).toHaveBeenCalledWith({ instrument: 'H1_USEFULNESS', subjectId: draftId, answer: 4 }))
    expect(await screen.findByText('ممنون؛ پاسخ شما ثبت شد.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '۴ از ۵' })).not.toBeInTheDocument()
  })

  it('shows the questions, sends the answers as a continuation of the same flow and then shows the draft', async () => {
    const nextAttemptId = '00000000-0000-0000-0000-000000000a02'
    const asking = attempt('SUCCEEDED', {
      draftId: null, outcome: 'CLARIFICATION',
      clarification: {
        questions: [
          { id: 'q1', text: 'روی کدام بخش کار کنیم؟', reason: 'تا تمرین‌ها همان‌جا بنشینند.', kind: 'CONTENT', options: ['مکالمه', 'نوشتن'], multiple: true },
          { id: 'q2', text: 'تاریخ مشخصی در نظر دارید؟', reason: null, kind: 'TIMING', options: ['تا یک ماه', 'تا سه ماه'], multiple: false },
          { id: 'q3', text: 'کدام روزها وقت دارید؟', reason: null, kind: 'RECURRENCE', options: [], multiple: false },
        ],
        blockReason: null, message: null, turn: 1,
      },
    })
    vi.mocked(startPlanningAttempt).mockResolvedValueOnce(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockImplementation(async id =>
      id === nextAttemptId ? attempt('SUCCEEDED', { id: nextAttemptId, outcome: 'DRAFT' }) : asking)
    vi.mocked(getPlanningDraft).mockResolvedValue(draft({ attemptId: nextAttemptId }))
    renderPage()
    fireEvent.change(await screen.findByLabelText('روی چه چیزی می‌خواهید پیش بروید؟'), { target: { value: intention } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))

    // Questions are not a draft: nothing reviewable is shown and nothing can be approved.
    expect(await screen.findByRole('heading', { name: 'سه پرسش کوتاه' }, { timeout: 3000 })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'مراحل برنامه‌ریزی' })).getByRole('listitem', { current: 'step' })).toHaveTextContent('پرسش‌ها')
    expect(useUiStore.getState().focused).toBe(true)
    expect(screen.getByText('تا تمرین‌ها همان‌جا بنشینند.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('۰ از ۳ پاسخ')
    expect(screen.queryByRole('heading', { name: 'ساختار پیشنهادی' })).not.toBeInTheDocument()
    expect(getPlanningDraft).not.toHaveBeenCalled()

    // Both options on the first question, and a word of one's own beside them with «خودت بنویس».
    const parts = within(screen.getByRole('group', { name: 'روی کدام بخش کار کنیم؟' }))
    expect(parts.getAllByRole('button')).toHaveLength(3)
    fireEvent.click(parts.getByRole('button', { name: 'مکالمه' }))
    fireEvent.click(parts.getByRole('button', { name: 'نوشتن' }))
    fireEvent.click(parts.getByRole('button', { name: 'خودت بنویس' }))
    fireEvent.change(screen.getByLabelText('پاسخ خودتان: روی کدام بخش کار کنیم؟'), { target: { value: '  عصرها  ' } })
    // A question without options opens its field at once, without taking the focus (029 §7).
    const own = screen.getByLabelText('پاسخ خودتان: کدام روزها وقت دارید؟')
    expect(own).not.toHaveFocus()
    expect(screen.queryByRole('group', { name: 'کدام روزها وقت دارید؟' })).not.toBeInTheDocument()
    fireEvent.change(own, { target: { value: ' شنبه و دوشنبه ' } })
    // One choice only on the second: choosing again replaces it.
    const when = within(screen.getByRole('group', { name: 'تاریخ مشخصی در نظر دارید؟' }))
    fireEvent.click(when.getByRole('button', { name: 'تا یک ماه' }))
    fireEvent.click(when.getByRole('button', { name: 'تا سه ماه' }))
    expect(when.getByRole('button', { name: 'تا یک ماه' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('status')).toHaveTextContent('۳ از ۳ پاسخ')

    vi.mocked(startPlanningAttempt).mockResolvedValueOnce(attempt('QUEUED', { id: nextAttemptId }))
    fireEvent.click(screen.getByRole('button', { name: 'پیش‌نویس را بساز' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(2))
    const [first, second] = vi.mocked(startPlanningAttempt).mock.calls
    // Options go by position (the server turns them into labels), under a new attempt identity that points at the questions.
    expect(second[1]).toEqual({
      intention, goalId: undefined, projectId: undefined, replaceActive: false, previousAttemptId: attemptId,
      answers: [
        { questionId: 'q1', options: [0, 1], text: 'عصرها' },
        { questionId: 'q2', options: [1], text: null },
        { questionId: 'q3', options: [], text: 'شنبه و دوشنبه' },
      ],
      draftNow: false,
    })
    expect(second[0]).not.toBe(first[0])
    expect(await screen.findByRole('heading', { name: 'ساختار پیشنهادی' }, { timeout: 3000 })).toBeInTheDocument()
  })

  it('resumes unanswered questions and lets the user ask for a draft now, edit the text or go manual', async () => {
    const asking = attempt('SUCCEEDED', {
      draftId: null, outcome: 'CLARIFICATION',
      clarification: {
        questions: [{ id: 'q1', text: 'از کجا شروع می‌کنید؟', kind: 'CONTENT', options: [], multiple: false }], blockReason: null,
        message: 'برنامه درمانی نمی‌سازم، اما می‌توانم کارهای خودتان را مرتب کنم.', turn: 2,
      },
    })
    vi.mocked(getPlanningActive).mockResolvedValue({ attempt: null, draft: null, clarification: asking, sampleGenerator: false })
    vi.mocked(getPlanningAttempt).mockResolvedValue(asking)
    vi.mocked(startPlanningAttempt).mockResolvedValue(attempt('QUEUED', { id: '00000000-0000-0000-0000-000000000a03' }))
    const page = renderPage()

    expect(await screen.findByRole('heading', { name: 'یک پرسش کوتاه' })).toBeInTheDocument()
    expect(screen.getByText(/برنامه درمانی نمی‌سازم/)).toBeInTheDocument()
    expect(screen.getByText(/این دور ۲ از حداکثر ۳ است/)).toBeInTheDocument()
    expect(startPlanningAttempt).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'خودم دستی می‌سازم' }))
    expect(useUiStore.getState().createTarget).toBe('menu')

    // Building with nothing answered is «بدون پاسخ بساز».
    fireEvent.click(screen.getByRole('button', { name: 'پیش‌نویس را بساز' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(1))
    expect(vi.mocked(startPlanningAttempt).mock.calls[0][1]).toMatchObject({
      previousAttemptId: attemptId, answers: [], draftNow: true, intention,
    })
    page.unmount()

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'بدون پاسخ بساز' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(2))
    expect(vi.mocked(startPlanningAttempt).mock.calls[1][1]).toMatchObject({ answers: [], draftNow: true })
    fireEvent.click(await screen.findByRole('button', { name: 'ویرایش نوشته' }))
    expect(screen.getByLabelText('روی چه چیزی می‌خواهید پیش بروید؟')).toHaveValue(intention)
  })

  it('explains a blocked input and an unavailable or rate-limited assistant without losing the text', async () => {
    vi.mocked(startPlanningAttempt).mockResolvedValueOnce(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('SUCCEEDED', {
      draftId: null, outcome: 'INPUT_BLOCKED',
      clarification: { questions: [], blockReason: 'TOO_VAGUE', message: 'بنویسید دقیقاً روی چه چیزی کار می‌کنید.', turn: 1 },
    }))
    renderPage()
    fireEvent.change(await screen.findByLabelText('روی چه چیزی می‌خواهید پیش بروید؟'), { target: { value: intention } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))

    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('برای این نوشته نمی‌توان پیش‌نویس ساخت')
    expect(screen.getByText(/بیش از حد کلی است/)).toBeInTheDocument()
    expect(screen.getByText('بنویسید دقیقاً روی چه چیزی کار می‌کنید.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تلاش دوباره' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ویرایش نوشته' }))
    const input = screen.getByLabelText('روی چه چیزی می‌خواهید پیش بروید؟')
    expect(input).toHaveValue(intention)

    // The assistant is switched off: said plainly, nothing changed, manual creation still works.
    vi.mocked(startPlanningAttempt).mockRejectedValueOnce(apiError(503, 'PLANNING_AI_UNAVAILABLE'))
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))
    expect(await screen.findByText(/دستیار برنامه‌ریزی فعلاً در دسترس نیست/)).toBeInTheDocument()
    expect(screen.getByLabelText('روی چه چیزی می‌خواهید پیش بروید؟')).toHaveValue(intention)
    fireEvent.click(screen.getByRole('button', { name: 'یا خودم دستی می‌سازم' }))
    expect(useUiStore.getState().createTarget).toBe('menu')

    vi.mocked(startPlanningAttempt).mockRejectedValueOnce(apiError(429, 'AI_RATE_LIMITED'))
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))
    expect(await screen.findByText(/از حد مجاز گذشته است/)).toBeInTheDocument()
  })

  it('shows an expired draft and an unavailable service as explicit states with a way forward', async () => {
    vi.mocked(getPlanningActive).mockResolvedValue({ attempt: attempt('RUNNING'), draft: null, sampleGenerator: true })
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('SUCCEEDED'))
    vi.mocked(getPlanningDraft).mockResolvedValue(draft({ status: 'EXPIRED', canApply: false }))
    const page = renderPage()
    expect(await screen.findByText('این پیش‌نویس دیگر قابل مرور نیست.')).toBeInTheDocument()
    expect(screen.getByText(/مهلت مرور آن تمام شده است/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'شروع دوباره' }))
    expect(await screen.findByLabelText('روی چه چیزی می‌خواهید پیش بروید؟')).toBeInTheDocument()
    page.unmount()

    vi.mocked(getPlanningActive).mockRejectedValue(apiError(500, 'UNEXPECTED_ERROR'))
    renderPage()
    expect(await screen.findByText('برنامه‌ریزی در دسترس نیست.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ساخت دستی' }))
    expect(useUiStore.getState().createTarget).toBe('menu')
  })
})
