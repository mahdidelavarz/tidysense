import { Link } from '@tanstack/react-router'
import { formatLocalDate, formatNumber } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { useReviewGoal } from '../../goals/hooks/goal-hooks'
import { useReviewProject } from '../../projects/hooks/project-hooks'
import type { ReconcileActionDraft, ReconcileReviewItemDto, ReconcileTaskRefDto } from '../types/reconcile.types'

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
      <h2 className="section-title" id="reconcile-reviews">مرور تعهدها</h2>
      <p className="mt-1 text-sm text-text-secondary">
        زمان مرور این موارد رسیده است. این یک نقطه بازبینی است، نه کار عقب‌افتاده.
        {total > reviews.length && ` ${formatNumber(reviews.length)} مورد از ${formatNumber(total)} مورد نمایش داده شده است.`}
      </p>
      <div className="mt-3"><FormError error={reviewGoal.error ?? reviewProject.error} /></div>
      <ul className="mt-3 space-y-3">
        {reviews.map(review => {
          const isGoal = review.entityType === 'GOAL'
          const busy = busyId === review.id
          const version = Number(review.version)
          return (
            <li key={review.id}>
              <article className="card">
                <EntityLabel entity={isGoal ? 'goal' : 'project'} />
                <h3 className="mt-2 wrap-break-word font-bold leading-7">{review.title}</h3>
                <p className="text-xs text-text-secondary">
                  تاریخ مرور: {formatLocalDate(review.reviewDate)}
                  {review.targetDate && ` · تاریخ هدف: ${formatLocalDate(review.targetDate)}`}
                </p>
                {isGoal && <p className="mt-3 font-bold">آیا می‌خواهید این هدف را ادامه دهید؟</p>}

                {review.undatedTasks.length > 0 && (
                  <div className="notice mt-3">
                    <p className="font-bold text-text-primary">کارهای فعال بدون تاریخ</p>
                    <ul className="mt-2 space-y-2">
                      {review.undatedTasks.map(task => (
                        <li key={task.id}><UndatedTask task={task} onAction={onAction} onDatedAction={onDatedAction} /></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {isGoal ? (
                    <>
                      <button
                        className="primary-button min-h-9 px-3"
                        type="button"
                        disabled={busy}
                        onClick={() => reviewGoal.mutate({ goalId: review.id, decision: 'CONTINUE', expectedVersion: version }, {
                          onSuccess: () => showToast('هدف ادامه می‌یابد.'),
                        })}
                      >
                        ادامه می‌دهم
                      </button>
                      <button
                        className="secondary-button min-h-9 px-3"
                        type="button"
                        disabled={busy}
                        onClick={() => reviewGoal.mutate({ goalId: review.id, decision: 'REVIEW_LATER', expectedVersion: version }, {
                          onSuccess: () => showToast('مرور هدف به بعد موکول شد.'),
                        })}
                      >
                        بعداً مرور می‌کنم
                      </button>
                      <Link className="ghost-button min-h-9 px-3" to="/goals/$goalId" params={{ goalId: review.id }}>
                        تصمیم دیگری دارم
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        className="primary-button min-h-9 px-3"
                        type="button"
                        disabled={busy}
                        onClick={() => reviewProject.mutate({ projectId: review.id, expectedVersion: version }, {
                          onSuccess: () => showToast('پروژه با تاریخ مرور تازه ادامه می‌یابد.'),
                        })}
                      >
                        ادامه با تاریخ مرور تازه
                      </button>
                      <Link className="ghost-button min-h-9 px-3" to="/projects/$projectId" params={{ projectId: review.id }}>
                        تکمیل یا توقف پروژه
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
