import { CalendarClock, CalendarDays, CircleCheckBig, CircleSlash, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLocalDate } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ActionTile } from '../../../shared/ui/ActionTile'
import { DetailTerm } from '../../../shared/ui/DetailTerm'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { BackLink } from '../../../shared/ui/PageHeader'
import { Sheet } from '../../../shared/ui/Sheet'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { PlanningFactsSection } from '../../planning/components/PlanningFactsSection'
import { useGoal, useGoalTerminal, useUpdateGoal } from '../hooks/goal-hooks'
import type { UpdateGoalRequest } from '../types/goal.types'
import { GoalForm } from './GoalForm'
import { GoalTerminalDialog } from './GoalTerminalDialog'

/** Goal detail page: read, edit and the explicit achieve/abandon terminal flow. */
export function GoalDetailView({ goalId }: { goalId: string }) {
  const goal = useGoal(goalId)
  const update = useUpdateGoal(goalId)
  const terminal = useGoalTerminal(goalId)
  const [editing, setEditing] = useState(false)

  if (goal.isPending) {
    return <div className="page"><BackLink to="/goals" /><LoadingState text="در حال دریافت هدف…" /></div>
  }
  if (goal.isError) {
    const notFound = toApiError(goal.error).status === 404
    return (
      <div className="page">
        <BackLink to="/goals" />
        <ErrorState
          title={notFound ? 'هدف پیدا نشد.' : 'دریافت هدف ممکن نشد.'}
          description={notFound ? 'ممکن است این هدف وجود نداشته باشد یا در دسترس شما نباشد.' : 'ارتباط را بررسی کنید و دوباره تلاش کنید.'}
          onRetry={notFound ? undefined : () => goal.refetch()}
        />
      </div>
    )
  }

  const data = goal.data
  const version = Number(data.version)
  return (
    <div className="page">
      <BackLink to="/goals" />

      <article>
        <div className="flex flex-wrap items-center gap-2">
          <EntityLabel entity="goal" />
          <StatusBadge status={data.status} />
        </div>
        <h1 className="page-title mt-3 wrap-break-word">{data.title}</h1>
        <p className="mt-3 whitespace-pre-wrap leading-8 text-text-secondary">{data.desiredOutcome}</p>
        <dl className="card mt-6 grid gap-5 sm:grid-cols-2">
          <DetailTerm icon={CalendarDays} label="تاریخ هدف" value={formatLocalDate(data.targetDate)} dateTime={data.targetDate} />
          <DetailTerm icon={CalendarClock} label="تاریخ بازبینی" value={formatLocalDate(data.reviewDate)} dateTime={data.reviewDate} />
        </dl>
      </article>

      {data.status === 'ACTIVE' && (
        <section className="mt-8" aria-labelledby="goal-actions">
          <h2 className="section-title" id="goal-actions">چه کاری می‌خواهید انجام دهید؟</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ActionTile icon={Pencil} label="ویرایش هدف" description="عنوان، نتیجه مطلوب یا تاریخ‌ها را تغییر دهید." onClick={() => setEditing(true)} />
            <ActionTile
              icon={CircleCheckBig}
              tone="positive"
              label={terminal.previewPending ? 'در حال آماده‌سازی…' : 'تحقق هدف'}
              description="ثبت می‌کنید که به این نتیجه رسیده‌اید."
              disabled={terminal.previewPending}
              onClick={() => terminal.requestPreview({ status: 'ACHIEVED', version })}
            />
            <ActionTile
              icon={CircleSlash}
              tone="attention"
              label="رها کردن هدف"
              description="این هدف را بدون تحقق کنار می‌گذارید."
              disabled={terminal.previewPending}
              onClick={() => terminal.requestPreview({ status: 'ABANDONED', version })}
            />
          </div>
        </section>
      )}

      {data.status === 'ACTIVE' && <PlanningFactsSection scope={{ goalId }} />}

      <div className="mt-4 space-y-3">
        <FormError error={terminal.previewError} />
        <FormError error={terminal.terminalError} />
      </div>

      {editing && (
        <Sheet title="ویرایش هدف" onClose={() => setEditing(false)} locked={update.isPending}>
          <GoalForm
            goal={data}
            pending={update.isPending}
            error={update.error}
            onCancel={() => setEditing(false)}
            // GoalForm's onSubmit covers create and edit; passing `goal` guarantees the edit shape.
            onSubmit={request => update.mutate(request as UpdateGoalRequest, {
              onSuccess: () => {
                setEditing(false)
                showToast('تغییرات هدف ذخیره شد.')
              },
            })}
          />
        </Sheet>
      )}
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
