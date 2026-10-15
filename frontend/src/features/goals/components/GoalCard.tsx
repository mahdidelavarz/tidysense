import { Link } from '@tanstack/react-router'
import { ChevronLeft, FolderKanban, ListChecks, Repeat, Target } from '../../../shared/ui/icons'
import { formatNumber } from '../../../shared/lib/date'
import { StatusBadge } from '../../../shared/ui/EntityUi'
import { ProgressBar, TargetNote } from '../../structure/components/ProgressFacts'
import type { GoalProgressDto } from '../../structure/types/progress.types'
import type { GoalDto } from '../types/goal.types'

/**
 * One Goal in the Goals list; the card opens it. What it means, what is
 * under it (Projects, open Tasks, Routines), and how much of its work is
 * done against its target date.
 */
export function GoalCard({ goal, progress, today }: {
  goal: GoalDto
  progress?: GoalProgressDto
  today: string
}) {
  const active = goal.status === 'ACTIVE'
  const work = progress?.work
  return (
    <article className="goal-card entity-goal" data-closed={!active}>
      <div className="flex items-start gap-3">
        <span className="goal-tile" aria-hidden="true"><Target size={22} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 wrap-break-word text-[1.0625rem] font-extrabold leading-7">
            <Link className="stretched-link" to="/goals/$goalId" params={{ goalId: goal.id }}>{goal.title}</Link>
          </h3>
          <p className="line-clamp-2 text-[0.8125rem] leading-6 text-text-secondary">{goal.desiredOutcome}</p>
        </div>
        {active ? <ChevronLeft size={18} className="mt-1 shrink-0 text-text-tertiary" aria-hidden="true" /> : <StatusBadge status={goal.status} />}
      </div>
      {work && (
        <>
          <ul className="mt-3 grid grid-cols-3 gap-2 text-xs font-extrabold">
            <li className="count-chip entity-project"><FolderKanban size={15} aria-hidden="true" /><b>{formatNumber(Number(progress.activeProjectCount))}</b> پروژه</li>
            <li className="count-chip entity-task"><ListChecks size={15} aria-hidden="true" /><b>{formatNumber(Number(work.openTaskCount))}</b> کار باز</li>
            <li className="count-chip entity-routine"><Repeat size={15} aria-hidden="true" /><b>{formatNumber(Number(work.activeRoutineCount))}</b> روتین</li>
          </ul>
          <div className="mt-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1"><ProgressBar done={Number(work.doneTaskCount)} total={Number(work.taskCount)} /></div>
            <TargetNote date={goal.targetDate} today={today} />
          </div>
        </>
      )}
    </article>
  )
}
