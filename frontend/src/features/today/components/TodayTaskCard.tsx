import { Link } from '@tanstack/react-router'
import { Check, ChevronLeft, LoaderCircle } from 'lucide-react'
import { BlockedByList } from '../../tasks/components/BlockedByList'
import { taskOwnerLabel } from '../../tasks/components/TaskCard'
import type { TaskDto } from '../../tasks/types/task.types'

/** One Today row: a round complete control, the Task, and a way into its details. */
export function TodayTaskCard({ task, completing, onComplete }: {
  task: TaskDto
  completing: boolean
  onComplete: () => void
}) {
  return (
    <article className={`flex items-start gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm ${task.isBlocked ? 'opacity-75' : ''}`}>
      <button
        className="check-button"
        type="button"
        aria-label={`تکمیل کار: ${task.title}`}
        disabled={task.isBlocked || completing}
        onClick={onComplete}
      >
        {completing
          ? <LoaderCircle size={20} className="animate-spin text-text-secondary" aria-hidden="true" />
          : <Check size={20} strokeWidth={3} aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1 pt-1.5">
        <h2 className="wrap-break-word font-bold leading-7">{task.title}</h2>
        <p className="text-xs text-text-secondary">{taskOwnerLabel(task)}</p>
        {task.description && <p className="mt-2 line-clamp-3 text-sm leading-7 text-text-secondary">{task.description}</p>}
        {task.isBlocked && (
          <div className="notice mt-3">
            <p className="font-bold text-text-primary">منتظر تکمیل کارهای پیشین</p>
            <BlockedByList blockers={task.blockedBy} />
          </div>
        )}
      </div>
      <Link className="icon-button -me-2" to="/tasks/$taskId" params={{ taskId: task.id }} aria-label={`جزئیات: ${task.title}`}>
        <ChevronLeft size={20} aria-hidden="true" />
      </Link>
    </article>
  )
}
