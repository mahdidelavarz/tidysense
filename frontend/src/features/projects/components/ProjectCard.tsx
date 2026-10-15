import { Link } from '@tanstack/react-router'
import { ChevronLeft, FolderKanban, ListChecks, LoaderCircle, Repeat } from '../../../shared/ui/icons'
import { formatNumber } from '../../../shared/lib/date'
import { StatusBadge } from '../../../shared/ui/EntityUi'
import { ProgressBar, TargetNote } from '../../structure/components/ProgressFacts'
import type { NextTaskDto, ProjectProgressDto } from '../../structure/types/progress.types'
import type { ProjectDto } from '../types/project.types'

/**
 * One Project in the Projects list; the card opens it. What finishing it
 * means, how much of its work is done, and its next open Task, which can be
 * completed from here with one press.
 */
export function ProjectCard({ project, progress, today, completingId, onComplete }: {
  project: ProjectDto
  progress?: ProjectProgressDto
  today: string
  completingId?: string
  onComplete: (task: NextTaskDto) => void
}) {
  const active = project.status === 'ACTIVE'
  const work = progress?.work
  const next = active ? work?.nextTasks.find(task => !task.isBlocked) : undefined
  return (
    <article className="goal-card entity-project" data-closed={!active}>
      <div className="flex items-start gap-3">
        <span className="project-tile" aria-hidden="true"><FolderKanban size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="line-clamp-2 wrap-break-word text-[1.0625rem] font-extrabold leading-7">
              <Link className="stretched-link" to="/projects/$projectId" params={{ projectId: project.id }}>{project.title}</Link>
            </h3>
            {active ? <TargetNote date={project.targetDate} today={today} /> : <StatusBadge status={project.status} />}
          </div>
          {project.completionMeaning && (
            <p className="line-clamp-2 text-[0.8125rem] leading-6 text-text-secondary">تمام یعنی: {project.completionMeaning}</p>
          )}
        </div>
      </div>
      {work && (
        <div className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1"><ProgressBar done={Number(work.doneTaskCount)} total={Number(work.taskCount)} /></div>
            <span className="flex shrink-0 items-center gap-2 text-xs font-extrabold">
              <span className="entity-task entity-ink flex items-center gap-1"><ListChecks size={14} aria-hidden="true" />{formatNumber(Number(work.openTaskCount))} باز</span>
              {Number(work.activeRoutineCount) > 0 && (
                <span className="entity-routine entity-ink flex items-center gap-1"><Repeat size={14} aria-hidden="true" />{formatNumber(Number(work.activeRoutineCount))}</span>
              )}
            </span>
          </div>
          {next && (
            <div className="relative z-1 mt-3 flex min-h-11 items-center gap-2 rounded-2xl bg-surface-sunken ps-1 pe-3">
              <button
                className="ring-button m-0"
                type="button"
                aria-label={`تکمیل کار: ${next.title}`}
                disabled={completingId === next.id}
                onClick={() => onComplete(next)}
              >
                {completingId === next.id
                  ? <LoaderCircle size={20} className="animate-spin text-entity-task" aria-hidden="true" />
                  : <span aria-hidden="true" />}
              </button>
              <span className="text-xs font-bold text-text-secondary">بعدی</span>
              <Link className="min-w-0 flex-1 truncate text-[0.8125rem] font-extrabold hover:underline" to="/tasks/$taskId" params={{ taskId: next.id }}>{next.title}</Link>
              <ChevronLeft size={16} className="shrink-0 text-text-tertiary" aria-hidden="true" />
            </div>
          )}
        </div>
      )}
    </article>
  )
}
