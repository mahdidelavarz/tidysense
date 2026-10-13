import { Link } from '@tanstack/react-router'
import { CalendarClock, Check, ChevronLeft, CircleDashed, FolderKanban, Hourglass, ListOrdered, Lock, Pause, ShieldCheck, Target, Trash2 } from '../../../shared/ui/icons'
import { formatLocalDate, formatNumber } from '../../../shared/lib/date'
import { DateLeaf, leafDateText } from '../../tasks/components/DateLeaf'
import { formatAge, reasonLabels } from '../types/reconcile.format'
import type {
  ReconcileActionDraft,
  ReconcileOwnerGroupDto,
  ReconcileSequenceGroupDto,
  ReconcileTaskItemDto,
} from '../types/reconcile.types'

type LaneActions = {
  /** The session's local date, to tell an earlier planned date from a later one. */
  today: string
  /** Starts an action that needs no further input; the server previews it next. */
  onAction: (draft: ReconcileActionDraft) => void
  /** Starts an action that first needs a date from the user. */
  onDatedAction: (draft: ReconcileActionDraft) => void
  onComplete: (task: ReconcileTaskItemDto) => void
  busyTaskId?: string
}

const ownerLabels: Record<string, string> = { PROJECT: 'پروژه', GOAL: 'هدف' }

/**
 * Execution lane: work that needs a decision, grouped by owner, then by
 * sequence, then by Task. A blocked Task is shown as context under its
 * sequence and never as its own decision.
 */
export function ExecutionLane({ groups, total, ...actions }: {
  groups: ReconcileOwnerGroupDto[]
  /** Every Task waiting for a decision, for the count beside the heading. */
  total: number
} & LaneActions) {
  return (
    <section className="lane" aria-labelledby="reconcile-execution">
      <h2 className="lane-title" id="reconcile-execution">
        تصمیم‌های اجرایی
        <span className="lane-count" aria-hidden="true">{formatNumber(total)}</span>
      </h2>
      <p className="lane-hint">برای هر کار یکی را انتخاب کنید.</p>
      <div className="mt-5 space-y-8">
        {groups.map(group => {
          const OwnerIcon = group.ownerType === 'PROJECT' ? FolderKanban : group.ownerType === 'GOAL' ? Target : CircleDashed
          return (
            <div key={`${group.ownerType}:${group.ownerId ?? ''}`}>
              <h3 className="lane-owner">
                <OwnerIcon size={15} className="shrink-0 text-text-secondary" aria-hidden="true" />
                <span className="truncate">
                  {group.ownerId
                    ? `${ownerLabels[group.ownerType]}: ${group.ownerTitle ?? ''}`
                    : 'کارهای مستقل'}
                </span>
              </h3>
              <ul className="mt-3 space-y-4">
                {group.sequences.map(sequence => (
                  <li key={sequence.sequenceId}><SequenceCard sequence={sequence} {...actions} /></li>
                ))}
                {group.tasks.map(task => (
                  <li key={task.taskId}><TaskRow task={task} {...actions} /></li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** One coherent decision for the remaining members of a sequence, with each member still reviewable on its own. */
function SequenceCard({ sequence, ...actions }: { sequence: ReconcileSequenceGroupDto } & LaneActions) {
  const allowed = new Set(sequence.allowedActions)
  const dropped = sequence.droppedPredecessor
  return (
    <article className="decision-card" aria-label="دنباله کارها">
      <div className="decision-head">
        <span className="decision-tile bg-accent-tint text-accent-strong" aria-hidden="true">
          <ListOrdered size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="decision-title">
            دنباله‌ای از {formatNumber(sequence.items.length)} کار
          </p>
          <p className="text-xs leading-6 text-text-secondary sm:text-sm">
            {dropped
              ? 'کار پیش‌نیاز این دنباله کنار گذاشته شده است، پس کارهای بعدی قابل انجام نیستند تا درباره‌اش تصمیم بگیرید.'
              : 'به هم وابسته‌اند؛ یک‌جا تصمیم بگیرید یا تک‌تک.'}
          </p>
          {dropped && (
            <p className="notice mt-3">
              پیش‌نیاز کنار گذاشته‌شده:{' '}
              <Link className="text-link" to="/tasks/$taskId" params={{ taskId: dropped.id }}>{dropped.title}</Link>
              <span className="block">برای بازگرداندنش، صفحه همان کار را باز کنید.</span>
            </p>
          )}
        </div>
      </div>
      <div className="decision-bar">
        {allowed.has('SEQUENCE_CARRY_ALL') && (
          <button
            className="decision-button"
            data-tone="primary"
            type="button"
            onClick={() => actions.onDatedAction({ actionType: 'SEQUENCE_CARRY_ALL', sequenceId: sequence.sequenceId })}
          >
            <CalendarClock size={18} aria-hidden="true" />
            انتقال کل دنباله
          </button>
        )}
        {allowed.has('DETACH_DROPPED_PREDECESSOR') && (
          <button
            className="decision-button"
            data-tone="primary"
            type="button"
            onClick={() => actions.onAction({ actionType: 'DETACH_DROPPED_PREDECESSOR', sequenceId: sequence.sequenceId })}
          >
            ادامه بدون پیش‌نیاز
          </button>
        )}
        {allowed.has('SEQUENCE_DROP_ALL') && (
          <button
            className="decision-button"
            data-tone="danger"
            type="button"
            onClick={() => actions.onAction({ actionType: 'SEQUENCE_DROP_ALL', sequenceId: sequence.sequenceId })}
          >
            <Trash2 size={18} aria-hidden="true" />
            کنار گذاشتن همه
          </button>
        )}
      </div>
      <ul className="space-y-2.5 border-t border-border bg-canvas p-2.5 sm:p-3">
        {sequence.items.map(task => (
          <li key={task.taskId}><TaskRow task={task} nested {...actions} /></li>
        ))}
      </ul>
    </article>
  )
}

function TaskRow({ task, nested = false, today, onAction, onDatedAction, onComplete, busyTaskId }: {
  task: ReconcileTaskItemDto
  nested?: boolean
} & LaneActions) {
  const allowed = new Set(task.allowedActions)
  const busy = busyTaskId === task.taskId
  const age = formatAge(task.ageDays)
  const when = !task.plannedDate ? 'none' : task.plannedDate < today ? 'earlier' : task.plannedDate === today ? 'today' : 'later'
  const hasActions = ['COMPLETE_TASK', 'REPLAN_TASKS', 'KEEP_TASKS', 'DROP_TASKS'].some(action => allowed.has(action))
  return (
    <article className={nested ? 'decision-card shadow-none' : 'decision-card'}>
      <div className="decision-head">
        <DateLeaf date={task.plannedDate} when={when} />
        <div className="min-w-0 flex-1">
          <h4 className="decision-title">{task.title}</h4>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="sr-only">{leafDateText(task.plannedDate)}</span>
            {age && (
              <span className="meta-chip bg-caution-tint text-caution">
                <Hourglass size={13} className="shrink-0" aria-hidden="true" />
                {age}
              </span>
            )}
            {task.deadline && <span className="meta-chip">مهلت: {formatLocalDate(task.deadline)}</span>}
            {Number(task.carryCount) > 0 && <span className="meta-chip">{formatNumber(Number(task.carryCount))} بار منتقل شده</span>}
            {task.isProtected && (
              <span className="meta-chip">
                <ShieldCheck size={13} className="shrink-0" aria-hidden="true" />
                محافظت‌شده
              </span>
            )}
            {task.isBlocked && (
              <span className="meta-chip bg-caution-tint text-caution">
                <Lock size={13} className="shrink-0" aria-hidden="true" />
                منتظر کار پیشین
              </span>
            )}
            {/* The age chip already says a date has passed, so that reason is not repeated in words. */}
            {task.actionable && task.reasonCodes.filter(code => !(age && code === 'EXECUTION_OVERDUE')).map(code => (
              <span key={code} className="meta-chip">{reasonLabels[code] ?? code}</span>
            ))}
          </p>
        </div>
        <Link className="icon-button -me-2 -mt-1" to="/tasks/$taskId" params={{ taskId: task.taskId }} aria-label={`جزئیات: ${task.title}`}>
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
      </div>
      {hasActions && (
        <div className="decision-bar">
          {allowed.has('COMPLETE_TASK') && (
            <button className="decision-button" data-tone="positive" type="button" disabled={busy} aria-label={`انجام شد: ${task.title}`} onClick={() => onComplete(task)}>
              <Check size={18} aria-hidden="true" />
              {busy ? 'در حال ثبت…' : 'انجام شد'}
            </button>
          )}
          {allowed.has('REPLAN_TASKS') && (
            <button
              className="decision-button"
              type="button"
              aria-label={`انتقال: ${task.title}`}
              onClick={() => onDatedAction({ actionType: 'REPLAN_TASKS', taskIds: [task.taskId] })}
            >
              <CalendarClock size={18} aria-hidden="true" />
              انتقال
            </button>
          )}
          {allowed.has('KEEP_TASKS') && (
            <button
              className="decision-button"
              type="button"
              aria-label={`فعلاً بماند: ${task.title}`}
              onClick={() => onAction({ actionType: 'KEEP_TASKS', taskIds: [task.taskId] })}
            >
              <Pause size={18} aria-hidden="true" />
              فعلاً بماند
            </button>
          )}
          {allowed.has('DROP_TASKS') && (
            <button
              className="decision-button"
              data-tone="danger"
              type="button"
              aria-label={`کنار گذاشتن: ${task.title}`}
              onClick={() => onAction({ actionType: 'DROP_TASKS', taskIds: [task.taskId] })}
            >
              <Trash2 size={18} aria-hidden="true" />
              کنار گذاشتن
            </button>
          )}
        </div>
      )}
    </article>
  )
}
