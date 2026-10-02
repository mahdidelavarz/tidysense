import { Link } from '@tanstack/react-router'
import { BlockedByList } from '../../tasks/components/BlockedByList'
import type { TaskDto } from '../../tasks/types/task.types'
import { EntityLabel } from '../../../shared/ui/EntityUi'

/** One Today row: the Task, its blocker context if any, and the complete action. */
export function TodayTaskCard({ task, completing, onComplete }: {
  task: TaskDto
  completing: boolean
  onComplete: () => void
}) {
  return (
    <article className={`surface-card entity-surface entity-task ${task.isBlocked ? 'opacity-70' : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <EntityLabel entity="task" />
          <h2 className="mt-2 break-words text-lg font-bold">{task.title}</h2>
          {task.description && <p className="mt-2 text-sm leading-7 text-text-secondary">{task.description}</p>}
          {task.isBlocked && (
            <div className="mt-3 rounded-lg bg-surface-sunken p-3 text-sm text-text-secondary">
              <p className="font-bold text-text-primary">منتظر تکمیل کارهای پیشین</p>
              <BlockedByList blockers={task.blockedBy} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button className="primary-button" type="button" disabled={task.isBlocked || completing} onClick={onComplete}>
            {completing ? 'در حال تکمیل…' : 'تکمیل کار'}
          </button>
          <Link className="text-link inline-flex min-h-11 items-center justify-center text-sm" to="/tasks/$taskId" params={{ taskId: task.id }}>
            مشاهده جزئیات
          </Link>
        </div>
      </div>
    </article>
  )
}
