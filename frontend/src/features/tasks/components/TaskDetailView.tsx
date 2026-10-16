import { Link } from '@tanstack/react-router'
import {
  CalendarClock, CalendarDays, Check, ChevronLeft, CircleCheck, CircleDashed, CircleSlash, Flag, FolderKanban, History,
  ListOrdered, LoaderCircle, Lock, Pencil, Reorder, RotateCcw, ShieldCheck, StickyNote, Target, Trash2,
} from '../../../shared/ui/icons'
import { useRef, useState } from 'react'
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
  useCarryTask, useCompleteTask, useDropTask, useRestoreTask, useTask, useTaskOptions, useTaskParentTitle, useUndoCompleteTask,
  useUpdateTask,
} from '../hooks/task-hooks'
import type { TaskDto, TaskSequenceAction, UpdateTaskRequest } from '../types/task.types'
import { TaskCarrySheet } from './TaskCarrySheet'
import { TaskForm } from './TaskForm'
import { TaskSequenceSheet, followCandidates } from './TaskSequenceSheet'

/**
 * Task detail page: the Task with its owner, one big action to complete it
 * and one to move it, its facts, its place in a sequence and its notes.
 * Editing is the pencil at the top; dropping (or restoring) is at the foot.
 */
export function TaskDetailView({ taskId, panel = false }: { taskId: string; panel?: boolean }) {
  const root = panel ? 'desk-detail-body' : 'page'
  const task = useTask(taskId)
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const update = useUpdateTask(taskId)
  const carry = useCarryTask(taskId)
  const drop = useDropTask(taskId)
  const restore = useRestoreTask(taskId)
  const complete = useCompleteTask()
  const undo = useUndoCompleteTask()
  const parentTitle = useTaskParentTitle()
  // The server's local date when it is known; the browser's until then (the pilot runs in one time zone).
  const today = useToday().data?.localDate ?? toIsoDate(new Date())
  const [editing, setEditing] = useState(false)
  const [carrying, setCarrying] = useState(false)
  const [confirmDrop, setConfirmDrop] = useState(false)
  // A change to a place in the sequence; `step` is the one dragged when it is not this Task.
  const [sequencing, setSequencing] = useState<{ action: TaskSequenceAction; step?: TaskDto; after?: TaskDto | null } | null>(null)

  if (task.isPending) {
    return <div className={root}><BackLink to="/tasks" /><LoadingState text="در حال دریافت کار…" /></div>
  }
  if (task.isError) {
    const notFound = toApiError(task.error).status === 404
    return (
      <div className={root}>
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
    <div className={root}>
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
      ) : data.status === 'COMPLETED' ? (
        // Undoing the tick puts it back exactly as it was; a later step already done keeps it done (025 §16 note).
        <div className="mt-6">
          <button
            className="secondary-button min-h-14 w-full rounded-[1.25rem]"
            type="button"
            disabled={undo.isPending}
            onClick={() => undo.mutate({ taskId: data.id, expectedVersion: version }, {
              onSuccess: () => showToast('کار به کارهای باز برگشت.'),
            })}
          >
            <RotateCcw size={20} aria-hidden="true" />
            {undo.isPending ? 'در حال بازگرداندن…' : 'لغو انجام'}
          </button>
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

      {data.sequenceId
        ? (
          <SequenceCard
            task={data}
            onAction={action => setSequencing({ action })}
            onDrop={(step, after) => setSequencing({ action: 'MOVE_TO', step, after })}
          />
        )
        : active && <NoSequenceCard task={data} onFollow={() => setSequencing({ action: 'FOLLOW' })} />}
      {sequencing && (
        <TaskSequenceSheet
          task={sequencing.step ?? data}
          action={sequencing.action}
          after={sequencing.after}
          onClose={() => setSequencing(null)}
        />
      )}

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
        <FormError error={complete.error ?? undo.error ?? drop.error ?? restore.error} />
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
/**
 * The sequence with this step marked. A step of the unresolved part can be
 * dragged by its grip to another place; the drop only proposes it, opening the
 * same preview as «زودتر» and «دیرتر», and nothing changes until «تأیید»
 * (025 §16). The buttons are the same move without dragging.
 */
function SequenceCard({ task, onAction, onDrop }: {
  task: TaskDto
  onAction: (action: TaskSequenceAction) => void
  /** A step dropped in a new place: the step it now follows, or null for the first. */
  onDrop: (step: TaskDto, after: TaskDto | null) => void
}) {
  const options = useTaskOptions()
  const rows = useRef(new Map<string, HTMLLIElement>())
  const [drag, setDrag] = useState<{ from: number; to: number; middles: number[] } | null>(null)
  const steps = (options.data?.items ?? [])
    .filter(item => item.sequenceId === task.sequenceId)
    .sort((a, b) => Number(a.sequenceOrder ?? 0) - Number(b.sequenceOrder ?? 0))
  if (steps.length === 0) return null
  const position = steps.findIndex(step => step.id === task.id)
  const next = steps.slice(position + 1).find(step => step.status === 'ACTIVE')
  // Only the unresolved part moves, never above a done step, and not while a dropped step waits for Reconcile.
  const doneCount = steps.findIndex(step => step.status !== 'COMPLETED')
  const movable = !steps.some(step => step.status === 'DROPPED') && steps.filter(step => step.status === 'ACTIVE').length >= 2
  const shown = drag ? moved(steps, drag.from, drag.to) : steps

  function start(event: React.PointerEvent<HTMLElement>, index: number) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const middles = steps.map(step => {
      const box = rows.current.get(step.id)?.getBoundingClientRect()
      return box ? box.top + box.height / 2 : 0
    })
    setDrag({ from: index, to: index, middles })
  }
  function follow(event: React.PointerEvent<HTMLElement>) {
    if (!drag) return
    const above = drag.middles.filter((middle, index) => index !== drag.from && middle < event.clientY).length
    const to = Math.min(steps.length - 1, Math.max(doneCount, above))
    if (to !== drag.to) setDrag({ ...drag, to })
  }
  function drop() {
    if (!drag) return
    setDrag(null)
    if (drag.from === drag.to) return
    const order = moved(steps, drag.from, drag.to)
    onDrop(order[drag.to], drag.to > 0 ? order[drag.to - 1] : null)
  }
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
        {shown.map((step, index) => {
          const self = step.id === task.id
          const state = step.status === 'COMPLETED' ? 'done' : step.status === 'DROPPED' ? 'dropped' : self ? 'self' : 'waiting'
          const dragged = drag !== null && index === drag.to
          return (
            <li
              key={step.id}
              ref={row => { if (row) rows.current.set(step.id, row); else rows.current.delete(step.id) }}
              className={`timeline-row pb-1 ${dragged ? 'rounded-xl bg-entity-task/10 shadow-md' : ''}`}
            >
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
                {movable && step.status === 'ACTIVE' && (
                  // Pointer only: «زودتر» and «دیرتر» are the same move for the keyboard and assistive technology.
                  <span
                    className="drag-handle"
                    aria-hidden="true"
                    data-testid={`drag-${step.id}`}
                    onPointerDown={event => start(event, index)}
                    onPointerMove={follow}
                    onPointerUp={drop}
                    onPointerCancel={() => setDrag(null)}
                  >
                    <Reorder size={18} />
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {movable && <p className="mt-1 text-xs text-text-secondary">برای جابه‌جایی، مرحله‌ی باز را از دستگیره‌اش بکشید.</p>}
      {task.status === 'ACTIVE' && (
        <p className="notice mt-3">
          {task.isBlocked
            ? `منتظر ${task.blockedBy.map(blocker => `«${blocker.title}»`).join('، ')} است.`
            : next ? `پیش‌نیازها انجام شده‌اند. با انجام این کار، «${next.title}» باز می‌شود.` : 'این آخرین مرحله‌ی این ترتیب است.'}
        </p>
      )}
      {task.status === 'ACTIVE' && position >= 0 && (
        // Only the unresolved part moves: a step never passes a done one (025 §16). The server decides; this only hides a move that cannot be.
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="secondary-button min-h-10 px-3 text-sm" type="button"
            disabled={steps[position - 1]?.status !== 'ACTIVE'} onClick={() => onAction('MOVE_EARLIER')}>
            زودتر
          </button>
          <button className="secondary-button min-h-10 px-3 text-sm" type="button"
            disabled={steps[position + 1]?.status !== 'ACTIVE'} onClick={() => onAction('MOVE_LATER')}>
            دیرتر
          </button>
          <button className="secondary-button min-h-10 px-3 text-sm" type="button" onClick={() => onAction('LEAVE')}>
            بیرون از ترتیب
          </button>
        </div>
      )}
    </section>
  )
}

/** The steps with one moved from `from` to `to`. */
function moved(steps: TaskDto[], from: number, to: number) {
  const order = [...steps]
  const [step] = order.splice(from, 1)
  order.splice(to, 0, step)
  return order
}

/** A Task that waits for nothing, and the way to make it follow another of the same owner (029 §9.2). */
function NoSequenceCard({ task, onFollow }: { task: TaskDto; onFollow: () => void }) {
  const others = followCandidates(task, useTaskOptions().data?.items ?? [])
  if (others.length === 0) return null
  return (
    <section className="card mt-5" aria-labelledby="task-no-sequence">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-extrabold" id="task-no-sequence">
          <ListOrdered size={18} className="text-text-secondary" aria-hidden="true" />
          ترتیب انجام
        </h2>
        <button className="secondary-button min-h-10 px-3 text-sm" type="button" onClick={onFollow}>بعد از…</button>
      </div>
      <p className="mt-2 text-sm text-text-secondary">این کار منتظر کار دیگری نیست. اگر باید بعد از کاری انجام شود، «بعد از…» را بزنید.</p>
    </section>
  )
}
