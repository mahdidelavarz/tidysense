import { Link } from '@tanstack/react-router'
import { CalendarClock, CalendarDays, Flag, Link2, Pencil, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLocalDate, formatNumber } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ActionTile } from '../../../shared/ui/ActionTile'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { DetailTerm } from '../../../shared/ui/DetailTerm'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { BackLink } from '../../../shared/ui/PageHeader'
import { Sheet } from '../../../shared/ui/Sheet'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { useCarryTask, useDropTask, useRestoreTask, useTask, useUpdateTask } from '../hooks/task-hooks'
import type { TaskDto, UpdateTaskRequest } from '../types/task.types'
import { BlockedByList } from './BlockedByList'
import { TaskCarrySheet } from './TaskCarrySheet'
import { TaskForm } from './TaskForm'

/** Task detail page: read, edit, carry, drop/restore, and the same-sequence blocker context. */
export function TaskDetailView({ taskId }: { taskId: string }) {
  const task = useTask(taskId)
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const update = useUpdateTask(taskId)
  const carry = useCarryTask(taskId)
  const drop = useDropTask(taskId)
  const restore = useRestoreTask(taskId)
  const [editing, setEditing] = useState(false)
  const [carrying, setCarrying] = useState(false)
  const [confirmDrop, setConfirmDrop] = useState(false)

  if (task.isPending) {
    return <div className="page"><BackLink to="/tasks" /><LoadingState text="در حال دریافت کار…" /></div>
  }
  if (task.isError) {
    const notFound = toApiError(task.error).status === 404
    return (
      <div className="page">
        <BackLink to="/tasks" />
        <ErrorState
          title={notFound ? 'کار پیدا نشد.' : 'دریافت کار ممکن نشد.'}
          description={notFound ? 'این کار وجود ندارد یا در دسترس شما نیست.' : 'ارتباط را بررسی کنید و دوباره تلاش کنید.'}
          onRetry={notFound ? undefined : () => task.refetch()}
        />
      </div>
    )
  }

  const data = task.data
  const version = Number(data.version)
  return (
    <div className="page">
      <BackLink to="/tasks" />

      <article>
        <div className="flex flex-wrap items-center gap-2">
          <EntityLabel entity="task" />
          <StatusBadge status={data.status} />
          {data.isProtected && (
            <span className="status-badge status-neutral">
              <ShieldCheck size={14} aria-hidden="true" />
              محافظت‌شده
            </span>
          )}
        </div>
        <h1 className="page-title mt-3 wrap-break-word">{data.title}</h1>
        {data.description
          ? <p className="mt-3 whitespace-pre-wrap leading-8 text-text-secondary">{data.description}</p>
          : <p className="mt-3 text-sm text-text-tertiary">توضیحی برای این کار ثبت نشده است.</p>}
        <dl className="card mt-6 grid gap-5 sm:grid-cols-2">
          <DetailTerm icon={Link2} label="وابستگی" value={<ParentLink task={data} />} />
          <DetailTerm icon={CalendarDays} label="تاریخ برنامه‌ریزی" value={formatLocalDate(data.plannedDate)} dateTime={data.plannedDate} />
          <DetailTerm icon={Flag} label="مهلت" value={formatLocalDate(data.deadline)} dateTime={data.deadline} />
        </dl>
        {Number(data.carryCount) > 0 && (
          <p className="notice mt-4">تاریخ این کار تاکنون {formatNumber(Number(data.carryCount))} بار پس از سررسید جابه‌جا شده است.</p>
        )}
        {data.sequenceId && data.sequenceOrder != null && (
          <div className="notice mt-4">
            <p className="font-bold text-text-primary">بخشی از یک دنباله (ترتیب {formatNumber(Number(data.sequenceOrder))})</p>
            <p className="mt-1">
              {data.isBlocked ? 'این کار تا تکمیل کارهای پیشین قابل انجام نیست.' : 'همه پیش‌نیازهای این کار تکمیل شده‌اند.'}
            </p>
            <BlockedByList blockers={data.blockedBy} />
          </div>
        )}
      </article>

      {data.status === 'ACTIVE' && (
        <section className="mt-8" aria-labelledby="task-actions">
          <h2 className="section-title" id="task-actions">چه کاری می‌خواهید انجام دهید؟</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ActionTile icon={Pencil} label="ویرایش کار" description="عنوان، توضیحات، وابستگی یا تاریخ‌ها را تغییر دهید." onClick={() => setEditing(true)} />
            {data.plannedDate && (
              <ActionTile
                icon={CalendarClock}
                label="انتقال به تاریخ دیگر"
                description="فقط همین کار جابه‌جا می‌شود؛ کارهای بعدی دنباله سر جای خود می‌مانند."
                onClick={() => setCarrying(true)}
              />
            )}
            <ActionTile
              icon={Trash2}
              tone="attention"
              label="کنار گذاشتن کار"
              description="از فهرست فعال و امروز خارج می‌شود؛ بعداً قابل بازگرداندن است."
              disabled={drop.isPending}
              onClick={() => setConfirmDrop(true)}
            />
          </div>
        </section>
      )}
      {data.status !== 'ACTIVE' && (
        <section className="mt-8" aria-labelledby="task-actions">
          <h2 className="section-title" id="task-actions">چه کاری می‌خواهید انجام دهید؟</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ActionTile
              icon={RotateCcw}
              label={restore.isPending ? 'در حال بازگرداندن…' : 'بازگرداندن به حالت فعال'}
              description="کار با همان وابستگی و تاریخ برنامه‌ریزی دوباره فعال می‌شود."
              disabled={restore.isPending}
              onClick={() => restore.mutate({ expectedVersion: version, plannedDate: data.plannedDate }, {
                onSuccess: () => showToast('کار دوباره فعال شد.'),
              })}
            />
          </div>
        </section>
      )}

      <div className="mt-4">
        <FormError error={drop.error ?? restore.error} />
      </div>

      {editing && (
        <Sheet title="ویرایش کار" onClose={() => setEditing(false)} locked={update.isPending}>
          <TaskForm
            task={data}
            goals={goals.data?.items ?? []}
            projects={projects.data?.items ?? []}
            pending={update.isPending}
            error={update.error}
            onCancel={() => setEditing(false)}
            // TaskForm's onSubmit covers create and edit; passing `task` guarantees the edit shape.
            onSubmit={request => update.mutate(request as UpdateTaskRequest, {
              onSuccess: () => {
                setEditing(false)
                showToast('تغییرات کار ذخیره شد.')
              },
            })}
          />
        </Sheet>
      )}
      {carrying && data.plannedDate && (
        <TaskCarrySheet
          currentDate={data.plannedDate}
          deadline={data.deadline}
          pending={carry.isPending}
          error={carry.error}
          onClose={() => setCarrying(false)}
          onSubmit={plannedDate => carry.mutate({ expectedVersion: version, plannedDate }, {
            onSuccess: () => {
              setCarrying(false)
              showToast('کار به تاریخ جدید منتقل شد.')
            },
          })}
        />
      )}
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
                onClick={() => drop.mutate(version, {
                  onSuccess: () => {
                    setConfirmDrop(false)
                    showToast('کار کنار گذاشته شد.')
                  },
                })}
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

/** Names the Task's parent and links to it, so the user can move up the hierarchy. */
function ParentLink({ task }: { task: TaskDto }) {
  if (task.projectId) {
    return <Link className="text-link" to="/projects/$projectId" params={{ projectId: task.projectId }}>مشاهده پروژه</Link>
  }
  if (task.goalId) {
    return <Link className="text-link" to="/goals/$goalId" params={{ goalId: task.goalId }}>مشاهده هدف</Link>
  }
  return 'کار مستقل'
}
