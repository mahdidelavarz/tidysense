import { Link } from '@tanstack/react-router'
import { CalendarClock, Check, CircleDashed, Eye, FolderKanban, LoaderCircle, Lock, Target } from '../../../shared/ui/icons'
import type { TaskDto } from '../../tasks/types/task.types'
import { TodayCard } from './TodayCard'

/**
 * One Task in Today: a complete control, the title and where it belongs.
 * Details and moving it to another day are in the card's hidden actions.
 * `onComplete` is absent when the card only previews another day.
 */
export function TodayTaskCard({ task, parentTitle, completing = false, onComplete, onCarry }: {
  task: TaskDto
  /** Title of the Goal or Project the Task belongs to, when it is known. */
  parentTitle?: string
  completing?: boolean
  onComplete?: () => void
  onCarry: () => void
}) {
  const ParentIcon = task.projectId ? FolderKanban : task.goalId ? Target : CircleDashed
  const parentKind = task.projectId ? 'پروژه' : task.goalId ? 'هدف' : 'مستقل'
  return (
    <TodayCard
      tone="task"
      label={task.title}
      dimmed={task.isBlocked}
      actionCount={2}
      actions={(
        <>
          <Link className="today-action" to="/tasks/$taskId" params={{ taskId: task.id }} aria-label={`جزئیات: ${task.title}`}>
            <Eye size={20} aria-hidden="true" />
            جزئیات
          </Link>
          <button className="today-action" type="button" onClick={onCarry}>
            <CalendarClock size={20} aria-hidden="true" />
            روز دیگر
          </button>
        </>
      )}
    >
      {onComplete && (
        <button
          className="check-button"
          type="button"
          aria-label={`تکمیل کار: ${task.title}`}
          disabled={task.isBlocked || completing}
          onClick={onComplete}
        >
          {completing
            ? <LoaderCircle size={20} className="animate-spin text-text-secondary" aria-hidden="true" />
            : <Check size={16} aria-hidden="true" />}
        </button>
      )}
      <div className="min-w-0 flex-1 self-center">
        <h2 className="wrap-break-word text-[0.96875rem] font-semibold leading-7">{task.title}</h2>
        <p className="today-badge mt-1.5">
          <ParentIcon size={14} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{parentTitle ? `${parentKind}: ${parentTitle}` : parentKind}</span>
        </p>
        {task.isBlocked && (
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-6 text-text-secondary">
            <Lock size={14} className="mt-1 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-bold text-text-primary">منتظر تکمیل کارهای پیشین</span>
              {task.blockedBy.length > 0 && `: ${task.blockedBy.map(blocker => blocker.title).join('، ')}`}
            </span>
          </p>
        )}
      </div>
    </TodayCard>
  )
}
