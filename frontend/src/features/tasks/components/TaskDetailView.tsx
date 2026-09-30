import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import type { components } from '../../../shared/api/generated'
import { toApiError } from '../../../shared/api/http'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { listGoals } from '../../goals/services/goals-api'
import { formatDate, goalKeys, projectKeys } from '../../parents/components/ParentDashboard'
import { listProjects } from '../../projects/services/projects-api'
import { TaskForm } from './TaskForm'
import {
  dropTask,
  getTask,
  restoreTask,
  taskKeys,
  todayKey,
  updateTask,
} from '../services/tasks-api'

type UpdateTaskRequest = components['schemas']['UpdateTaskRequest']

export function TaskDetailView({ taskId }: { taskId: string }) {
  const client = useQueryClient()
  const task = useQuery({ queryKey: taskKeys.detail(taskId), queryFn: () => getTask(taskId) })
  const goals = useQuery({ queryKey: goalKeys.options, queryFn: () => listGoals(undefined, undefined, 100) })
  const projects = useQuery({ queryKey: projectKeys.all, queryFn: () => listProjects(undefined, undefined, 100) })
  const [editing, setEditing] = useState(false)
  const [confirmDrop, setConfirmDrop] = useState(false)
  const closeDrop = useCallback(() => setConfirmDrop(false), [])
  const sync = async (data: components['schemas']['TaskDto']) => {
    client.setQueryData(taskKeys.detail(taskId), data)
    await Promise.all([
      client.invalidateQueries({ queryKey: taskKeys.list }),
      client.invalidateQueries({ queryKey: taskKeys.options }),
      client.invalidateQueries({ queryKey: todayKey }),
    ])
  }
  const update = useMutation({
    mutationFn: (request: UpdateTaskRequest) => updateTask(taskId, request),
    onSuccess: async data => {
      setEditing(false)
      await sync(data)
    },
  })
  const drop = useMutation({
    mutationFn: (version: number) => dropTask(taskId, version),
    onSuccess: async data => {
      setConfirmDrop(false)
      await sync(data)
    },
  })
  const restore = useMutation({
    mutationFn: ({ version, plannedDate }: { version: number; plannedDate: string | null }) =>
      restoreTask(taskId, version, plannedDate),
    onSuccess: sync,
  })

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
          <DetailTerm label="تاریخ برنامه‌ریزی" value={formatDate(data.plannedDate)} dateTime={data.plannedDate} />
          <DetailTerm label="مهلت" value={formatDate(data.deadline)} dateTime={data.deadline} />
          <DetailTerm label="نسخه" value={String(data.version)} />
        </dl>
        {data.sequenceId && (
          <div className="mt-5 rounded-lg bg-surface-sunken p-4 text-sm text-text-secondary">
            <p className="font-bold text-text-primary">دنباله · ترتیب {data.sequenceOrder}</p>
            {data.isBlocked
              ? <p className="mt-1">این کار تا تکمیل کارهای پیشین قابل انجام نیست.</p>
              : <p className="mt-1">همه پیش‌نیازهای این کار تکمیل شده‌اند.</p>}
            {data.blockedBy.length > 0 && (
              <ul className="mt-2 list-inside list-disc">
                {data.blockedBy.map(blocker => <li key={blocker.id}>{blocker.title}</li>)}
              </ul>
            )}
          </div>
        )}
      </article>

      {data.status === 'ACTIVE' ? (
        <section className="surface-card" aria-label="عملیات کار">
          <p className="mb-4 text-sm font-bold text-text-secondary">عملیات کار</p>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button className="secondary-button" type="button" onClick={() => setEditing(value => !value)}>
              {editing ? 'انصراف از ویرایش' : 'ویرایش کار'}
            </button>
            <button className="danger-button" type="button" onClick={() => setConfirmDrop(true)}>کنار گذاشتن کار</button>
          </div>
        </section>
      ) : (
        <section className="surface-card">
          <h2 className="font-bold">بازگرداندن کار</h2>
          <p className="mt-1 text-sm text-text-secondary">کار با همان وابستگی و تاریخ برنامه‌ریزی دوباره فعال می‌شود.</p>
          <button
            className="secondary-button mt-4"
            type="button"
            disabled={restore.isPending}
            onClick={() => restore.mutate({ version: Number(data.version), plannedDate: data.plannedDate })}
          >
            {restore.isPending ? 'در حال بازگرداندن…' : 'بازگرداندن به حالت فعال'}
          </button>
        </section>
      )}

      {editing && (
        <TaskForm
          task={data}
          goals={goals.data?.items ?? []}
          projects={projects.data?.items ?? []}
          pending={update.isPending}
          error={update.error}
          onSubmit={request => update.mutate(request as UpdateTaskRequest)}
        />
      )}
      <FormError error={drop.error ?? restore.error} />
      {confirmDrop && (
        <ConfirmationDialog
          title="کنار گذاشتن کار"
          description="این کار از فهرست کارهای فعال و امروز خارج می‌شود و بعداً می‌توانید آن را بازگردانید."
          onClose={closeDrop}
          pending={drop.isPending}
          actions={(
            <>
              <button className="secondary-button" type="button" disabled={drop.isPending} onClick={closeDrop}>انصراف</button>
              <button className="danger-button" type="button" disabled={drop.isPending} onClick={() => drop.mutate(Number(data.version))}>
                {drop.isPending ? 'در حال ثبت…' : 'تأیید کنار گذاشتن'}
              </button>
            </>
          )}
        />
      )}
    </div>
  )
}

function DetailTerm({ label, value, dateTime }: { label: string; value: string; dateTime?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold text-text-secondary">{label}</dt>
      <dd className="mt-1 font-medium">{dateTime ? <time dateTime={dateTime}>{value}</time> : value}</dd>
    </div>
  )
}

function ownerLabel(task: components['schemas']['TaskDto']) {
  if (task.projectId) return 'وابسته به پروژه'
  if (task.goalId) return 'وابسته به هدف'
  return 'مستقل'
}
