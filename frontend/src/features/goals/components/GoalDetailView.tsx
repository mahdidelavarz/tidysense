import { Link } from '@tanstack/react-router'
import { CircleCheck, Pencil } from '../../../shared/ui/icons'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatNumber, toIsoDate } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { BackLink } from '../../../shared/ui/PageHeader'
import { Sheet } from '../../../shared/ui/Sheet'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { PlanningFactsSection } from '../../planning/components/PlanningFactsSection'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { NextSteps, UnderRow } from '../../structure/components/NextSteps'
import { ProgressBar, ReviewNote, TargetNote } from '../../structure/components/ProgressFacts'
import { useProgress } from '../../structure/hooks/progress-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import { useGoal, useGoalTerminal, useUpdateGoal } from '../hooks/goal-hooks'
import type { UpdateGoalRequest } from '../types/goal.types'
import { GoalForm } from './GoalForm'
import { GoalTerminalDialog } from './GoalTerminalDialog'
import { ContinuationOffers } from '../../planning/components/ContinuationOffer'

/**
 * Goal detail page: what it means, how far it has come, what is under it,
 * its next steps, and the explicit achieve/abandon flow at the foot. Editing
 * is the pencil at the top.
 */
export function GoalDetailView({ goalId }: { goalId: string }) {
  const goal = useGoal(goalId)
  const update = useUpdateGoal(goalId)
  const terminal = useGoalTerminal(goalId)
  const [editing, setEditing] = useState(false)
  const progress = useProgress()
  const projects = useProjectOptions()
  // The server's local date when it is known; the browser's until then (the pilot runs in one time zone).
  const today = useToday().data?.localDate ?? toIsoDate(new Date())

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
  const active = data.status === 'ACTIVE'
  const work = progress.data?.goals.find(item => item.goalId === goalId)
  const underProjects = (projects.data?.items ?? []).filter(project => project.goalId === goalId && project.status === 'ACTIVE')
  return (
    <div className="page pb-10">
      <BackLink
        to="/goals"
        actions={active && (
          <button className="account-button" type="button" aria-label="ویرایش هدف" onClick={() => setEditing(true)}>
            <Pencil size={20} aria-hidden="true" />
          </button>
        )}
      />

      <header className="entity-goal">
        <div className="flex flex-wrap items-center gap-2">
          <EntityLabel entity="goal" />
          <StatusBadge status={data.status} />
        </div>
        <h1 className="page-title mt-3 wrap-break-word">{data.title}</h1>
        <p className="meaning-line mt-2">{data.desiredOutcome}</p>
      </header>

      <div className="progress-card entity-goal mt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {work && <ProgressBar large done={Number(work.work.doneTaskCount)} total={Number(work.work.taskCount)} />}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <TargetNote date={data.targetDate} today={today} />
            {active && <ReviewNote date={data.reviewDate} today={today} />}
          </div>
        </div>
      </div>

      {work && (
        <section className="card mt-5 p-4 sm:p-5" aria-labelledby="goal-under">
          <h2 className="font-extrabold" id="goal-under">زیر این هدف</h2>
          <ul className="divide-y divide-border-subtle">
            <UnderRow entity="project" count={Number(work.activeProjectCount)} label="پروژه" detail={underProjects.map(project => project.title).join('، ')} to="/projects" linkLabel="در پروژه‌ها" />
            <UnderRow
              entity="task"
              count={Number(work.work.openTaskCount)}
              label="کار باز"
              detail={`${formatNumber(Number(work.work.todayTaskCount))} تا برای امروز، ${formatNumber(Number(work.work.waitingTaskCount))} منتظر کار پیشین`}
              to="/tasks"
              linkLabel="در کارها"
            />
            <UnderRow entity="routine" count={Number(work.work.activeRoutineCount)} label="روتین" detail={work.work.routineTitles.join('، ')} to="/routines" linkLabel="در روتین‌ها" />
          </ul>
        </section>
      )}

      <ContinuationOffers today={today} scopeId={data.id} className="mt-5" />
      {work && work.work.nextTasks.length > 0 && (
        <section className="card mt-5 p-4 sm:p-5" aria-labelledby="goal-next">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold" id="goal-next">قدم‌های بعدی</h2>
            <Link className="text-xs font-extrabold text-entity-task hover:underline" to="/tasks">همه‌ی کارها</Link>
          </div>
          <NextSteps
            tasks={work.work.nextTasks.slice(0, 3)}
            today={today}
            projectTitle={projectId => projects.data?.items.find(project => project.id === projectId)?.title}
          />
        </section>
      )}

      {active && <PlanningFactsSection scope={{ goalId }} />}

      <div className="mt-4 space-y-3">
        <FormError error={terminal.previewError} />
        <FormError error={terminal.terminalError} />
      </div>

      {active && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            className="positive-button"
            type="button"
            disabled={terminal.previewPending}
            onClick={() => terminal.requestPreview({ status: 'ACHIEVED', version })}
          >
            <CircleCheck size={20} aria-hidden="true" />
            {terminal.previewPending ? 'در حال آماده‌سازی…' : 'به این هدف رسیدم'}
          </button>
          <button
            className="ghost-button text-attention"
            type="button"
            disabled={terminal.previewPending}
            onClick={() => terminal.requestPreview({ status: 'ABANDONED', version })}
          >
            رها کردن هدف
          </button>
        </div>
      )}

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
          goalTitle={data.title}
          preview={terminal.preview}
          pending={terminal.terminalPending}
          onCancel={terminal.cancel}
          onConfirm={terminal.confirm}
        />
      )}
    </div>
  )
}
