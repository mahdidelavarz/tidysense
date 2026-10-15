import { Link } from '@tanstack/react-router'
import { CircleCheck, History } from '../../../shared/ui/icons'
import { useState } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { CaptureLane } from '../../captures/components/CaptureLane'
import { PilotQuestion } from '../../pilot/components/PilotQuestion'
import { TaskCarrySheet } from '../../tasks/components/TaskCarrySheet'
import { toApiError } from '../../../shared/api/http'
import { useCompleteReconcileSession, useReconcileAction, useReconcileQuickActions, useReconcileSession } from '../hooks/reconcile-hooks'
import { actionTitles, severityLabels } from '../types/reconcile.format'
import type { ReconcileActionDraft, ReconcileSessionDto } from '../types/reconcile.types'
import { AiExplanationCard } from './AiExplanationCard'
import { ExecutionLane, type Suggestion } from './ExecutionLane'
import { ReviewApplyDialog } from './ReviewApplyDialog'
import { ReviewLane } from './ReviewLane'
import { EarlierDays, TodayAfter } from './ReconcileDesk'
import { useIsDesktop } from '../../../shared/lib/use-desktop'

/** Reconcile page: opens today's session and shows its three lanes. It never stands between the user and Today. */
export function ReconcilePage() {
  const session = useReconcileSession()

  if (session.isPending) {
    return <div className="page"><PageHeader title="بازبینی" /><LoadingState text="در حال آماده‌سازی بازبینی…" /></div>
  }
  if (session.isError) {
    return (
      <div className="page">
        <PageHeader title="بازبینی" />
        <ErrorState
          title="بازبینی در دسترس نیست."
          description="کارهای امروز همچنان در دسترس‌اند. کمی بعد دوباره تلاش کنید."
          onRetry={() => session.refetch()}
          action={<Link className="text-link" to="/today">رفتن به امروز</Link>}
        />
      </div>
    )
  }
  return <ReconcileSession session={session.data} onRestart={() => session.refetch()} />
}

function ReconcileSession({ session, onRestart }: { session: ReconcileSessionDto; onRestart: () => void }) {
  const action = useReconcileAction(session.id)
  const quick = useReconcileQuickActions(session.id)
  const finish = useCompleteReconcileSession()
  // An action that needs a date waits here until the user picks one.
  const [dated, setDated] = useState<ReconcileActionDraft | null>(null)
  // The optional question is asked once, right after the user ends the session here; never on a later visit.
  const [justCompleted, setJustCompleted] = useState(false)
  // The one-tap decision just applied, whose row takes the focus.
  const [lastApplied, setLastApplied] = useState<string | undefined>(undefined)

  const counts = session.counts
  const severity = severityLabels[session.severity] ?? severityLabels.NONE
  const reviewTotal = Number(counts.reviewDueCount)
  const captureTotal = Number(counts.unresolvedCaptureCount)
  const actionable = Number(counts.actionableBacklogCount)
  const decided = session.quickActions.filter(item => item.status === 'APPLIED')
  const nothingLeft = session.executionGroups.length === 0 && session.commitmentReviews.length === 0 &&
    session.captures.length === 0
  const remaining = actionable + reviewTotal + captureTotal
  // New work can appear while the session is open, so the total is never below what remains.
  const total = Math.max(Number(session.openedDecisionCount), remaining)
  const suggestions = suggestedControls(session)
  const busyId = quick.apply.isPending ? quick.apply.variables?.taskId : quick.undo.isPending ? quick.undo.variables : undefined
  const desktop = useIsDesktop()

  if (session.status !== 'OPEN') {
    return (
      <div className="page">
        <PageHeader title="بازبینی" />
        <EmptyState
          icon={CircleCheck}
          title="این بازبینی بسته شد."
          description="هر موردی که هنوز مانده باشد، در بازبینی بعدی دوباره دیده می‌شود."
          action={(
            <div className="flex flex-wrap justify-center gap-3">
              <Link className="primary-button" to="/today">رفتن به امروز</Link>
              <button className="secondary-button" type="button" onClick={onRestart}>بازبینی تازه</button>
            </div>
          )}
        />
        {justCompleted && session.status === 'COMPLETED' && (
          <PilotQuestion instrument="H2_UNDERSTANDING" subjectId={session.id} />
        )}
      </div>
    )
  }

  const summary = (
  <>
          <section className="card p-4 sm:p-5" aria-labelledby="reconcile-summary">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[0.9375rem] font-extrabold" id="reconcile-summary">
                <span className="font-display text-2xl">{formatNumber(remaining)}</span>
                {' '}تصمیم مانده، از {formatNumber(total)}
              </h2>
              <span className="rounded-lg bg-surface-sunken px-2.5 py-1 text-xs font-extrabold text-text-secondary">حجم: {severity.badge}</span>
            </div>
            <span className="answer-progress mt-3 block" aria-hidden="true">
              <span style={{ width: `${total === 0 ? 100 : ((total - remaining) / total) * 100}%` }} />
            </span>
            <p className="mt-3 text-xs leading-6 text-text-secondary">
              هر وقت خواستید تصمیم بگیرید؛ <Link className="text-link" to="/today">«امروز»</Link> همچنان در دسترس است.
              {' '}«انجام شد» و «امروز» با یک لمس ثبت می‌شوند و تا پایان این بازبینی قابل بازگشت‌اند؛ بقیه پیش از اعمال پیش‌نمایش دارند.
            </p>
          </section>

  </>
  )
  const explanation = (
          <AiExplanationCard session={session} onAction={action.request} onDatedAction={setDated} />

  )
  const lanes = (
    <>
          <QuickError error={quick.apply.error ?? quick.undo.error} />

          {(session.executionGroups.length > 0 || decided.length > 0) && (
            <ExecutionLane
              groups={session.executionGroups}
              quickActions={session.quickActions}
              total={actionable}
              today={session.localDate}
              onAction={action.request}
              onDatedAction={setDated}
              onQuick={(task, actionType) => {
                quick.undo.reset()
                quick.apply.mutate(
                  { taskId: task.taskId, actionType, expectedVersion: Number(task.version) },
                  {
                    onSuccess: data => {
                      setLastApplied(data.quickActions.find(item => item.taskId === task.taskId && item.status === 'APPLIED')?.id)
                      showToast(actionType === 'COMPLETE_TASK' ? 'انجام شد. تا پایان بازبینی قابل بازگشت است.' : 'به امروز آمد. تا پایان بازبینی قابل بازگشت است.')
                    },
                  },
                )
              }}
              onUndo={item => {
                quick.apply.reset()
                quick.undo.mutate(item.id, { onSuccess: () => showToast('برگشت به حالت قبل.') })
              }}
              busyId={busyId}
              suggestions={suggestions}
              focusId={lastApplied}
            />
          )}
          {session.commitmentReviews.length > 0 && (
            <ReviewLane
              reviews={session.commitmentReviews}
              total={reviewTotal}
              onAction={action.request}
              onDatedAction={setDated}
            />
          )}
          {session.captures.length > 0 && <CaptureLane captures={session.captures} total={captureTotal} />}

    </>
  )
  const finishSection = (
          <section className="flex flex-col items-center gap-2 pt-2" aria-label="پایان بازبینی">
            <FormError error={finish.error} />
            <button
              className="secondary-button min-w-48"
              type="button"
              disabled={finish.isPending}
              onClick={() => finish.mutate(session, {
                onSuccess: () => {
                  setJustCompleted(true)
                  showToast('بازبینی بسته شد.')
                },
              })}
            >
              {finish.isPending ? 'در حال ثبت…' : 'پایان بازبینی'}
            </button>
            <p className="text-center text-xs leading-6 text-text-secondary">موارد باقی‌مانده حذف نمی‌شوند و بعداً دوباره در دسترس‌اند. پس از پایان، «بازگردان» دیگر در دسترس نیست.</p>
          </section>
  )
  const sheets = (
    <>
      {dated && (
        <TaskCarrySheet
          title={actionTitles[dated.actionType]}
          description={dated.actionType === 'SEQUENCE_CARRY_ALL'
            ? 'اولین کار مانده دنباله به این تاریخ می‌رود و بقیه با همان فاصله قبلی جابه‌جا می‌شوند.'
            : 'پس از انتخاب تاریخ، پیش‌نمایش تغییر را می‌بینید و بعد تأیید می‌کنید.'}
          submitLabel="دیدن پیش‌نمایش"
          pending={false}
          error={null}
          onClose={() => setDated(null)}
          onSubmit={plannedDate => {
            action.request({ ...dated, plannedDate })
            setDated(null)
          }}
        />
      )}
      <ReviewApplyDialog flow={action} />
    </>
  )
  const empty = nothingLeft && decided.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="چیزی برای بازبینی نمانده است."
          description="وقتی کاری از تاریخش بگذرد، زمان مرور یک تعهد برسد یا یادداشتی ذخیره کنید، اینجا دیده می‌شود."
          action={<Link className="primary-button" to="/today">رفتن به امروز</Link>}
        />
  ) : null

  // On desktop (CodeDesktopReconcile) the same lanes sit between the days they come from and today after the review.
  if (desktop) {
    return (
      <div className="page-desk">
        <header className="desk-header items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-moon text-on-accent" aria-hidden="true"><History size={24} /></span>
            <div>
              <h1 className="page-title leading-tight">بازبینی روزهای قبل</h1>
              <p className="text-xs text-text-secondary">{severity.title}</p>
            </div>
          </div>
          <div className="flex min-w-72 items-center gap-3 text-xs font-bold text-text-secondary">
            <span className="answer-progress block flex-1" aria-hidden="true">
              <span style={{ width: `${total === 0 ? 100 : ((total - remaining) / total) * 100}%` }} />
            </span>
            {formatNumber(total - remaining)} از {formatNumber(total)} تصمیم
          </div>
        </header>
        {empty ?? (
          <div className="desk-reconcile">
            <aside className="space-y-5" aria-label="کنار بازبینی">
              <EarlierDays session={session} />
              {explanation}
            </aside>
            <div className="min-w-0 space-y-7">
              {summary}
              {lanes}
              {finishSection}
            </div>
            <TodayAfter quickActions={session.quickActions} />
          </div>
        )}
        {sheets}
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader title="بازبینی" description={severity.title} />
      {empty ?? (
        <div className="space-y-7">
          {summary}
          {explanation}
          {lanes}
          {finishSection}
        </div>
      )}
      {sheets}
    </div>
  )
}

/**
 * The controls an open AI recommendation points at, by Task or sequence. A
 * recommendation only rings that control; nothing happens until the user taps
 * it, and what it opens is the ordinary preview.
 */
function suggestedControls(session: ReconcileSessionDto): ReadonlyMap<string, Suggestion> {
  const map = new Map<string, Suggestion>()
  const explanation = session.ai.explanation
  if (explanation?.status !== 'READY') return map
  for (const recommendation of explanation.recommendations) {
    if (recommendation.status !== 'OPEN') continue
    const suggestion = { actionType: recommendation.actionType, recommendationId: recommendation.id }
    if (recommendation.sequenceId) map.set(recommendation.sequenceId, suggestion)
    else for (const taskId of recommendation.taskIds) map.set(taskId, suggestion)
  }
  return map
}

/** Why a tap or an undo did not go through, in the words of what happened. */
function QuickError({ error }: { error: unknown }) {
  if (!error) return null
  const code = toApiError(error).code
  const copy: Record<string, string> = {
    QUICK_ACTION_STALE: 'این کار بعد از آن تصمیم تغییر کرده است، پس بازگرداندنش آن تغییر را پاک می‌کرد. چیزی تغییر نکرد.',
    QUICK_ACTION_ALREADY_UNDONE: 'این تصمیم پیش‌تر بازگردانده شده است.',
    RECONCILE_SESSION_NOT_OPEN: 'این بازبینی بسته شده است و تصمیم‌هایش دیگر بازگشت ندارند.',
    QUICK_ACTION_NOT_ALLOWED: 'این کار دیگر منتظر تصمیم نیست. فهرست تازه شد.',
    TASK_BLOCKED: 'این کار منتظر کار پیشین است و هنوز انجام‌شدنی نیست.',
  }
  if (code && copy[code]) return <p className="notice-attention" role="alert">{copy[code]}</p>
  return <FormError error={error} />
}
