import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../../../shared/lib/ui-store'
import {
  cancelPlanningAttempt,
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
  firstWeek: [{ draftId: 'step-1', date: '2026-10-03' }], canApply: true, linkedConfirmationId: null, ...overrides,
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
    useUiStore.setState({ toasts: [], createTarget: null })
    vi.mocked(getPlanningActive).mockResolvedValue({ attempt: null, draft: null, sampleGenerator: true })
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

    const input = await screen.findByLabelText('می‌خواهید روی چه چیزی پیش بروید؟')
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
    expect(await screen.findByText('پیش‌نویس تأییدنشده', {}, { timeout: 3000 })).toBeInTheDocument()
    // Reconnecting or polling never starts another generation.
    expect(startPlanningAttempt).toHaveBeenCalledTimes(1)

    const goalCard = screen.getByRole('article', { name: goal.title })
    expect(within(goalCard).getByText('مستقل')).toBeInTheDocument()
    expect(within(goalCard).getByText(/\(پیش‌فرض\)/)).toBeInTheDocument()
    const stepCard = screen.getByRole('article', { name: step.title })
    expect(within(stepCard).getByText(`زیر «${goal.title}»`)).toBeInTheDocument()
    expect(within(stepCard).getByText(/فرض: تاریخ‌ها پیشنهادی‌اند/)).toBeInTheDocument()
    // The child is nested under its parent, not flattened beside it.
    expect(goalCard.closest('li')).toContainElement(stepCard)

    const blocked = within(screen.getByRole('article', { name: far.title }))
    expect(blocked.getByText('نیازمند اصلاح')).toBeInTheDocument()
    expect(blocked.getByText(/تاریخ بیرون از هفت روز پیش رو است/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'مرور نهایی و تأیید' })).toBeDisabled()
    expect(screen.getByText(/دست‌کم یک مورد را در برنامه نگه دارید/)).toBeInTheDocument()
  })

  it('never replaces an unapproved draft silently', async () => {
    const existing = draft({ linkedConfirmationId: confirmationId })
    const page = await openDraft(existing)
    expect(getPlanningDraft).toHaveBeenCalledWith(draftId)
    // A linked confirmation is not success: the draft is still only reviewable.
    expect(screen.queryByText('برنامه ساخته شد.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'مرور نهایی و تأیید' })).toBeEnabled()
    page.unmount()

    vi.mocked(startPlanningAttempt).mockResolvedValue(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('QUEUED'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'شروع تازه و کنار گذاشتن قبلی' }))
    expect(screen.getByText('با ساخت پیش‌نویس تازه، پیش‌نویس قبلی کنار گذاشته می‌شود.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('می‌خواهید روی چه چیزی پیش بروید؟'), { target: { value: intention } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(1))
    expect(vi.mocked(startPlanningAttempt).mock.calls[0][1]).toMatchObject({ replaceActive: true })
  })

  it('keeps the input after a failed attempt and offers retry, edit and the manual path', async () => {
    vi.mocked(startPlanningAttempt).mockResolvedValue(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('FAILED', { failureCode: 'DRAFT_INVALID' }))
    renderPage()
    fireEvent.change(await screen.findByLabelText('می‌خواهید روی چه چیزی پیش بروید؟'), { target: { value: intention } })
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
    expect(screen.getByLabelText('می‌خواهید روی چه چیزی پیش بروید؟')).toHaveValue(intention)
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

    const child = within(await screen.findByRole('article', { name: step.title }))
    expect(await child.findByText('چون مورد بالاتر کنار گذاشته شده، این مورد هم ساخته نمی‌شود.')).toBeInTheDocument()
    expect(child.getByRole('checkbox')).toBeChecked()

    // A stale edit is reported; the stored draft is not overwritten locally.
    vi.mocked(revisePlanningDraft).mockRejectedValueOnce(apiError(409, 'CONFLICT_STALE_VERSION'))
    fireEvent.click(screen.getByRole('checkbox', { name: /^روزهای غیرقابل‌استفاده هفته: جمعه/ }))
    expect(await screen.findByText(/در جای دیگری تغییر کرده است/)).toBeInTheDocument()
    expect(vi.mocked(revisePlanningDraft).mock.calls[1][1]).toBe(2)
  })

  it('edits a proposal through the sheet without creating anything', async () => {
    await openDraft(draft())
    vi.mocked(revisePlanningDraft).mockResolvedValue(draft({ revision: 2 }))
    fireEvent.click(screen.getByRole('button', { name: `ویرایش: ${step.title}` }))
    const sheet = within(screen.getByRole('dialog', { name: 'ویرایش کار پیشنهادی' }))
    fireEvent.change(sheet.getByLabelText('عنوان'), { target: { value: 'قدم تازه' } })
    // Detaching from the parent is an explicit ownership edit.
    fireEvent.change(sheet.getByLabelText('جایگاه'), { target: { value: 'none' } })
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

    const submit = dialog.getByRole('button', { name: 'تأیید و ساخت' })
    expect(submit).toBeDisabled()
    fireEvent.click(dialog.getByRole('checkbox'))
    expect(submit).toBeEnabled()
    fireEvent.click(submit)
    await waitFor(() => expect(submitPlanningConfirmation).toHaveBeenCalledWith(confirmationId, [warning]))

    // Stale: nothing was created, and the only way forward is a fresh preview and a fresh acknowledgement.
    expect(await dialog.findByText(/هیچ موردی ساخته نشد/)).toBeInTheDocument()
    expect(screen.queryByText('برنامه ساخته شد.')).not.toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: 'تأیید و ساخت' })).not.toBeInTheDocument()
    fireEvent.click(dialog.getByRole('button', { name: 'پیش‌نمایش تازه' }))
    await waitFor(() => expect(createPlanningPreview).toHaveBeenCalledTimes(2))
    const fresh = await screen.findByRole('button', { name: 'تأیید و ساخت' })
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
    fireEvent.click(await screen.findByRole('button', { name: 'تأیید و ساخت' }))
    await waitFor(() => expect(getPlanningConfirmation).toHaveBeenCalledWith(confirmationId))
    expect(await screen.findByText('برنامه ساخته شد.')).toBeInTheDocument()
    expect(submitPlanningConfirmation).toHaveBeenCalledTimes(1)
  })

  it('shows the questions, sends the answers as a continuation of the same flow and then shows the draft', async () => {
    const nextAttemptId = '00000000-0000-0000-0000-000000000a02'
    const asking = attempt('SUCCEEDED', {
      draftId: null, outcome: 'CLARIFICATION',
      clarification: {
        questions: [{ id: 'q1', text: 'هر هفته چند روز وقت دارید؟' }, { id: 'q2', text: 'تاریخ مشخصی در نظر دارید؟' }],
        blockReason: null, message: null, turn: 1,
      },
    })
    vi.mocked(startPlanningAttempt).mockResolvedValueOnce(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockImplementation(async id =>
      id === nextAttemptId ? attempt('SUCCEEDED', { id: nextAttemptId, outcome: 'DRAFT' }) : asking)
    vi.mocked(getPlanningDraft).mockResolvedValue(draft({ attemptId: nextAttemptId }))
    renderPage()
    fireEvent.change(await screen.findByLabelText('می‌خواهید روی چه چیزی پیش بروید؟'), { target: { value: intention } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))

    // Questions are not a draft: nothing reviewable is shown and nothing can be approved.
    expect(await screen.findByRole('heading', { name: 'چند پرسش پیش از ساخت پیش‌نویس' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText(/گام ۱ از حداکثر ۳/)).toBeInTheDocument()
    expect(screen.getByText(intention)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'ساختار پیشنهادی' })).not.toBeInTheDocument()
    expect(getPlanningDraft).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'ادامه' }))
    expect(await screen.findByText(/دست‌کم به یکی از پرسش‌ها پاسخ دهید/)).toBeInTheDocument()
    expect(startPlanningAttempt).toHaveBeenCalledTimes(1)

    vi.mocked(startPlanningAttempt).mockResolvedValueOnce(attempt('QUEUED', { id: nextAttemptId }))
    fireEvent.change(screen.getByLabelText('هر هفته چند روز وقت دارید؟'), { target: { value: '  سه روز  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'ادامه' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(2))
    const [first, second] = vi.mocked(startPlanningAttempt).mock.calls
    // Only the answered question is sent, under a new attempt identity that points at the questions.
    expect(second[1]).toEqual({
      intention, goalId: undefined, projectId: undefined, replaceActive: false, previousAttemptId: attemptId,
      answers: [{ questionId: 'q1', text: 'سه روز' }], draftNow: false,
    })
    expect(second[0]).not.toBe(first[0])
    expect(await screen.findByRole('heading', { name: 'ساختار پیشنهادی' }, { timeout: 3000 })).toBeInTheDocument()
  })

  it('resumes unanswered questions and lets the user ask for a draft now, edit the text or go manual', async () => {
    const asking = attempt('SUCCEEDED', {
      draftId: null, outcome: 'CLARIFICATION',
      clarification: {
        questions: [{ id: 'q1', text: 'هر هفته چند روز وقت دارید؟' }], blockReason: null,
        message: 'برنامه درمانی نمی‌سازم، اما می‌توانم کارهای خودتان را مرتب کنم.', turn: 2,
      },
    })
    vi.mocked(getPlanningActive).mockResolvedValue({ attempt: null, draft: null, clarification: asking, sampleGenerator: false })
    vi.mocked(getPlanningAttempt).mockResolvedValue(asking)
    vi.mocked(startPlanningAttempt).mockResolvedValue(attempt('QUEUED', { id: '00000000-0000-0000-0000-000000000a03' }))
    const page = renderPage()

    expect(await screen.findByLabelText('هر هفته چند روز وقت دارید؟')).toBeInTheDocument()
    expect(screen.getByText(/برنامه درمانی نمی‌سازم/)).toBeInTheDocument()
    expect(screen.getByText(/گام ۲ از حداکثر ۳/)).toBeInTheDocument()
    expect(startPlanningAttempt).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'خودم دستی می‌سازم' }))
    expect(useUiStore.getState().createTarget).toBe('menu')

    fireEvent.click(screen.getByRole('button', { name: 'همین حالا پیش‌نویس بساز' }))
    await waitFor(() => expect(startPlanningAttempt).toHaveBeenCalledTimes(1))
    expect(vi.mocked(startPlanningAttempt).mock.calls[0][1]).toMatchObject({
      previousAttemptId: attemptId, answers: [], draftNow: true, intention,
    })
    page.unmount()

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'ویرایش نوشته' }))
    expect(screen.getByLabelText('می‌خواهید روی چه چیزی پیش بروید؟')).toHaveValue(intention)
  })

  it('explains a blocked input and an unavailable or rate-limited assistant without losing the text', async () => {
    vi.mocked(startPlanningAttempt).mockResolvedValueOnce(attempt('QUEUED'))
    vi.mocked(getPlanningAttempt).mockResolvedValue(attempt('SUCCEEDED', {
      draftId: null, outcome: 'INPUT_BLOCKED',
      clarification: { questions: [], blockReason: 'TOO_VAGUE', message: 'بنویسید دقیقاً روی چه چیزی کار می‌کنید.', turn: 1 },
    }))
    renderPage()
    fireEvent.change(await screen.findByLabelText('می‌خواهید روی چه چیزی پیش بروید؟'), { target: { value: intention } })
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))

    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('برای این نوشته نمی‌توان پیش‌نویس ساخت')
    expect(screen.getByText(/بیش از حد کلی است/)).toBeInTheDocument()
    expect(screen.getByText('بنویسید دقیقاً روی چه چیزی کار می‌کنید.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تلاش دوباره' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ویرایش نوشته' }))
    const input = screen.getByLabelText('می‌خواهید روی چه چیزی پیش بروید؟')
    expect(input).toHaveValue(intention)

    // The assistant is switched off: said plainly, nothing changed, manual creation still works.
    vi.mocked(startPlanningAttempt).mockRejectedValueOnce(apiError(503, 'PLANNING_AI_UNAVAILABLE'))
    fireEvent.click(screen.getByRole('button', { name: 'ساخت پیش‌نویس' }))
    expect(await screen.findByText(/دستیار برنامه‌ریزی فعلاً در دسترس نیست/)).toBeInTheDocument()
    expect(screen.getByLabelText('می‌خواهید روی چه چیزی پیش بروید؟')).toHaveValue(intention)
    fireEvent.click(screen.getByRole('button', { name: 'خودم دستی می‌سازم' }))
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
    expect(await screen.findByLabelText('می‌خواهید روی چه چیزی پیش بروید؟')).toBeInTheDocument()
    page.unmount()

    vi.mocked(getPlanningActive).mockRejectedValue(apiError(500, 'UNEXPECTED_ERROR'))
    renderPage()
    expect(await screen.findByText('برنامه‌ریزی در دسترس نیست.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ساخت دستی' }))
    expect(useUiStore.getState().createTarget).toBe('menu')
  })
})
