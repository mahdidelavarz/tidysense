import { Link } from '@tanstack/react-router'
import { CalendarClock, CircleCheck, ListChecks, type LucideIcon, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { CaptureLane } from '../../captures/components/CaptureLane'
import { PilotQuestion } from '../../pilot/components/PilotQuestion'
import { TaskCarrySheet } from '../../tasks/components/TaskCarrySheet'
import { useCompleteTask } from '../../tasks/hooks/task-hooks'
import { useCompleteReconcileSession, useReconcileAction, useReconcileSession } from '../hooks/reconcile-hooks'
import { actionTitles, severityLabels } from '../types/reconcile.format'
import type { ReconcileActionDraft, ReconcileSessionDto } from '../types/reconcile.types'
import { AiExplanationCard } from './AiExplanationCard'
import { ExecutionLane } from './ExecutionLane'
import { ReviewApplyDialog } from './ReviewApplyDialog'
import { ReviewLane } from './ReviewLane'

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
  const complete = useCompleteTask()
  const finish = useCompleteReconcileSession()
  // An action that needs a date waits here until the user picks one.
  const [dated, setDated] = useState<ReconcileActionDraft | null>(null)
  // The optional question is asked once, right after the user ends the session here; never on a later visit.
  const [justCompleted, setJustCompleted] = useState(false)

  const counts = session.counts
  const severity = severityLabels[session.severity] ?? severityLabels.NONE
  const reviewTotal = Number(counts.reviewDueCount)
  const captureTotal = Number(counts.unresolvedCaptureCount)
  const nothingLeft = session.executionGroups.length === 0 && session.commitmentReviews.length === 0 &&
    session.captures.length === 0

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

  return (
    <div className="page">
      <PageHeader
        title="بازبینی"
        description="هر مورد یک تصمیم کوتاه می‌خواهد. هیچ تغییری بدون تأیید شما انجام نمی‌شود."
        action={<Link className="secondary-button shrink-0" to="/today">امروز</Link>}
      />

      {nothingLeft ? (
        <EmptyState
          icon={CircleCheck}
          title="چیزی برای بازبینی نمانده است."
          description="وقتی کاری از تاریخش بگذرد، زمان مرور یک تعهد برسد یا یادداشتی ذخیره کنید، اینجا دیده می‌شود."
          action={<Link className="primary-button" to="/today">رفتن به امروز</Link>}
        />
      ) : (
        <div className="space-y-8">
          <section
            className="rounded-3xl border border-caution/20 bg-linear-to-bl from-caution-tint via-surface to-surface p-4 shadow-sm sm:p-6"
            aria-labelledby="reconcile-summary"
          >
            <h2 className="sr-only" id="reconcile-summary">خلاصه وضعیت</h2>
            <p className="status-badge status-neutral">شدت: {severity.badge}</p>
            <p className="mt-3 font-bold leading-7 sm:text-lg sm:leading-8">{severity.title}</p>
            <p className="mt-1 text-xs leading-6 text-text-secondary sm:text-sm">{severity.description}</p>
            <ul className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
              <SummaryCount icon={ListChecks} label="کار مانده" value={Number(counts.actionableBacklogCount)} target="reconcile-execution" />
              <SummaryCount icon={CalendarClock} label="مرور تعهد" value={reviewTotal} target="reconcile-reviews" />
              <SummaryCount icon={StickyNote} label="یادداشت سریع" value={captureTotal} target="reconcile-captures" />
            </ul>
          </section>

          <AiExplanationCard session={session} onAction={action.request} onDatedAction={setDated} />

          <FormError error={complete.error} />

          {session.executionGroups.length > 0 && (
            <ExecutionLane
              groups={session.executionGroups}
              total={Number(counts.actionableBacklogCount)}
              today={session.localDate}
              onAction={action.request}
              onDatedAction={setDated}
              busyTaskId={complete.isPending ? complete.variables?.taskId : undefined}
              onComplete={task => complete.mutate(
                { taskId: task.taskId, expectedVersion: Number(task.version), completedForLocalDate: session.localDate },
                { onSuccess: () => showToast('کار انجام شد.') },
              )}
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

          <section className="lane" aria-label="پایان بازبینی">
            <FormError error={finish.error} />
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="secondary-button"
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
              <p className="text-sm text-text-secondary">موارد باقی‌مانده حذف نمی‌شوند و بعداً دوباره در دسترس‌اند.</p>
            </div>
          </section>
        </div>
      )}

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
    </div>
  )
}

/** One count of the summary. With something waiting it is also the way down to that part of the page. */
function SummaryCount({ icon: Icon, label, value, target }: { icon: LucideIcon; label: string; value: number; target: string }) {
  const content = (
    <>
      <Icon size={18} className="text-text-secondary max-sm:hidden" aria-hidden="true" />
      <span className="block text-xl font-extrabold leading-7 sm:mt-1.5 sm:text-2xl sm:leading-8">{formatNumber(value)}</span>
      <span className="block text-[0.6875rem] text-text-secondary sm:text-xs">{label}</span>
    </>
  )
  return (
    <li>
      {value > 0 ? (
        <button
          className="block w-full rounded-2xl border border-border-subtle bg-surface px-3 py-2 text-start shadow-sm sm:p-3 transition duration-200 hover:border-accent hover:bg-accent-tint active:scale-[0.98]"
          type="button"
          onClick={() => document.getElementById(target)?.scrollIntoView?.({ behavior: 'smooth' })}
        >
          {content}
        </button>
      ) : <div className="rounded-2xl border border-dashed border-border px-3 py-2 opacity-60 sm:p-3">{content}</div>}
    </li>
  )
}
