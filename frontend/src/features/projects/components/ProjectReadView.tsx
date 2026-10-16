import { Link } from '@tanstack/react-router'
import { ChevronLeft, CircleCheck, Pencil, Plus, Target } from '../../../shared/ui/icons'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatNumber, toIsoDate } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { BackLink } from '../../../shared/ui/PageHeader'
import { Sheet } from '../../../shared/ui/Sheet'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { PlanningFactsSection } from '../../planning/components/PlanningFactsSection'
import { NextSteps, UnderRow } from '../../structure/components/NextSteps'
import { ProgressBar, ReviewNote, TargetNote } from '../../structure/components/ProgressFacts'
import { useProgress } from '../../structure/hooks/progress-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import { useProject, useProjectTerminal, useUpdateProject } from '../hooks/project-hooks'
import type { UpdateProjectRequest } from '../types/project.types'
import { ProjectForm } from './ProjectForm'
import { ProjectTerminalDialog } from './ProjectTerminalDialog'
import { ContinuationOffers } from '../../planning/components/ContinuationOffer'

/**
 * Project detail page: what finishing it means, its Goal, how far it has
 * come, its next Tasks (and a new one made in it), what is under it, and the
 * explicit complete/stop flow at the foot. Editing is the pencil at the top.
 */
export function ProjectReadView({ projectId }: { projectId: string }) {
  const project = useProject(projectId)
  const goals = useGoalOptions()
  const update = useUpdateProject(projectId)
  const terminal = useProjectTerminal(projectId)
  const [editing, setEditing] = useState(false)
  const progress = useProgress()
  const openCreate = useUiStore(state => state.openCreate)
  // The server's local date when it is known; the browser's until then (the pilot runs in one time zone).
  const today = useToday().data?.localDate ?? toIsoDate(new Date())

  if (project.isPending) {
    return <div className="page"><BackLink to="/projects" /><LoadingState text="در حال دریافت پروژه…" /></div>
  }
  if (project.isError) {
    const notFound = toApiError(project.error).status === 404
    return (
      <div className="page">
        <BackLink to="/projects" />
        <ErrorState
          title={notFound ? 'پروژه پیدا نشد.' : 'دریافت پروژه ممکن نشد.'}
          description={notFound ? 'ممکن است این پروژه وجود نداشته باشد یا در دسترس شما نباشد.' : 'ارتباط را بررسی کنید و دوباره تلاش کنید.'}
          onRetry={notFound ? undefined : () => project.refetch()}
        />
      </div>
    )
  }

  const data = project.data
  const version = Number(data.version)
  const active = data.status === 'ACTIVE'
  const work = progress.data?.projects.find(item => item.projectId === projectId)?.work
  const goal = goals.data?.items.find(item => item.id === data.goalId)
  return (
    <div className="page pb-10">
      <BackLink
        to="/projects"
        actions={active && (
          <button className="account-button" type="button" aria-label="ویرایش پروژه" onClick={() => setEditing(true)}>
            <Pencil size={20} aria-hidden="true" />
          </button>
        )}
      />

      <header className="entity-project">
        <div className="flex flex-wrap items-center gap-2">
          <EntityLabel entity="project" />
          <StatusBadge status={data.status} />
        </div>
        <h1 className="page-title mt-3 wrap-break-word">{data.title}</h1>
        {data.completionMeaning
          ? <p className="meaning-line mt-2"><b className="text-text-primary">تمام یعنی:</b> {data.completionMeaning}</p>
          : <p className="mt-2 text-sm text-text-secondary">معنای تکمیل برای این پروژه ثبت نشده است.</p>}
        {data.goalId && (
          <Link className="parent-chip entity-goal mt-3" to="/goals/$goalId" params={{ goalId: data.goalId }}>
            <span className="goal-tile size-7 rounded-lg" aria-hidden="true"><Target size={15} /></span>
            <span className="sr-only">هدف: </span>
            <span className="truncate">{goal?.title ?? 'مشاهده هدف'}</span>
            <ChevronLeft size={16} className="shrink-0 opacity-70" aria-hidden="true" />
          </Link>
        )}
      </header>

      <div className="progress-card entity-project mt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {work && <ProgressBar large done={Number(work.doneTaskCount)} total={Number(work.taskCount)} />}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <TargetNote date={data.targetDate} today={today} />
            {active && <ReviewNote date={data.reviewDate} today={today} />}
          </div>
        </div>
      </div>

      <ContinuationOffers today={today} scopeId={data.id} className="mt-5" />
      {work && (active || work.nextTasks.length > 0) && (
        <section className="card mt-5 p-4 sm:p-5" aria-labelledby="project-next">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold" id="project-next">کارهای بعدی</h2>
            {Number(work.openTaskCount) > 0 && (
              <Link className="text-xs font-extrabold text-entity-task hover:underline" to="/tasks">همه‌ی {formatNumber(Number(work.openTaskCount))} کار</Link>
            )}
          </div>
          {work.nextTasks.length > 0
            ? <NextSteps tasks={work.nextTasks} today={today} />
            : <p className="mt-2 text-sm text-text-secondary">کار بازی در این پروژه نیست.</p>}
          {active && (
            <button className="add-row mt-3" type="button" onClick={() => openCreate('task', `project:${projectId}`)}>
              <Plus size={18} aria-hidden="true" />
              کار جدید در این پروژه
            </button>
          )}
        </section>
      )}

      {work && (
        <section className="card mt-5 p-4 sm:p-5" aria-labelledby="project-under">
          <h2 className="font-extrabold" id="project-under">زیر این پروژه</h2>
          <ul className="divide-y divide-border-subtle">
            <UnderRow
              entity="task"
              count={Number(work.openTaskCount)}
              label="کار باز"
              detail={`${formatNumber(Number(work.todayTaskCount))} برای امروز، ${formatNumber(Number(work.waitingTaskCount))} منتظر کار پیشین`}
              to="/tasks"
              linkLabel="در کارها"
            />
            <UnderRow entity="routine" count={Number(work.activeRoutineCount)} label="روتین" detail={work.routineTitles.join('، ')} to="/routines" linkLabel="در روتین‌ها" />
          </ul>
        </section>
      )}

      {active && <PlanningFactsSection scope={{ projectId }} ownsFacts={!data.goalId} />}

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
            onClick={() => terminal.requestPreview({ status: 'COMPLETED', version })}
          >
            <CircleCheck size={20} aria-hidden="true" />
            {terminal.previewPending ? 'در حال آماده‌سازی…' : 'این پروژه تمام شد'}
          </button>
          <button
            className="ghost-button text-attention"
            type="button"
            disabled={terminal.previewPending}
            onClick={() => terminal.requestPreview({ status: 'STOPPED', version })}
          >
            توقف پروژه
          </button>
        </div>
      )}

      {editing && (
        <Sheet title="ویرایش پروژه" onClose={() => setEditing(false)} locked={update.isPending}>
          <ProjectForm
            project={data}
            goals={goals.data?.items ?? []}
            pending={update.isPending}
            error={update.error}
            onCancel={() => setEditing(false)}
            // ProjectForm's onSubmit covers create and edit; passing `project` guarantees the edit shape.
            onSubmit={request => update.mutate(request as UpdateProjectRequest, {
              onSuccess: () => {
                setEditing(false)
                showToast('تغییرات پروژه ذخیره شد.')
              },
            })}
          />
        </Sheet>
      )}
      {terminal.preview && (
        <ProjectTerminalDialog
          projectTitle={data.title}
          preview={terminal.preview}
          pending={terminal.terminalPending}
          onCancel={terminal.cancel}
          onConfirm={terminal.confirm}
        />
      )}
    </div>
  )
}
