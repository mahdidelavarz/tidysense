import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLocalDate } from '../../../shared/lib/date'
import { DetailTerm } from '../../../shared/ui/DetailTerm'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoal, useGoalTerminal, useUpdateGoal } from '../hooks/goal-hooks'
import { GoalEditForm } from './GoalEditForm'
import { GoalTerminalDialog } from './GoalTerminalDialog'

/** Goal detail page: read, edit and the explicit achieve/abandon terminal flow. */
export function GoalDetailView({ goalId }: { goalId: string }) {
  const goal = useGoal(goalId)
  const update = useUpdateGoal(goalId)
  const terminal = useGoalTerminal(goalId)
  const [editing, setEditing] = useState(false)

  if (goal.isPending) {
    return <div className="page-container-narrow"><LoadingState text="در حال دریافت هدف…" /></div>
  }
  if (goal.isError) {
    const api = toApiError(goal.error)
    return (
      <div className="page-container-narrow">
        <ErrorState
          title={api.status === 404 ? 'هدف پیدا نشد.' : 'دریافت هدف ممکن نشد.'}
          description={api.status === 404 ? 'ممکن است این هدف وجود نداشته باشد یا در دسترس شما نباشد.' : 'ارتباط را بررسی کنید و دوباره تلاش کنید.'}
          onRetry={api.status === 404 ? undefined : () => goal.refetch()}
        />
      </div>
    )
  }

  const data = goal.data
  return (
    <div className="page-container-narrow space-y-6">
      <Link className="text-link inline-flex min-h-11 items-center" to="/">بازگشت به هدف‌ها و پروژه‌ها</Link>

      <article className="page-header entity-surface entity-goal">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <EntityLabel entity="goal" />
            <h1 className="mt-2 break-words text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{data.title}</h1>
          </div>
          <StatusBadge status={data.status} />
        </div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-text-secondary sm:text-base">{data.desiredOutcome}</p>
        <dl className="mt-6 grid gap-4 border-t border-border-subtle pt-5 text-sm sm:grid-cols-2">
          <DetailTerm label="تاریخ هدف" value={formatLocalDate(data.targetDate)} dateTime={data.targetDate} />
          <DetailTerm label="تاریخ بازبینی" value={formatLocalDate(data.reviewDate)} dateTime={data.reviewDate} />
        </dl>
      </article>

      {data.status === 'ACTIVE' && (
        <section className="surface-card" aria-label="عملیات هدف">
          <p className="mb-4 text-sm font-bold text-text-secondary">عملیات هدف</p>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button className="secondary-button" type="button" onClick={() => setEditing(value => !value)}>
              {editing ? 'انصراف از ویرایش' : 'ویرایش هدف'}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={terminal.previewPending}
              onClick={() => terminal.requestPreview({ status: 'ACHIEVED', version: Number(data.version) })}
            >
              {terminal.previewPending ? 'در حال آماده‌سازی…' : 'تحقق هدف'}
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={terminal.previewPending}
              onClick={() => terminal.requestPreview({ status: 'ABANDONED', version: Number(data.version) })}
            >
              رها کردن هدف
            </button>
          </div>
        </section>
      )}

      {editing && (
        <GoalEditForm
          goal={data}
          pending={update.isPending}
          error={update.error}
          onSubmit={request => update.mutate(request, { onSuccess: () => setEditing(false) })}
        />
      )}
      <FormError error={terminal.previewError} />
      <FormError error={terminal.terminalError} />
      {terminal.preview && (
        <GoalTerminalDialog
          preview={terminal.preview}
          pending={terminal.terminalPending}
          onCancel={terminal.cancel}
          onConfirm={terminal.confirm}
        />
      )}
    </div>
  )
}
