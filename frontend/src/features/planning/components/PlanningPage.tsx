import { Link } from '@tanstack/react-router'
import { ArrowRight, CircleCheck, CircleSlash, FileClock, Sparkles, X } from '../../../shared/ui/icons'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatNumber } from '../../../shared/lib/date'
import { useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { Stepper } from '../../../shared/ui/Stepper'
import { AiFeedbackCard } from '../../feedback/components/AiFeedbackCard'
import { PilotQuestion } from '../../pilot/components/PilotQuestion'
import {
  useCancelPlanningAttempt,
  useCancelPlanningDraft,
  usePlanningActive,
  usePlanningApply,
  usePlanningAttempt,
  usePlanningDraft,
  useRevisePlanningDraft,
  useStartPlanningAttempt,
} from '../hooks/planning-hooks'
import { blockReasonLabels, failureLabels } from '../types/planning.format'
import { planningPhase } from '../types/planning.phase'
import type { PlanningAnswer, PlanningApplyResultDto, PlanningAttemptDto, PlanningAttemptInput, PlanningScopeInput } from '../types/planning.types'
import { PlanningApplyDialog } from './PlanningApplyDialog'
import { PlanningClarification } from './PlanningClarification'
import { PlanningDraftReview } from './PlanningDraftReview'
import { PlanningIntentForm } from './PlanningIntentForm'
import { RememberedFactsCard } from './PlanningFactsSection'
import { PlanningStartError } from './PlanningStartError'
import { PlanningDesk, PlanningRoad, WhyWeAsk, WritingHints, WrittenText } from './PlanningDesk'
import { useIsDesktop } from '../../../shared/lib/use-desktop'
import { useToday } from '../../today/hooks/today-hooks'
import { toIsoDate } from '../../../shared/lib/date'

const pageTitle = 'برنامه‌ریزی'
/** Every planning entry walks the same four steps (028 §3); a step the model skipped still shows as passed. */
const steps = ['نوشتن', 'پرسش‌ها', 'مرور', 'تأیید'] as const

/**
 * Planning page: one intention in, one reviewable draft out, and nothing
 * created until the user confirms the server's preview. Manual creation stays
 * available at every step, and every failure leaves the user's input intact.
 */
export function PlanningPage({ goalId, projectId, continuationOf, initialIntention = '' }: PlanningScopeInput & {
  /** Text written before arriving here (First Entry); it only prefills the form. */
  initialIntention?: string
  /** «برنامهٔ هفتهٔ بعد»: the planned week whose next week this page plans at once (029 §3). */
  continuationOf?: string
}) {
  const active = usePlanningActive()
  const start = useStartPlanningAttempt()
  const cancelAttempt = useCancelPlanningAttempt()
  const cancelDraft = useCancelPlanningDraft()
  const revise = useRevisePlanningDraft()
  const openCreate = useUiStore(state => state.openCreate)
  const setFocused = useUiStore(state => state.setFocused)
  // What the plan is about: the Goal or Project it was opened from, or the one chosen while writing.
  const [scope, setScope] = useState<PlanningScopeInput>(goalId ? { goalId } : projectId ? { projectId } : {})
  const desktop = useIsDesktop()
  const today = useToday().data?.localDate ?? toIsoDate(new Date())

  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  // Once the user has chosen what to do, the page stops following the flow it found on arrival.
  const [detached, setDetached] = useState(false)
  const [replace, setReplace] = useState(false)
  // The draft a rewrite from the review will replace, so it can be asked about once it has ended.
  const [replacing, setReplacing] = useState<string | null>(null)
  const [intention, setIntention] = useState(initialIntention)
  // A draft the user ended without applying it: cancelled, or replaced by a new flow. It may be
  // asked about (an applied draft gets the pilot question instead), until the page is left.
  const [endedDraftId, setEndedDraftId] = useState<string | null>(null)
  // The attempt being made answers questions, so the «پرسش‌ها» step is behind it.
  const [answered, setAnswered] = useState(false)
  // The last «اصلاح» or «نسخهٔ دیگر» asked for, so a failed one can be sent again as it was.
  const [lastRedo, setLastRedo] = useState<NonNullable<PlanningAttemptInput['redo']> | null>(null)

  const found = detached ? undefined : active.data
  // Unanswered questions are resumed like a running attempt: by the id of the attempt that asked them.
  const currentAttemptId = attemptId ?? found?.attempt?.id ?? found?.clarification?.id ?? null
  const attempt = usePlanningAttempt(currentAttemptId)
  const currentDraftId = draftId ?? (attempt.data?.status === 'SUCCEEDED' ? attempt.data.draftId : null)
  const draft = usePlanningDraft(currentDraftId)
  // A draft resumed by its id: the attempt that made it says what was written.
  const origin = usePlanningAttempt(currentAttemptId === null ? draft.data?.attemptId ?? null : null)
  const apply = usePlanningApply(currentDraftId)

  const manual = () => openCreate('menu')
  const restart = () => {
    setAnswered(false)
    setAttemptId(null)
    setDraftId(null)
    setDetached(true)
    setReplace(false)
    start.reset()
    revise.reset()
    cancelDraft.reset()
    apply.cancel()
    apply.clearResult()
  }
  /** Starts an attempt: for the intention written, or for the next week of a planned one (`continuationOfWindowId`). */
  const begin = (text: string, continuationOfWindowId?: string) => {
    setIntention(text)
    const replaced = replace ? replacing ?? active.data?.draft?.id ?? null : null
    start.mutate(continuationOfWindowId
      ? { intention: text, replaceActive: replace, continuationOfWindowId }
      : { intention: text, goalId: scope.goalId, projectId: scope.projectId, replaceActive: replace }, {
      onSuccess: data => {
        if (replaced) setEndedDraftId(replaced)
        setAttemptId(data.id)
        setDraftId(null)
        setDetached(true)
        setReplace(false)
        setReplacing(null)
      },
      onError: error => {
        // An unfinished flow appeared in the meantime (for example in another tab): ask, never replace silently.
        if (toApiError(error).code !== 'PLANNING_DRAFT_ACTIVE') return
        setAttemptId(null)
        setDraftId(null)
        setDetached(false)
        void active.refetch()
      },
    })
  }

  // «برنامهٔ هفتهٔ بعد» is the one tap (029 §3): the next week is asked for once on arrival, unless the
  // unfinished flow already plans that week, which is then resumed instead.
  const continued = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: begin is the page's own starter; this runs once per arrival.
  useEffect(() => {
    if (!continuationOf || continued.current || active.isPending) return
    continued.current = true
    const flow = active.data
    if ([flow?.attempt, flow?.clarification].some(x => x?.continuationOfWindowId === continuationOf) ||
        flow?.draft?.continuationOfWindowId === continuationOf) return
    begin('برنامهٔ هفتهٔ بعد', continuationOf)
  }, [continuationOf, active.isPending])

  /** Answers the questions of an attempt, or asks for a draft without answering them. */
  const answer = (asked: PlanningAttemptDto, answers: PlanningAnswer[], draftNow: boolean) => {
    setIntention(asked.intention)
    setAnswered(true)
    start.mutate({
      intention: asked.intention, goalId: asked.goalId ?? undefined, projectId: asked.projectId ?? undefined,
      replaceActive: false, previousAttemptId: asked.id, answers, draftNow,
    }, {
      onSuccess: data => {
        setAttemptId(data.id)
        setDraftId(null)
        setDetached(true)
      },
    })
  }

  /**
   * Makes the draft under review again from its own flow (013 §10). The draft stays reviewable
   * until the new one is stored, so a failed or cancelled redo goes back to it.
   */
  const redo = (input: NonNullable<PlanningAttemptInput['redo']>, written: string) => {
    setLastRedo(input)
    setAnswered(true)
    start.mutate({ intention: written, replaceActive: false, redo: input }, {
      onSuccess: data => {
        setAttemptId(data.id)
        setDraftId(null)
        setDetached(true)
      },
    })
  }
  /** Back to the draft a redo was making again, after it failed or was cancelled. */
  const backToDraft = (id: string) => {
    start.reset()
    cancelAttempt.reset()
    setAttemptId(null)
    setDraftId(id)
    setDetached(true)
  }

  const phase = planningPhase({
    collision: !detached && currentAttemptId === null && Boolean(active.data?.draft),
    // While an answer is being sent the questions stay on screen, disabled.
    startPending: start.isPending && attempt.data?.outcome !== 'CLARIFICATION',
    attemptStatus: attempt.data?.status,
    attemptOutcome: attempt.data?.outcome,
    draftStatus: draft.data?.status,
    applied: apply.result !== null,
  })

  // Questions, a draft being made and a draft under review have the phone screen to themselves.
  const focused = phase === 'clarifying' || phase === 'queued' || phase === 'running' || (phase !== 'commandSucceeded' && draft.data?.status === 'REVIEWABLE')
  useEffect(() => {
    setFocused(focused)
    return () => setFocused(false)
  }, [focused, setFocused])

  // On desktop the same step sits between what was written and the road (CodeDesktopPlanning*).
  const road = <PlanningRoad draft={draft.data?.status === 'REVIEWABLE' ? draft.data : undefined} today={today} />
  const feedback = endedDraftId && <AiFeedbackCard key={endedDraftId} surface="PLANNING_DRAFT" subjectId={endedDraftId} />

  /** The first step: the page's own header, then the step it is on. */
  const frame = (content: ReactNode, step = 0) => desktop ? (
    <PlanningDesk steps={steps} step={step} road={road} context={<WritingHints />}>
      {feedback}
      {content}
    </PlanningDesk>
  ) : (
    <div className="page">
      <PageHeader title={pageTitle} description="از یک جمله تا یک برنامه‌ی روشن" />
      <div className="mb-4"><Stepper steps={steps} current={step} label="مراحل برنامه‌ریزی" /></div>
      {feedback}
      {content}
    </div>
  )

  /**
   * A later step: the way back to the writing and the step it is on, no page
   * header. `end` is the step's own exit (close, or the manual path).
   */
  const flow = (content: ReactNode, step: number, onBack: () => void, end: ReactNode) => desktop ? (
    <PlanningDesk
      steps={steps}
      step={step}
      road={road}
      actions={(
        <>
          <button className="flow-back" type="button" onClick={onBack}>
            <ArrowRight size={20} aria-hidden="true" />
            ویرایش نوشته
          </button>
          {end}
        </>
      )}
      context={(
        <>
          <WrittenText text={attempt.data?.intention ?? intention} onEdit={onBack} />
          {step === 1 && <WhyWeAsk />}
        </>
      )}
    >
      {feedback}
      {content}
    </PlanningDesk>
  ) : (
    <div className="page">
      <div className="flow-bar">
        <button className="flow-back" type="button" onClick={onBack}>
          <ArrowRight size={20} aria-hidden="true" />
          ویرایش نوشته
        </button>
        {end}
      </div>
      <div className="mb-4"><Stepper steps={steps} current={step} label="مراحل برنامه‌ریزی" /></div>
      {/* A draft just replaced by this flow may be asked about here, beside the new one being made. */}
      {feedback}
      {content}
    </div>
  )
  const manualButton = <button className="secondary-button min-h-10 rounded-xl px-3 text-xs" type="button" onClick={manual}>خودم دستی می‌سازم</button>

  if (apply.result) return frame(<PlanningResult result={apply.result} draftId={currentDraftId} onAgain={restart} />, steps.length)
  if (!detached && active.isPending) return frame(<LoadingState text="در حال آماده‌سازی برنامه‌ریزی…" />)
  if ((!detached && active.isError) || attempt.isError || draft.isError) {
    return frame(
      <ErrorState
        title="برنامه‌ریزی در دسترس نیست."
        description="می‌توانید همین حالا هدف، پروژه، کار یا روتین را دستی بسازید."
        onRetry={() => { void active.refetch(); void attempt.refetch(); void draft.refetch() }}
        action={<button className="primary-button" type="button" onClick={manual}>ساخت دستی</button>}
      />,
    )
  }

  if (phase === 'collision') {
    return frame(
      <section className="card" aria-labelledby="planning-collision">
        <h2 className="font-bold" id="planning-collision">یک پیش‌نویس تأییدنشده دارید</h2>
        <p className="mt-1 text-sm text-text-secondary">
          پیش‌نویس قبلی هنوز چیزی نساخته است. می‌توانید آن را ادامه دهید یا کنار بگذارید و از نو شروع کنید.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="primary-button"
            type="button"
            onClick={() => { setDraftId(active.data?.draft?.id ?? null); setDetached(true) }}
          >
            ادامه پیش‌نویس قبلی
          </button>
          <button className="secondary-button" type="button" onClick={() => { setReplace(true); setDetached(true) }}>
            شروع تازه و کنار گذاشتن قبلی
          </button>
          <Link className="ghost-button" to="/today">انصراف</Link>
        </div>
      </section>,
    )
  }

  if (phase === 'queued' || phase === 'running' || (currentAttemptId !== null && attempt.isPending) || (currentDraftId !== null && draft.isPending)) {
    return flow(
      <section className="state-panel" aria-label="ساخت پیش‌نویس">
        <div className="ai-tile ai-aura size-14 rounded-2xl" aria-hidden="true">
          <Sparkles size={26} />
        </div>
        <p className="mt-4 text-lg font-bold" role="status">{phase === 'queued' ? 'در صف ساخت پیش‌نویس…' : 'در حال ساخت پیش‌نویس…'}</p>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">تا پیش‌نویس کامل و بررسی نشود چیزی نمایش داده نمی‌شود. می‌توانید صفحه را ببندید و بعداً برگردید.</p>
        <FormError error={cancelAttempt.error} />
        {currentAttemptId !== null && attempt.data && (
          <button
            className="secondary-button mt-4"
            type="button"
            disabled={cancelAttempt.isPending}
            onClick={() => cancelAttempt.mutate(currentAttemptId, {
              // A cancelled redo leaves the draft it was making again; the user is taken back to it.
              onSuccess: () => { if (attempt.data?.redoOfDraftId) backToDraft(attempt.data.redoOfDraftId) },
            })}
          >
            {cancelAttempt.isPending ? 'در حال لغو…' : 'لغو'}
          </button>
        )}
      </section>,
      // Made from answers, the questions are behind; otherwise they may still come.
      answered ? 2 : 1,
      () => { setIntention(attempt.data?.intention ?? intention); restart() },
      manualButton,
    )
  }

  if (phase === 'attemptFailed' && attempt.data?.redoOfDraftId) {
    const failed = attempt.data
    const previous = attempt.data.redoOfDraftId
    return frame(
      <section className="card" aria-labelledby="planning-failed">
        <h2 className="font-bold" id="planning-failed" role="alert">ساخت دوباره‌ی پیش‌نویس انجام نشد</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {failureLabels[failed.failureCode ?? ''] ?? 'ساخت پیش‌نویس با خطا روبه‌رو شد.'} پیش‌نویس قبلی‌تان دست‌نخورده مانده است.
        </p>
        <PlanningStartError error={start.error} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {lastRedo?.draftId === previous && (
            <button className="primary-button" type="button" disabled={start.isPending} onClick={() => redo(lastRedo, failed.intention)}>تلاش دوباره</button>
          )}
          <button className="secondary-button" type="button" onClick={() => backToDraft(previous)}>برگشت به پیش‌نویس</button>
          <button className="ghost-button" type="button" onClick={manual}>خودم دستی می‌سازم</button>
        </div>
      </section>,
    )
  }

  if (phase === 'attemptFailed' && attempt.data) {
    const failed = attempt.data
    return frame(
      <section className="card" aria-labelledby="planning-failed">
        <h2 className="font-bold" id="planning-failed" role="alert">ساخت پیش‌نویس انجام نشد</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {failureLabels[failed.failureCode ?? ''] ?? 'ساخت پیش‌نویس با خطا روبه‌رو شد.'} چیزی ساخته نشده و نوشته شما حفظ شده است.
        </p>
        <p className="notice mt-3 whitespace-pre-wrap wrap-break-word">{failed.intention}</p>
        <PlanningStartError error={start.error} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="primary-button" type="button" disabled={start.isPending} onClick={() => begin(failed.intention)}>تلاش دوباره</button>
          <button className="secondary-button" type="button" onClick={() => { setIntention(failed.intention); restart() }}>ویرایش نوشته</button>
          <button className="ghost-button" type="button" onClick={manual}>خودم دستی می‌سازم</button>
        </div>
      </section>,
    )
  }

  if (phase === 'clarifying' && attempt.data?.clarification) {
    const asked = attempt.data
    const clarification = attempt.data.clarification
    return flow(
      <PlanningClarification
        // A new set of questions starts with empty answers.
        key={asked.id}
        clarification={clarification}
        pending={start.isPending}
        error={start.error}
        onAnswer={answers => answer(asked, answers, false)}
        onDraftNow={() => answer(asked, [], true)}
      />,
      1,
      () => { setIntention(asked.intention); restart() },
      <span className="flex items-center gap-1">
        {manualButton}
        <button className="icon-button" type="button" aria-label="انصراف از برنامه‌ریزی" disabled={start.isPending} onClick={() => { setIntention(''); restart() }}>
          <X size={22} aria-hidden="true" />
        </button>
      </span>,
    )
  }

  if (phase === 'inputBlocked' && attempt.data?.clarification) {
    const blocked = attempt.data
    const reason = attempt.data.clarification
    return frame(
      <section className="card" aria-labelledby="planning-blocked">
        <h2 className="font-bold" id="planning-blocked" role="alert">برای این نوشته نمی‌توان پیش‌نویس ساخت</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {blockReasonLabels[reason.blockReason ?? ''] ?? 'این درخواست قابل برنامه‌ریزی نیست.'} چیزی ساخته نشده و نوشته شما حفظ شده است.
        </p>
        {reason.message && <p className="notice-attention mt-3 whitespace-pre-wrap wrap-break-word">{reason.message}</p>}
        <p className="notice mt-3 whitespace-pre-wrap wrap-break-word">{blocked.intention}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="primary-button" type="button" onClick={() => { setIntention(blocked.intention); restart() }}>ویرایش نوشته</button>
          <button className="secondary-button" type="button" onClick={manual}>خودم دستی می‌سازم</button>
        </div>
      </section>,
    )
  }

  if (phase === 'cancelled' || phase === 'expired') {
    const superseded = draft.data?.status === 'SUPERSEDED'
    return frame(
      <EmptyState
        icon={phase === 'cancelled' ? CircleSlash : FileClock}
        title={phase === 'cancelled' ? 'برنامه‌ریزی لغو شد.' : 'این پیش‌نویس دیگر قابل مرور نیست.'}
        description={phase === 'cancelled'
          ? 'چیزی ساخته نشد.'
          : superseded ? 'پیش‌نویس تازه‌تری جای آن را گرفته است. چیزی ساخته نشد.' : 'مهلت مرور آن تمام شده است. چیزی ساخته نشد.'}
        action={(
          <div className="flex flex-wrap justify-center gap-3">
            <button className="primary-button" type="button" onClick={restart}>شروع دوباره</button>
            <button className="secondary-button" type="button" onClick={manual}>ساخت دستی</button>
          </div>
        )}
      />,
    )
  }

  if (draft.data) {
    const current = draft.data
    const written = attempt.data?.intention ?? origin.data?.intention ?? intention
    return flow(
      <>
        <PlanningDraftReview
          draft={current}
          intention={written}
          busy={revise.isPending || cancelDraft.isPending}
          error={revise.error ?? cancelDraft.error}
          onEdit={(edit, onStored) => revise.mutate({ draft: current, edit }, { onSuccess: onStored })}
          onApprove={() => apply.request(Number(current.revision))}
          onCancel={() => cancelDraft.mutate(current, { onSuccess: () => setEndedDraftId(current.id) })}
          // The server plans the draft's own flow again; the text only fills the request's required field.
          onRedo={correction => redo({ draftId: current.id, expectedRevision: Number(current.revision), correction }, written || current.summary)}
          redoPending={start.isPending}
          redoError={start.error}
        />
        <PlanningApplyDialog flow={apply} draft={current} />
      </>,
      apply.open ? 3 : 2,
      // Rewriting starts a new flow that replaces this draft, which stays until the new one is asked for.
      () => {
        setIntention(written)
        restart()
        setReplace(true)
        setReplacing(current.id)
      },
      manualButton,
    )
  }

  return frame(
    <div className="space-y-4">
      {replace && <p className="notice">با ساخت پیش‌نویس تازه، پیش‌نویس قبلی کنار گذاشته می‌شود.</p>}
      <PlanningIntentForm
        // Remounts with the preserved text after a failure or a cancellation.
        key={intention}
        initialIntention={intention}
        scope={scope}
        pending={start.isPending}
        error={start.error && toApiError(start.error).code !== 'PLANNING_DRAFT_ACTIVE' ? start.error : null}
        onScope={setScope}
        onSubmit={begin}
      />
      {(scope.goalId || scope.projectId) && <RememberedFactsCard scope={scope} />}
      {/* The sample generator is never presented as the work of a model (STEP-09). */}
      {active.data?.sampleGenerator !== false && (
        <p className="px-2 text-center text-xs leading-6 text-text-secondary">در این نسخه پیش‌نویس به‌صورت نمونه و بدون هوش مصنوعی ساخته می‌شود تا مسیر مرور و تأیید قابل استفاده باشد.</p>
      )}
      <button className="mx-auto flex min-h-11 items-center px-3 text-sm font-extrabold text-text-secondary hover:text-text-primary" type="button" onClick={manual}>
        یا خودم دستی می‌سازم
      </button>
    </div>,
  )
}

/** Shown only after the command itself answered: what was actually created. */
function PlanningResult({ result, draftId, onAgain }: {
  result: PlanningApplyResultDto
  /** The applied draft: the subject of the optional usefulness question. */
  draftId: string | null
  onAgain: () => void
}) {
  const counts = [
    result.goalId ? 'یک هدف' : null,
    result.projectIds.length > 0 ? `${formatNumber(result.projectIds.length)} پروژه` : null,
    result.taskIds.length > 0 ? `${formatNumber(result.taskIds.length)} کار` : null,
    result.routineIds.length > 0 ? `${formatNumber(result.routineIds.length)} روتین` : null,
  ].filter(Boolean)
  return (
    <>
      <EmptyState
        icon={CircleCheck}
        title="برنامه ساخته شد."
        description={[
          counts.length > 0 ? `${counts.join('، ')} ساخته شد.` : '',
          (result.datedTaskIds ?? []).length > 0 ? `${formatNumber((result.datedTaskIds ?? []).length)} کار موجود در این هفته روز گرفت.` : '',
          Number(result.factCount) > 0 ? `${formatNumber(Number(result.factCount))} مورد برای برنامه‌ریزی‌های بعدی نگه داشته شد.` : '',
        ].filter(Boolean).join(' ')}
        action={(
          <div className="flex flex-wrap justify-center gap-3">
            <Link className="primary-button" to="/today">رفتن به امروز</Link>
            {result.goalId && <Link className="secondary-button" to="/goals/$goalId" params={{ goalId: result.goalId }}>دیدن هدف</Link>}
            <button className="ghost-button" type="button" onClick={onAgain}>برنامه‌ریزی تازه</button>
          </div>
        )}
      />
      {draftId && <PilotQuestion instrument="H1_USEFULNESS" subjectId={draftId} />}
    </>
  )
}
