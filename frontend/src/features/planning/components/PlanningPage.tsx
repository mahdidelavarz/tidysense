import { Link } from '@tanstack/react-router'
import { CircleCheck, CircleSlash, FileClock } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatNumber } from '../../../shared/lib/date'
import { useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { useGoal } from '../../goals/hooks/goal-hooks'
import { AiConsentCard } from '../../pilot/components/AiConsentCard'
import { PilotQuestion } from '../../pilot/components/PilotQuestion'
import { useProject } from '../../projects/hooks/project-hooks'
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
import type { PlanningAnswer, PlanningApplyResultDto, PlanningAttemptDto, PlanningScopeInput } from '../types/planning.types'
import { PlanningApplyDialog } from './PlanningApplyDialog'
import { PlanningClarification } from './PlanningClarification'
import { PlanningDraftReview } from './PlanningDraftReview'
import { PlanningIntentForm } from './PlanningIntentForm'
import { PlanningStartError } from './PlanningStartError'

const pageTitle = 'برنامه‌ریزی'

/**
 * Planning page: one intention in, one reviewable draft out, and nothing
 * created until the user confirms the server's preview. Manual creation stays
 * available at every step, and every failure leaves the user's input intact.
 */
export function PlanningPage({ goalId, projectId }: PlanningScopeInput) {
  const active = usePlanningActive()
  const start = useStartPlanningAttempt()
  const cancelAttempt = useCancelPlanningAttempt()
  const cancelDraft = useCancelPlanningDraft()
  const revise = useRevisePlanningDraft()
  const openCreate = useUiStore(state => state.openCreate)
  // The server refuses to send text without consent; this only decides what the page offers.
  const user = useCurrentUser().data
  const needsConsent = user?.aiConsentRequired === true && !user.aiConsentGranted

  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  // Once the user has chosen what to do, the page stops following the flow it found on arrival.
  const [detached, setDetached] = useState(false)
  const [replace, setReplace] = useState(false)
  const [intention, setIntention] = useState('')

  const found = detached ? undefined : active.data
  // Unanswered questions are resumed like a running attempt: by the id of the attempt that asked them.
  const currentAttemptId = attemptId ?? found?.attempt?.id ?? found?.clarification?.id ?? null
  const attempt = usePlanningAttempt(currentAttemptId)
  const currentDraftId = draftId ?? (attempt.data?.status === 'SUCCEEDED' ? attempt.data.draftId : null)
  const draft = usePlanningDraft(currentDraftId)
  const apply = usePlanningApply(currentDraftId)

  const manual = () => openCreate('menu')
  const restart = () => {
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
  const begin = (text: string) => {
    setIntention(text)
    start.mutate({ intention: text, goalId, projectId, replaceActive: replace }, {
      onSuccess: data => {
        setAttemptId(data.id)
        setDraftId(null)
        setDetached(true)
        setReplace(false)
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

  /** Answers the questions of an attempt, or asks for a draft without answering them. */
  const answer = (asked: PlanningAttemptDto, answers: PlanningAnswer[], draftNow: boolean) => {
    setIntention(asked.intention)
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

  const phase = planningPhase({
    collision: !detached && currentAttemptId === null && Boolean(active.data?.draft),
    // While an answer is being sent the questions stay on screen, disabled.
    startPending: start.isPending && attempt.data?.outcome !== 'CLARIFICATION',
    attemptStatus: attempt.data?.status,
    attemptOutcome: attempt.data?.outcome,
    draftStatus: draft.data?.status,
    applied: apply.result !== null,
  })

  const form = (scopeTitle?: string) => (
    <PlanningIntentForm
      // Remounts with the preserved text after a failure or a cancellation.
      key={intention}
      initialIntention={intention}
      scopeTitle={scopeTitle}
      pending={start.isPending}
      error={start.error && toApiError(start.error).code !== 'PLANNING_DRAFT_ACTIVE' ? start.error : null}
      onSubmit={begin}
      onManual={manual}
    />
  )

  const frame = (content: ReactNode) => (
    <div className="page">
      <PageHeader
        title={pageTitle}
        description="بگویید می‌خواهید روی چه چیزی پیش بروید؛ یک پیش‌نویس می‌بینید، آن را مرور و ویرایش می‌کنید و فقط با تأیید خودتان چیزی ساخته می‌شود."
      />
      {content}
    </div>
  )

  if (apply.result) return frame(<PlanningResult result={apply.result} draftId={currentDraftId} onAgain={restart} />)
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
    return frame(
      <section className="card" aria-label="ساخت پیش‌نویس">
        <p className="font-bold" role="status">{phase === 'queued' ? 'در صف ساخت پیش‌نویس…' : 'در حال ساخت پیش‌نویس…'}</p>
        <p className="mt-1 text-sm text-text-secondary">تا پیش‌نویس کامل و بررسی نشود چیزی نمایش داده نمی‌شود. می‌توانید صفحه را ببندید و بعداً برگردید.</p>
        <FormError error={cancelAttempt.error} />
        {currentAttemptId !== null && attempt.data && (
          <button
            className="secondary-button mt-4"
            type="button"
            disabled={cancelAttempt.isPending}
            onClick={() => cancelAttempt.mutate(currentAttemptId)}
          >
            {cancelAttempt.isPending ? 'در حال لغو…' : 'لغو'}
          </button>
        )}
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
    return frame(
      <PlanningClarification
        // A new set of questions starts with empty answers.
        key={asked.id}
        attempt={asked}
        clarification={clarification}
        pending={start.isPending}
        error={start.error}
        onAnswer={answers => answer(asked, answers, false)}
        onDraftNow={() => answer(asked, [], true)}
        onEdit={() => { setIntention(asked.intention); restart() }}
        onManual={manual}
        onCancel={() => { setIntention(''); restart() }}
      />,
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
    return frame(
      <>
        <PlanningDraftReview
          draft={current}
          busy={revise.isPending || cancelDraft.isPending}
          error={revise.error ?? cancelDraft.error}
          onEdit={(edit, onStored) => revise.mutate({ draft: current, edit }, { onSuccess: onStored })}
          onApprove={() => apply.request(Number(current.revision))}
          onCancel={() => cancelDraft.mutate(current)}
          onManual={manual}
        />
        <PlanningApplyDialog flow={apply} draft={current} />
      </>,
    )
  }

  // Asked where a new text would be written. A draft already made stays reviewable above.
  if (needsConsent) return frame(<AiConsentCard onManual={manual} />)

  return frame(
    <div className="space-y-4">
      <p className="notice">
        {active.data?.sampleGenerator === false
          ? 'پیش‌نویس با کمک هوش مصنوعی و با اجازه‌ای که داده‌اید ساخته می‌شود: نوشته شما و خلاصه‌ای از همین حساب برای سرویس هوش مصنوعی بیرون از ایران فرستاده می‌شود. هوش مصنوعی فقط پیشنهاد می‌دهد و چیزی را تغییر نمی‌دهد.'
          : 'در این نسخه پیش‌نویس به‌صورت نمونه و بدون هوش مصنوعی ساخته می‌شود تا مسیر مرور و تأیید قابل استفاده باشد.'}
      </p>
      {replace && <p className="notice">با ساخت پیش‌نویس تازه، پیش‌نویس قبلی کنار گذاشته می‌شود.</p>}
      {goalId
        ? <GoalScopedForm goalId={goalId} render={form} />
        : projectId
          ? <ProjectScopedForm projectId={projectId} render={form} />
          : form()}
    </div>,
  )

}

/** Reads the Goal a contextual planning flow starts from, so the form can name it. */
function GoalScopedForm({ goalId, render }: { goalId: string; render: (title?: string) => ReactNode }) {
  const goal = useGoal(goalId)
  if (goal.isPending) return <LoadingState text="در حال دریافت هدف…" />
  if (goal.isError) return <ErrorState title="این هدف پیدا نشد." action={<Link className="text-link" to="/goals">بازگشت به هدف‌ها</Link>} />
  return render(goal.data.title)
}

/** Reads the Project a contextual planning flow starts from, so the form can name it. */
function ProjectScopedForm({ projectId, render }: { projectId: string; render: (title?: string) => ReactNode }) {
  const project = useProject(projectId)
  if (project.isPending) return <LoadingState text="در حال دریافت پروژه…" />
  if (project.isError) return <ErrorState title="این پروژه پیدا نشد." action={<Link className="text-link" to="/projects">بازگشت به پروژه‌ها</Link>} />
  return render(project.data.title)
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
