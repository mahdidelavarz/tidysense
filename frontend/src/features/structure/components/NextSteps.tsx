import { Link } from '@tanstack/react-router'
import { addDays } from 'date-fns-jalali'
import { FolderKanban, LoaderCircle, Lock } from '../../../shared/ui/icons'
import { parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { useCompleteTask } from '../../tasks/hooks/task-hooks'
import type { NextTaskDto } from '../types/progress.types'

const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' })

/** When a next step is planned, in a word or a date. */
function when(date: string | null | undefined, today: string) {
  if (!date) return 'بدون تاریخ'
  if (date === today) return 'امروز'
  if (date === toIsoDate(addDays(parseIsoDate(today), 1))) return 'فردا'
  return date < today ? `از ${dayMonth.format(parseIsoDate(date))}` : dayMonth.format(parseIsoDate(date))
}

/**
 * The next open Tasks of a Goal or Project as a short timeline: each
 * completes from its ring (a lock while it waits for an earlier step), opens
 * from its title, and says when it is planned. Under a Goal a Task names its
 * Project.
 */
export function NextSteps({ tasks, today, projectTitle }: {
  tasks: NextTaskDto[]
  today: string
  /** The title of a Task's Project, for Tasks shown under a Goal. */
  projectTitle?: (projectId: string) => string | undefined
}) {
  const complete = useCompleteTask()
  return (
    <>
      <FormError error={complete.error} />
      <ol className="timeline mt-1">
        {tasks.map(task => {
          const project = task.projectId ? projectTitle?.(task.projectId) : undefined
          return (
            <li key={task.id} className="timeline-row pb-1">
              <div className="timeline-node">
                <span className="timeline-mark mt-1.5">
                  {task.isBlocked ? (
                    <span className="ring-lock" role="img" aria-label="منتظر کار پیشین"><Lock size={12} /></span>
                  ) : (
                    <button
                      className="ring-button"
                      type="button"
                      aria-label={`تکمیل کار: ${task.title}`}
                      disabled={complete.isPending && complete.variables?.taskId === task.id}
                      onClick={() => complete.mutate(
                        { taskId: task.id, expectedVersion: Number(task.version), completedForLocalDate: today },
                        { onSuccess: () => showToast('کار انجام شد.') },
                      )}
                    >
                      {complete.isPending && complete.variables?.taskId === task.id
                        ? <LoaderCircle size={20} className="animate-spin text-entity-task" aria-hidden="true" />
                        : <span aria-hidden="true" />}
                    </button>
                  )}
                </span>
              </div>
              <div className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 pt-1">
                <span className="min-w-0">
                  <Link className={`block truncate text-sm font-extrabold hover:underline ${task.isBlocked ? 'text-text-secondary' : ''}`} to="/tasks/$taskId" params={{ taskId: task.id }}>
                    {task.title}
                  </Link>
                  {task.isBlocked && <span className="block text-xs font-bold text-caution">منتظر کار پیشین</span>}
                  {project && (
                    <span className="entity-project entity-ink flex items-center gap-1 text-xs font-bold"><FolderKanban size={12} aria-hidden="true" />{project}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs font-semibold text-text-secondary">{when(task.plannedDate, today)}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

/** One row of «زیر این هدف»: a count, what it is, a few names, and the list it lives in. */
export function UnderRow({ entity, count, label, detail, to, linkLabel }: {
  entity: 'project' | 'task' | 'routine'
  count: number
  label: string
  detail?: string
  to: '/projects' | '/tasks' | '/routines'
  linkLabel: string
}) {
  return (
    <li className={`entity-${entity} flex items-center gap-3 py-3`}>
      <span className="project-tile font-display text-lg font-bold" aria-hidden="true">{new Intl.NumberFormat('fa-IR').format(count)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold"><span className="sr-only">{new Intl.NumberFormat('fa-IR').format(count)} </span>{label}</span>
        {detail && <span className="block truncate text-xs text-text-secondary">{detail}</span>}
      </span>
      <Link className="entity-ink shrink-0 text-xs font-extrabold hover:underline" to={to}>{linkLabel} ‹</Link>
    </li>
  )
}
