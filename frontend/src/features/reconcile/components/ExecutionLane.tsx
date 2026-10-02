import { Link } from '@tanstack/react-router'
import { CalendarClock, Check, ChevronLeft, Lock, ShieldCheck, Trash2 } from 'lucide-react'
import { formatLocalDate, formatNumber } from '../../../shared/lib/date'
import { formatAge, reasonLabels } from '../types/reconcile.format'
import type {
  ReconcileActionDraft,
  ReconcileOwnerGroupDto,
  ReconcileSequenceGroupDto,
  ReconcileTaskItemDto,
} from '../types/reconcile.types'

type LaneActions = {
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
export function ExecutionLane({ groups, ...actions }: { groups: ReconcileOwnerGroupDto[] } & LaneActions) {
  return (
    <section aria-labelledby="reconcile-execution">
      <h2 className="section-title" id="reconcile-execution">تصمیم‌های اجرایی</h2>
      <div className="mt-3 space-y-6">
        {groups.map(group => (
          <div key={`${group.ownerType}:${group.ownerId ?? ''}`}>
            <h3 className="text-sm font-bold">
              {group.ownerId
                ? `${ownerLabels[group.ownerType]}: ${group.ownerTitle ?? ''}`
                : 'کارهای مستقل'}
            </h3>
            <ul className="mt-2 space-y-3">
              {group.sequences.map(sequence => (
                <li key={sequence.sequenceId}><SequenceCard sequence={sequence} {...actions} /></li>
              ))}
              {group.tasks.map(task => (
                <li key={task.taskId}><TaskRow task={task} {...actions} /></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

/** One coherent decision for the remaining members of a sequence, with each member still reviewable on its own. */
function SequenceCard({ sequence, ...actions }: { sequence: ReconcileSequenceGroupDto } & LaneActions) {
  const allowed = new Set(sequence.allowedActions)
  const dropped = sequence.droppedPredecessor
  return (
    <article className="card" aria-label="دنباله کارها">
      <p className="font-bold">
        دنباله‌ای از {formatNumber(sequence.items.length)} کار
      </p>
      <p className="text-sm text-text-secondary">
        {dropped
          ? 'کار پیش‌نیاز این دنباله کنار گذاشته شده است، پس کارهای بعدی قابل انجام نیستند تا درباره‌اش تصمیم بگیرید.'
          : 'این کارها به هم وابسته‌اند؛ می‌توانید یک‌جا درباره‌شان تصمیم بگیرید یا تک‌تک.'}
      </p>
      {dropped && (
        <p className="notice mt-3">
          پیش‌نیاز کنار گذاشته‌شده:{' '}
          <Link className="text-link" to="/tasks/$taskId" params={{ taskId: dropped.id }}>{dropped.title}</Link>
          <span className="block">برای بازگرداندنش، صفحه همان کار را باز کنید.</span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {allowed.has('SEQUENCE_CARRY_ALL') && (
          <button
            className="primary-button min-h-9 px-3"
            type="button"
            onClick={() => actions.onDatedAction({ actionType: 'SEQUENCE_CARRY_ALL', sequenceId: sequence.sequenceId })}
          >
            <CalendarClock size={18} aria-hidden="true" />
            انتقال کل دنباله
          </button>
        )}
        {allowed.has('DETACH_DROPPED_PREDECESSOR') && (
          <button
            className="primary-button min-h-9 px-3"
            type="button"
            onClick={() => actions.onAction({ actionType: 'DETACH_DROPPED_PREDECESSOR', sequenceId: sequence.sequenceId })}
          >
            ادامه بدون پیش‌نیاز
          </button>
        )}
        {allowed.has('SEQUENCE_DROP_ALL') && (
          <button
            className="danger-button min-h-9 px-3"
            type="button"
            onClick={() => actions.onAction({ actionType: 'SEQUENCE_DROP_ALL', sequenceId: sequence.sequenceId })}
          >
            <Trash2 size={18} aria-hidden="true" />
            کنار گذاشتن باقی‌مانده
          </button>
        )}
      </div>
      <ul className="mt-4 space-y-3 border-t border-border-subtle pt-4">
        {sequence.items.map(task => (
          <li key={task.taskId}><TaskRow task={task} nested {...actions} /></li>
        ))}
      </ul>
    </article>
  )
}

function TaskRow({ task, nested = false, onAction, onDatedAction, onComplete, busyTaskId }: {
  task: ReconcileTaskItemDto
  nested?: boolean
} & LaneActions) {
  const allowed = new Set(task.allowedActions)
  const busy = busyTaskId === task.taskId
  const age = formatAge(task.ageDays)
  return (
    <article className={nested ? '' : 'card'}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="wrap-break-word font-bold leading-7">{task.title}</h4>
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-text-secondary">
            <span>{task.plannedDate ? formatLocalDate(task.plannedDate) : 'بدون تاریخ'}</span>
            {age && <span>{age}</span>}
            {task.deadline && <span>مهلت: {formatLocalDate(task.deadline)}</span>}
            {Number(task.carryCount) > 0 && <span>{formatNumber(Number(task.carryCount))} بار منتقل شده</span>}
            {task.isProtected && (
              <span className="flex items-center gap-1 font-bold">
                <ShieldCheck size={12} aria-hidden="true" />
                محافظت‌شده
              </span>
            )}
            {task.isBlocked && (
              <span className="flex items-center gap-1 font-bold text-caution">
                <Lock size={12} aria-hidden="true" />
                منتظر کار پیشین
              </span>
            )}
          </p>
          {task.actionable && (
            <p className="mt-1 flex flex-wrap gap-1.5">
              {task.reasonCodes.map(code => (
                <span key={code} className="status-badge status-neutral">{reasonLabels[code] ?? code}</span>
              ))}
            </p>
          )}
        </div>
        <Link className="icon-button -me-2 -mt-2" to="/tasks/$taskId" params={{ taskId: task.taskId }} aria-label={`جزئیات: ${task.title}`}>
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {allowed.has('COMPLETE_TASK') && (
          <button className="secondary-button min-h-9 px-3" type="button" disabled={busy} aria-label={`انجام شد: ${task.title}`} onClick={() => onComplete(task)}>
            <Check size={18} aria-hidden="true" />
            {busy ? 'در حال ثبت…' : 'انجام شد'}
          </button>
        )}
        {allowed.has('REPLAN_TASKS') && (
          <button
            className="secondary-button min-h-9 px-3"
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
            className="ghost-button min-h-9 px-3"
            type="button"
            aria-label={`فعلاً بماند: ${task.title}`}
            onClick={() => onAction({ actionType: 'KEEP_TASKS', taskIds: [task.taskId] })}
          >
            فعلاً بماند
          </button>
        )}
        {allowed.has('DROP_TASKS') && (
          <button
            className="ghost-button min-h-9 px-3 text-attention"
            type="button"
            aria-label={`کنار گذاشتن: ${task.title}`}
            onClick={() => onAction({ actionType: 'DROP_TASKS', taskIds: [task.taskId] })}
          >
            <Trash2 size={18} aria-hidden="true" />
            کنار گذاشتن
          </button>
        )}
      </div>
    </article>
  )
}
