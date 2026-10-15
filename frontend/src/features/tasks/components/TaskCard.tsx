import { Link } from '@tanstack/react-router'
import { CalendarDays, Check, ChevronLeft, CircleSlash, LoaderCircle, Lock, ShieldCheck } from '../../../shared/ui/icons'
import { parseIsoDate } from '../../../shared/lib/date'
import type { TaskDto } from '../types/task.types'
import { TaskNote, TaskParent } from './TaskFacts'

const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' })

/** The time bucket a Task falls in on the Tasks list; both dates are ISO local dates, so they compare as text. */
export type TaskGroup = 'today' | 'earlier' | 'tomorrow' | 'later' | 'none' | 'closed'

export function taskGroup(task: Pick<TaskDto, 'status' | 'plannedDate'>, today: string, tomorrow: string): TaskGroup {
  if (task.status !== 'ACTIVE') return 'closed'
  if (!task.plannedDate) return 'none'
  if (task.plannedDate === today) return 'today'
  if (task.plannedDate === tomorrow) return 'tomorrow'
  return task.plannedDate < today ? 'earlier' : 'later'
}

/**
 * One Task on the Tasks timeline. The node completes it with one press (a
 * lock while it waits for earlier steps; how it ended once closed); the card
 * opens it. Beside the title: since when it has been waiting for an earlier
 * day, its date on a later one, or else how close its deadline is.
 */
export function TaskCard({ task, group, today, parentTitle, completing = false, selected = false, onComplete }: {
  task: TaskDto
  group: TaskGroup
  /** Today's ISO local date, for how close the deadline is. */
  today: string
  /** Title of the Goal or Project the Task belongs to, when it is known. */
  parentTitle?: string
  completing?: boolean
  /** The Task open beside the list on desktop. */
  selected?: boolean
  onComplete: () => void
}) {
  const closed = task.status !== 'ACTIVE'
  const planned = task.plannedDate ? dayMonth.format(parseIsoDate(task.plannedDate)) : null
  const note = group === 'earlier' && planned ? <DateNote text={`از ${planned}`} />
    : group === 'later' && planned && !task.deadline ? <DateNote text={planned} />
      : closed ? null : <TaskNote task={task} today={today} />
  return (
    <li className="timeline-row" data-selected={selected || undefined}>
      <div className="timeline-node">
        <span className="timeline-mark">
          {task.status === 'COMPLETED' ? (
            <span className="ring-done" role="img" aria-label="تکمیل‌شده"><Check size={14} /></span>
          ) : task.status === 'DROPPED' ? (
            <span className="ring-lock" role="img" aria-label="کنار گذاشته‌شده"><CircleSlash size={14} /></span>
          ) : task.isBlocked ? (
            <span className="ring-lock" role="img" aria-label="منتظر کار پیشین"><Lock size={13} /></span>
          ) : (
            <button className="ring-button" type="button" aria-label={`تکمیل کار: ${task.title}`} disabled={completing} onClick={onComplete}>
              {completing
                ? <LoaderCircle size={20} className="animate-spin text-entity-task" aria-hidden="true" />
                : <span aria-hidden="true" />}
            </button>
          )}
        </span>
      </div>
      <div className="timeline-card flex items-center gap-2" data-state={closed ? 'done' : undefined}>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="timeline-title">
              <Link className="stretched-link" to="/tasks/$taskId" params={{ taskId: task.id }} aria-current={selected ? 'page' : undefined}>{task.title}</Link>
            </h3>
            {note}
          </div>
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <TaskParent task={task} parentTitle={parentTitle} />
            {task.isProtected && (
              <span className="mt-0.75 text-text-tertiary" role="img" aria-label="محافظت‌شده"><ShieldCheck size={13} /></span>
            )}
            {task.isBlocked && !closed && (
              <span className="meta-chip mt-0.75 bg-caution-tint text-caution">
                <Lock size={12} className="shrink-0" aria-hidden="true" />
                منتظر کار پیشین
              </span>
            )}
          </p>
        </div>
        <ChevronLeft size={18} className="shrink-0 text-text-tertiary" aria-hidden="true" />
      </div>
    </li>
  )
}

function DateNote({ text }: { text: string }) {
  return (
    <span className="timeline-meta">
      <CalendarDays size={12} aria-hidden="true" />
      {text}
    </span>
  )
}
