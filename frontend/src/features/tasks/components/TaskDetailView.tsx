import { Link } from '@tanstack/react-router'
import {
  CalendarClock, CalendarDays, Check, ChevronLeft, CircleCheck, CircleDashed, CircleSlash, Flag, FolderKanban, History,
  ListOrdered, LoaderCircle, Lock, Pencil, RotateCcw, ShieldCheck, StickyNote, Target, Trash2,
} from '../../../shared/ui/icons'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLongDate, formatNumber, parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { FactRow } from '../../../shared/ui/FactRow'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { BackLink } from '../../../shared/ui/PageHeader'
import { Sheet } from '../../../shared/ui/Sheet'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import {
  useCarryTask, useCompleteTask, useDropTask, useRestoreTask, useTask, useTaskOptions, useTaskParentTitle, useUpdateTask,
} from '../hooks/task-hooks'
import type { TaskDto, UpdateTaskRequest } from '../types/task.types'
import { TaskCarrySheet } from './TaskCarrySheet'
import { TaskForm } from './TaskForm'

/**
 * Task detail page: the Task with its owner, one big action to complete it
 * and one to move it, its facts, its place in a sequence and its notes.
 * Editing is the pencil at the top; dropping (or restoring) is at the foot.
 */
export function TaskDetailView({ taskId }: { taskId: string }) {
  const task = useTask(taskId)
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const update = useUpdateTask(taskId)
  const carry = useCarryTask(taskId)
  const drop = useDropTask(taskId)
  const restore = useRestoreTask(taskId)
  const complete = useCompleteTask()
  const parentTitle = useTaskParentTitle()
  // The server's local date when it is known; the browser's until then (the pilot runs in one time zone).
  const today = useToday().data?.localDate ?? toIsoDate(new Date())
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
  const active = data.status === 'ACTIVE'
  const carried = Number(data.carryCount)
  return (
    <div className="page">
      <BackLink
        to="/tasks"
        actions={active && (
          <button className="account-button" type="button" aria-label="ویرایش کار" onClick={() => setEditing(true)}>
            <Pencil size={20} aria-hidden="true" />
          </button>
        )}
      />

      <header className="entity-task">
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
        <div className="mt-3"><ParentChip task={data} title={parentTitle(data)} /></div>
      </header>

      {active ? (
        <div className="mt-6 flex gap-3">
          <button
            className="complete-button flex-1"
            type="button"
            disabled={data.isBlocked || complete.isPending}
            onClick={() => complete.mutate(
              { taskId: data.id, expectedVersion: version, completedForLocalDate: today },
              { onSuccess: () => showToast('کار انجام شد.') },
            )}
          >
            {complete.isPending ? <LoaderCircle size={22} className="animate-spin" aria-hidden="true" /> : <CircleCheck size={22} aria-hidden="true" />}
            انجام شد
          </button>
          {data.plannedDate && (
            <button className="secondary-button min-h-14 rounded-[1.25rem] px-4" type="button" onClick={() => setCarrying(true)}>
              <CalendarClock size={20} aria-hidden="true" />
              جابه‌جایی
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <button
            className="secondary-button min-h-14 w-full rounded-[1.25rem]"
            type="button"
            disabled={restore.isPending}
            onClick={() => restore.mutate({ expectedVersion: version, plannedDate: data.plannedDate }, {
              onSuccess: () => showToast('کار دوباره فعال شد.'),
            })}
          >
            <RotateCcw size={20} aria-hidden="true" />
            {restore.isPending ? 'در حال بازگرداندن…' : 'بازگرداندن به حالت فعال'}
          </button>
        </div>
      )}
      {active && data.isBlocked && (
        <p className="mt-2 text-xs text-text-secondary">تا کارهای پیشینِ این دنباله انجام نشوند، این کار قابل انجام نیست.</p>
      )}

      <dl className="fact-list mt-5">
        <FactRow
          icon={CalendarDays}
          label="برای کی"
          value={data.plannedDate === today ? 'امروز' : data.plannedDate ? shortDate(data.plannedDate) : 'هر وقت فرصت شد'}
          sub={data.plannedDate ? formatLongDate(data.plannedDate) : undefined}
          dateTime={data.plannedDate}
        />
        {data.deadline && (
          <FactRow
            icon={Flag}
            label="مهلت"
            value={shortDate(data.deadline)}
            sub={active ? deadlineWords(data.deadline, today) : undefined}
            dateTime={data.deadline}
            tone={active && daysBetween(today, data.deadline) <= 3 ? 'caution' : undefined}
          />
        )}
        {carried > 0 && (
          <FactRow icon={History} label="جابه‌جایی" value={carried === 1 ? 'یک بار' : `${formatNumber(carried)} بار`} sub="پس از سررسید" />
        )}
      </dl>

      {data.sequenceId && <SequenceCard task={data} />}

      <section className="card mt-5" aria-labelledby="task-description">
        <h2 className="flex items-center gap-2 font-extrabold" id="task-description">
          <StickyNote size={18} className="text-text-secondary" aria-hidden="true" />
          توضیحات
        </h2>
        {data.description
          ? <p className="mt-2 whitespace-pre-wrap leading-8 text-text-secondary">{data.description}</p>
          : <p className="mt-2 text-sm text-text-tertiary">توضیحی برای این کار ثبت نشده است.</p>}
      </section>

      {active && (
        <div className="mt-6 flex justify-center">
          <button className="ghost-button text-attention" type="button" disabled={drop.isPending} onClick={() => setConfirmDrop(true)}>
            <Trash2 size={18} aria-hidden="true" />
            کنار گذاشتن این کار
          </button>
        </div>
      )}

      <div className="mt-4">
        <FormError error={complete.error ?? drop.error ?? restore.error} />
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
          taskTitle={data.title}
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

/** The Task's owner as a chip that links to it, or «مستقل» when it has none. */
function ParentChip({ task, title }: { task: TaskDto; title?: string }) {
  const inner = (Icon: typeof Target, label: string) => (
    <>
      <span className="entity-icon size-7 rounded-lg" aria-hidden="true"><Icon size={16} /></span>
      <span className="sr-only">{label}: </span>
      <span className="truncate">{title ?? label}</span>
      <ChevronLeft size={16} className="shrink-0 opacity-70" aria-hidden="true" />
    </>
  )
  if (task.projectId) {
    return (
      <Link className="parent-chip entity-project" to="/projects/$projectId" params={{ projectId: task.projectId }}>
        {inner(FolderKanban, 'پروژه')}
      </Link>
    )
  }
  if (task.goalId) {
    return <Link className="parent-chip entity-goal" to="/goals/$goalId" params={{ goalId: task.goalId }}>{inner(Target, 'هدف')}</Link>
  }
  return (
    <span className="parent-chip">
      <span className="entity-icon size-7 rounded-lg" aria-hidden="true"><CircleDashed size={16} /></span>
      کار مستقل
    </span>
  )
}

const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' })
const shortDate = (iso: string) => dayMonth.format(parseIsoDate(iso))
const daysBetween = (from: string, to: string) => Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000)

/** How far a deadline is from today, in words. */
function deadlineWords(deadline: string, today: string) {
  const days = daysBetween(today, deadline)
  if (days < 0) return 'گذشته است'
  if (days === 0) return 'امروز'
  return `${formatNumber(days)} روز مانده`
}

/**
 * Where the Task stands in its sequence: every step in order, done or
 * waiting, with this one marked, and what finishing it unlocks.
 */
function SequenceCard({ task }: { task: TaskDto }) {
  const options = useTaskOptions()
  const steps = (options.data?.items ?? [])
    .filter(item => item.sequenceId === task.sequenceId)
    .sort((a, b) => Number(a.sequenceOrder ?? 0) - Number(b.sequenceOrder ?? 0))
  if (steps.length === 0) return null
  const position = steps.findIndex(step => step.id === task.id)
  const next = steps.slice(position + 1).find(step => step.status === 'ACTIVE')
  return (
    <section className="card mt-5" aria-labelledby="task-sequence">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-extrabold" id="task-sequence">
          <ListOrdered size={18} className="text-text-secondary" aria-hidden="true" />
          ترتیب انجام
        </h2>
        {position >= 0 && (
          <span className="text-xs font-bold text-text-secondary">مرحله‌ی {formatNumber(position + 1)} از {formatNumber(steps.length)}</span>
        )}
      </div>
      <ol className="timeline mt-2">
        {steps.map((step, index) => {
          const self = step.id === task.id
          const state = step.status === 'COMPLETED' ? 'done' : step.status === 'DROPPED' ? 'dropped' : self ? 'self' : 'waiting'
          return (
            <li key={step.id} className="timeline-row pb-1">
              <div className="timeline-node">
                <span className="timeline-mark mt-1.5">
                  {state === 'done' && <span className="ring-done" role="img" aria-label="تکمیل‌شده"><Check size={14} /></span>}
                  {state === 'dropped' && <span className="ring-lock" role="img" aria-label="کنار گذاشته‌شده"><CircleSlash size={13} /></span>}
                  {state === 'self' && <span className="size-6 rounded-full border-2 border-entity-task bg-surface" aria-hidden="true" />}
                  {state === 'waiting' && <span className="ring-lock" role="img" aria-label="منتظر"><Lock size={12} /></span>}
                </span>
              </div>
              <div className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 pt-1.5">
                {self ? (
                  <span className="truncate font-extrabold" aria-current="step">{step.title}</span>
                ) : (
                  <Link
                    className={`truncate font-semibold hover:underline ${state === 'done' ? 'text-text-secondary line-through' : 'text-text-secondary'}`}
                    to="/tasks/$taskId"
                    params={{ taskId: step.id }}
                  >
                    {step.title}
                  </Link>
                )}
                <span className={`shrink-0 text-xs font-bold ${self ? 'text-entity-task' : 'text-text-secondary'}`}>
                  {self ? 'همین کار' : formatNumber(index + 1)}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      {task.status === 'ACTIVE' && (
        <p className="notice mt-3">
          {task.isBlocked
            ? `منتظر ${task.blockedBy.map(blocker => `«${blocker.title}»`).join('، ')} است.`
            : next ? `پیش‌نیازها انجام شده‌اند. با انجام این کار، «${next.title}» باز می‌شود.` : 'این آخرین مرحله‌ی این ترتیب است.'}
        </p>
      )}
    </section>
  )
}
