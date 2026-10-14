import { Link } from '@tanstack/react-router'
import { formatDayMonth, formatLocalDate, formatNumber } from '../../../shared/lib/date'
import { CalendarClock, CircleSlash, Play, Target } from '../../../shared/ui/icons'
import { showToast } from '../../../shared/lib/ui-store'
import { EntityIcon } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { useReviewGoal } from '../../goals/hooks/goal-hooks'
import { useReviewProject } from '../../projects/hooks/project-hooks'
import type { ReconcileActionDraft, ReconcileReviewItemDto, ReconcileTaskRefDto } from '../types/reconcile.types'
import { LaneHeading } from './ExecutionLane'

/**
 * Commitment-review lane: Goals and Projects whose review date has arrived.
 * These are checkpoints, not late work, so they sit apart from the execution
 * lane and never use its wording.
 */
export function ReviewLane({ reviews, total, onAction, onDatedAction }: {
  reviews: ReconcileReviewItemDto[]
  /** Every review that is due; the list itself is a limited chunk. */
  total: number
  onAction: (draft: ReconcileActionDraft) => void
  onDatedAction: (draft: ReconcileActionDraft) => void
}) {
  const reviewGoal = useReviewGoal()
  const reviewProject = useReviewProject()
  const busyId = reviewGoal.isPending ? reviewGoal.variables?.goalId
    : reviewProject.isPending ? reviewProject.variables?.projectId : undefined

  return (
    <section aria-labelledby="reconcile-reviews">
      <LaneHeading
        id="reconcile-reviews"
        icon={Target}
        entity="goal"
        count={total}
        hint={`وقت مرورشان رسیده؛ ادامه، بعداً یا پایان. این نقطه‌ی بازبینی است، نه کار عقب‌افتاده.${total > reviews.length ? ` ${formatNumber(reviews.length)} مورد از ${formatNumber(total)} مورد نمایش داده شده است.` : ''}`}
      >
        مرور هدف و پروژه
      </LaneHeading>
      <div className="mt-3"><FormError error={reviewGoal.error ?? reviewProject.error} /></div>
      <ul className="mt-4 space-y-4">
        {reviews.map(review => {
          const isGoal = review.entityType === 'GOAL'
          const busy = busyId === review.id
          const version = Number(review.version)
          return (
            <li key={review.id}>
              <article className={`decision-card review-card entity-${isGoal ? 'goal' : 'project'}`} aria-label={review.title}>
                <div className="p-4">
                <div className="flex items-start gap-3">
                  <EntityIcon entity={isGoal ? 'goal' : 'project'} />
                  <div className="min-w-0 flex-1">
                    <p className="entity-ink text-[0.6875rem] font-extrabold">{isGoal ? 'هدف' : 'پروژه'}</p>
                    <h3 className="decision-title">{review.title}</h3>
                    <p className="mt-0.5 text-xs leading-6 text-text-secondary">
                      موعد مرورش {formatDayMonth(review.reviewDate)} بود
                      {review.targetDate && `؛ تاریخ هدف ${formatLocalDate(review.targetDate)}`}
                    </p>
                  </div>
                </div>
                {isGoal && <p className="mt-3 text-sm font-bold sm:mt-4 sm:text-base">آیا می‌خواهید این هدف را ادامه دهید؟</p>}

                {review.undatedTasks.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-surface-sunken p-3 text-sm">
                    <p className="font-bold">{formatNumber(review.undatedTasks.length)} کار بدون تاریخ</p>
                    <ul className="mt-2 space-y-2">
                      {review.undatedTasks.map(task => (
                        <li key={task.id}><UndatedTask task={task} onAction={onAction} onDatedAction={onDatedAction} /></li>
                      ))}
                    </ul>
                  </div>
                )}

                </div>
                <div className="decision-bar">
                  {isGoal ? (
                    <>
                      <button
                        className="decision-button review-continue"
                        type="button"
                        disabled={busy}
                        onClick={() => reviewGoal.mutate({ goalId: review.id, decision: 'CONTINUE', expectedVersion: version }, {
                          onSuccess: () => showToast('هدف ادامه می‌یابد.'),
                        })}
                      >
                        <Play size={19} aria-hidden="true" />
                        ادامه می‌دهم
                      </button>
                      <button
                        className="decision-button"
                        type="button"
                        aria-label="بعداً مرور می‌کنم"
                        disabled={busy}
                        onClick={() => reviewGoal.mutate({ goalId: review.id, decision: 'REVIEW_LATER', expectedVersion: version }, {
                          onSuccess: () => showToast('مرور هدف به بعد موکول شد.'),
                        })}
                      >
                        <CalendarClock size={19} aria-hidden="true" />
                        بعداً
                      </button>
                      {/* Abandoning is a terminal decision: it goes through the Goal's own confirmation. */}
                      <Link className="decision-button" data-tone="danger" to="/goals/$goalId" params={{ goalId: review.id }} aria-label="رها کردن یا تصمیم دیگر، در صفحه‌ی هدف">
                        <CircleSlash size={19} aria-hidden="true" />
                        رهایش کن
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        className="decision-button review-continue"
                        type="button"
                        aria-label="ادامه با تاریخ مرور تازه"
                        disabled={busy}
                        onClick={() => reviewProject.mutate({ projectId: review.id, expectedVersion: version }, {
                          onSuccess: () => showToast('پروژه با تاریخ مرور تازه ادامه می‌یابد.'),
                        })}
                      >
                        <Play size={19} aria-hidden="true" />
                        ادامه می‌دهم
                      </button>
                      <Link className="decision-button" to="/projects/$projectId" params={{ projectId: review.id }} aria-label="تکمیل یا توقف پروژه، در صفحه‌ی پروژه">
                        <CircleSlash size={19} aria-hidden="true" />
                        تمام یا توقف
                      </Link>
                    </>
                  )}
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** An undated child Task resurfaces only here, through its direct parent's review. */
function UndatedTask({ task, onAction, onDatedAction }: {
  task: ReconcileTaskRefDto
  onAction: (draft: ReconcileActionDraft) => void
  onDatedAction: (draft: ReconcileActionDraft) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link className="text-link min-w-0 flex-1 wrap-break-word" to="/tasks/$taskId" params={{ taskId: task.id }}>{task.title}</Link>
      <button
        className="secondary-button min-h-9 px-3"
        type="button"
        aria-label={`تعیین تاریخ: ${task.title}`}
        onClick={() => onDatedAction({ actionType: 'REPLAN_TASKS', taskIds: [task.id] })}
      >
        تعیین تاریخ
      </button>
      {!task.deadline && (
        <button
          className="ghost-button min-h-9 px-3 text-attention"
          type="button"
          aria-label={`کنار گذاشتن: ${task.title}`}
          onClick={() => onAction({ actionType: 'DROP_TASKS', taskIds: [task.id] })}
        >
          کنار گذاشتن
        </button>
      )}
    </div>
  )
}
