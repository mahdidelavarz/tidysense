import { Link } from '@tanstack/react-router'
import { formatLocalDate } from '../../../shared/lib/date'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import type { TaskDto } from '../types/task.types'

/** One Task summary card in the Tasks workspace list. */
export function TaskCard({ task }: { task: TaskDto }) {
  return (
    <Link className="resource-card entity-task h-full" to="/tasks/$taskId" params={{ taskId: task.id }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <EntityLabel entity="task" />
          <h2 className="mt-2 truncate text-lg font-bold leading-snug">{task.title}</h2>
        </div>
        <StatusBadge status={task.status} />
      </div>
      {task.description && <p className="mt-3 line-clamp-2 text-sm leading-7 text-text-secondary">{task.description}</p>}
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-border-subtle pt-3 text-xs text-text-secondary">
        <span>{ownerLabel(task)}</span>
        <span>برنامه: {formatLocalDate(task.plannedDate)}</span>
        {task.isBlocked && <span className="font-bold text-text-primary">مسدود</span>}
      </div>
    </Link>
  )
}

function ownerLabel(task: Pick<TaskDto, 'goalId' | 'projectId'>) {
  if (task.projectId) return 'وابسته به پروژه'
  if (task.goalId) return 'وابسته به هدف'
  return 'مستقل'
}
