import { Link } from '@tanstack/react-router'
import { ChevronLeft, Lock } from 'lucide-react'
import { formatLocalDate } from '../../../shared/lib/date'
import { EntityIcon, StatusBadge } from '../../../shared/ui/EntityUi'
import type { TaskDto } from '../types/task.types'

/** Where a Task belongs, in words. */
export function taskOwnerLabel(task: Pick<TaskDto, 'goalId' | 'projectId'>) {
  if (task.projectId) return 'زیر یک پروژه'
  if (task.goalId) return 'زیر یک هدف'
  return 'مستقل'
}

/** One Task row in the Tasks list. The whole row opens the Task. */
export function TaskCard({ task }: { task: TaskDto }) {
  return (
    <Link className="row-link" to="/tasks/$taskId" params={{ taskId: task.id }}>
      <EntityIcon entity="task" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-bold leading-7">{task.title}</h2>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-text-secondary">
          <span>{taskOwnerLabel(task)}</span>
          <span>{task.plannedDate ? formatLocalDate(task.plannedDate) : 'بدون تاریخ'}</span>
          {task.isBlocked && (
            <span className="flex items-center gap-1 font-bold text-caution">
              <Lock size={12} aria-hidden="true" />
              منتظر کار پیشین
            </span>
          )}
        </p>
      </div>
      {task.status !== 'ACTIVE' && <StatusBadge status={task.status} />}
      <ChevronLeft size={20} className="shrink-0 text-text-tertiary" aria-hidden="true" />
    </Link>
  )
}
