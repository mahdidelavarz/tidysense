import { CircleDashed, Flag, FolderKanban, RotateCcw, Target } from '../../../shared/ui/icons'
import { formatNumber, parseIsoDate } from '../../../shared/lib/date'
import type { TaskDto } from '../types/task.types'

const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' })

/**
 * Where a Task belongs, in its owner's colour: the Project or Goal with its
 * icon, or «مستقل». Until the owner's title is known it names the kind.
 */
export function TaskParent({ task, parentTitle, className = '' }: {
  task: Pick<TaskDto, 'goalId' | 'projectId'>
  parentTitle?: string
  className?: string
}) {
  const kind = task.projectId ? 'project' : task.goalId ? 'goal' : null
  const Icon = kind === 'project' ? FolderKanban : kind === 'goal' ? Target : CircleDashed
  const label = kind === 'project' ? 'پروژه' : kind === 'goal' ? 'هدف' : 'مستقل'
  return (
    <span className={`timeline-parent ${kind ? `entity-${kind} entity-ink` : ''} ${className}`}>
      <Icon size={14} className="shrink-0" aria-hidden="true" />
      {kind && parentTitle && <span className="sr-only">{label}: </span>}
      <span className="truncate">{parentTitle ?? label}</span>
    </span>
  )
}

/**
 * The one fact worth seeing beside an active Task's title: how close its
 * deadline is, or else how many times it has been moved. A deadline within
 * three days is in the caution colour; a passed one in the attention colour.
 */
export function TaskNote({ task, today }: {
  task: Pick<TaskDto, 'deadline' | 'carryCount'>
  today: string
}) {
  if (task.deadline) {
    const days = Math.round((parseIsoDate(task.deadline).getTime() - parseIsoDate(today).getTime()) / 86_400_000)
    const tone = days < 0 ? 'attention' : days <= 3 ? 'caution' : undefined
    const text = days < 0 ? 'مهلت گذشته'
      : days === 0 ? 'مهلت امروز'
        : days <= 3 ? `${formatNumber(days)} روز مانده`
          : `مهلت ${dayMonth.format(parseIsoDate(task.deadline))}`
    return (
      <span className="timeline-meta" data-tone={tone}>
        <Flag size={12} aria-hidden="true" />
        {text}
      </span>
    )
  }
  const carried = Number(task.carryCount)
  if (carried > 0) {
    return (
      <span className="timeline-meta">
        <RotateCcw size={12} aria-hidden="true" />
        {formatNumber(carried)} بار جابه‌جا
      </span>
    )
  }
  return null
}
