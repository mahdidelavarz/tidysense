import { Link } from '@tanstack/react-router'
import { ChevronLeft, CircleCheckBig, CircleDashed, CircleSlash, FolderKanban, Lock, ShieldCheck, Target } from 'lucide-react'
import { StatusBadge } from '../../../shared/ui/EntityUi'
import type { TaskDto } from '../types/task.types'
import { DateLeaf, leafDateText } from './DateLeaf'

/** Where a planned date falls relative to today; both are ISO local dates, so they compare as text. */
export function taskWhen(task: Pick<TaskDto, 'status' | 'plannedDate'>, today: string) {
  if (task.status !== 'ACTIVE') return 'closed'
  if (!task.plannedDate) return 'none'
  return task.plannedDate < today ? 'earlier' : task.plannedDate === today ? 'today' : 'later'
}

/**
 * One Task row in the Tasks list. The whole row opens the Task. The leaf at
 * its start is the planned date, or how the Task ended once it is closed.
 */
export function TaskCard({ task, today, parentTitle }: {
  task: TaskDto
  /** Today's ISO local date, to mark the leaf. */
  today: string
  /** Title of the Goal or Project the Task belongs to, when it is known. */
  parentTitle?: string
}) {
  const when = taskWhen(task, today)
  const ParentIcon = task.projectId ? FolderKanban : task.goalId ? Target : CircleDashed
  const parentKind = task.projectId ? 'پروژه' : task.goalId ? 'هدف' : 'مستقل'
  return (
    <Link className="list-row" to="/tasks/$taskId" params={{ taskId: task.id }}>
      <DateLeaf date={task.plannedDate} when={when}>
        {when === 'closed' && (task.status === 'COMPLETED' ? <CircleCheckBig size={22} /> : <CircleSlash size={22} />)}
      </DateLeaf>
      <div className="min-w-0 flex-1">
        <h3 className={`truncate font-bold leading-7 ${when === 'closed' ? 'text-text-secondary' : ''}`}>{task.title}</h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="meta-chip">
            <ParentIcon size={13} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{parentTitle ? `${parentKind}: ${parentTitle}` : parentKind}</span>
          </span>
          {/* The leaf is decorative, so the date is also said in words for assistive technology. */}
          <span className="sr-only">{leafDateText(task.plannedDate)}</span>
          {task.isBlocked && (
            <span className="meta-chip bg-caution-tint text-caution">
              <Lock size={13} className="shrink-0" aria-hidden="true" />
              منتظر کار پیشین
            </span>
          )}
          {task.isProtected && (
            <span className="meta-chip">
              <ShieldCheck size={13} className="shrink-0" aria-hidden="true" />
              محافظت‌شده
            </span>
          )}
        </p>
      </div>
      {task.status !== 'ACTIVE' && <StatusBadge status={task.status} />}
      <ChevronLeft size={20} className="shrink-0 text-text-tertiary" aria-hidden="true" />
    </Link>
  )
}
