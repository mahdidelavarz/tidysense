import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLocalDate } from '../../../shared/lib/date'
import { DetailTerm } from '../../../shared/ui/DetailTerm'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import type { UpdateTaskRequest } from '../types/task.types'
import { BlockedByList } from './BlockedByList'
import { TaskActiveActions, TaskRestoreAction } from './TaskActions'
import { TaskForm } from './TaskForm'
import { useDropTask, useRestoreTask, useTask, useUpdateTask } from '../hooks/task-hooks'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'

/** Task detail page: read, edit, drop/restore, and the same-sequence blocker context. */
export function TaskDetailView({ taskId }: { taskId: string }) {
  const task = useTask(taskId)
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const update = useUpdateTask(taskId)
  const drop = useDropTask(taskId)
  const restore = useRestoreTask(taskId)
  const [editing, setEditing] = useState(false)
  const [confirmDrop, setConfirmDrop] = useState(false)

  if (task.isPending) return <div className="page-container-narrow"><LoadingState text="در حال دریافت کار…" /></div>
  if (task.isError) {
    const api = toApiError(task.error)
    return (
      <div className="page-container-narrow">
        <ErrorState
          title={api.status === 404 ? 'کار پیدا نشد.' : 'دریافت کار ممکن نشد.'}
          description={api.status === 404 ? 'این کار وجود ندارد یا در دسترس شما نیست.' : 'ارتباط را بررسی کنید و دوباره تلاش کنید.'}
          onRetry={api.status === 404 ? undefined : () => task.refetch()}
        />
      </div>
    )
  }

  const data = task.data
  return (
    <div className="page-container-narrow space-y-6">
      <Link className="text-link inline-flex min-h-11 items-center" to="/tasks">بازگشت به کارها</Link>
      <article className="page-header entity-surface entity-task">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <EntityLabel entity="task" />
            <h1 className="mt-2 break-words text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{data.title}</h1>
          </div>
          <StatusBadge status={data.status} />
        </div>
        {data.description
          ? <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-text-secondary sm:text-base">{data.description}</p>
          : <p className="mt-5 text-sm text-text-tertiary">توضیحی برای این کار ثبت نشده است.</p>}
        <dl className="mt-6 grid gap-4 border-t border-border-subtle pt-5 text-sm sm:grid-cols-2">
          <DetailTerm label="وابستگی" value={ownerLabel(data)} />
          <DetailTerm label="تاریخ برنامه‌ریزی" value={formatLocalDate(data.plannedDate)} dateTime={data.plannedDate} />
          <DetailTerm label="مهلت" value={formatLocalDate(data.deadline)} dateTime={data.deadline} />
        </dl>
        {data.sequenceId && (
          <div className="mt-5 rounded-lg bg-surface-sunken p-4 text-sm text-text-secondary">
            <p className="font-bold text-text-primary">دنباله · ترتیب {data.sequenceOrder}</p>
            {data.isBlocked
              ? <p className="mt-1">این کار تا تکمیل کارهای پیشین قابل انجام نیست.</p>
              : <p className="mt-1">همه پیش‌نیازهای این کار تکمیل شده‌اند.</p>}
            <BlockedByList blockers={data.blockedBy} />
          </div>
        )}
      </article>

      {data.status === 'ACTIVE'
        ? (
          <TaskActiveActions
            editing={editing}
            dropPending={drop.isPending}
            onToggleEdit={() => setEditing(value => !value)}
            onDrop={() => setConfirmDrop(true)}
          />
        )
        : (
          <TaskRestoreAction
            pending={restore.isPending}
            onRestore={() => restore.mutate({ expectedVersion: Number(data.version), plannedDate: data.plannedDate })}
          />
        )}

      {editing && (
        <TaskForm
          task={data}
          goals={goals.data?.items ?? []}
          projects={projects.data?.items ?? []}
          pending={update.isPending}
          error={update.error}
          // TaskForm's onSubmit type covers both create and edit; passing
          // `task` guarantees the edit (UpdateTaskRequest) branch here.
          onSubmit={request => update.mutate(request as UpdateTaskRequest, { onSuccess: () => setEditing(false) })}
        />
      )}
      <FormError error={drop.error ?? restore.error} />
      {confirmDrop && (
        <ConfirmationDialog
          title="کنار گذاشتن کار"
          description="این کار از فهرست کارهای فعال و امروز خارج می‌شود و بعداً می‌توانید آن را بازگردانید."
          onClose={() => setConfirmDrop(false)}
          pending={drop.isPending}
          actions={(
            <>
              <button className="secondary-button" type="button" disabled={drop.isPending} onClick={() => setConfirmDrop(false)}>انصراف</button>
              <button
                className="danger-button"
                type="button"
                disabled={drop.isPending}
                onClick={() => drop.mutate(Number(data.version), { onSuccess: () => setConfirmDrop(false) })}
              >
                {drop.isPending ? 'در حال ثبت…' : 'تأیید کنار گذاشتن'}
              </button>
            </>
          )}
        />
      )}
    </div>
  )
}

function ownerLabel(task: { goalId: string | null; projectId: string | null }) {
  if (task.projectId) return 'وابسته به پروژه'
  if (task.goalId) return 'وابسته به هدف'
  return 'مستقل'
}
