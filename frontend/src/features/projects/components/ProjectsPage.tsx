import { Link } from '@tanstack/react-router'
import { ChevronLeft, CircleDashed, Flag, FolderKanban, Plus, Target } from '../../../shared/ui/icons'
import { useState } from 'react'
import { formatNumber, toIsoDate } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PhotoHero } from '../../../shared/ui/PhotoHero'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { FoldedGroup } from '../../goals/components/GoalsPage'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { AccountButton } from '../../shell/components/AccountButton'
import { soonest } from '../../structure/components/ProgressFacts'
import { StructureSwitch } from '../../structure/components/StructureSwitch'
import { useProgress } from '../../structure/hooks/progress-hooks'
import { useCompleteTask } from '../../tasks/hooks/task-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import { useProjectOptions } from '../hooks/project-hooks'
import type { ProjectDto } from '../types/project.types'
import { ProjectCard } from './ProjectCard'

/**
 * Projects: the Projects view of the one Goals-and-Projects place. Active
 * Projects grouped under their Goal (then those with none), each with its
 * progress and next Task; the Project whose target is nearest offered on the
 * photograph; finished Projects folded at the foot.
 */
export function ProjectsPage() {
  const projects = useProjectOptions()
  const goals = useGoalOptions()
  const progress = useProgress()
  const complete = useCompleteTask()
  const openCreate = useUiStore(state => state.openCreate)
  const [showClosed, setShowClosed] = useState(false)
  // The server's local date when it is known; the browser's until then (the pilot runs in one time zone).
  const today = useToday().data?.localDate ?? toIsoDate(new Date())
  const items = projects.data?.items ?? []
  const active = items.filter(project => project.status === 'ACTIVE')
  const closed = items.filter(project => project.status !== 'ACTIVE')
  const progressOf = (project: ProjectDto) => progress.data?.projects.find(item => item.projectId === project.id)
  const due = soonest(active, project => project.targetDate, today)
  const dueNext = due && progressOf(due.item)?.work.nextTasks.find(task => !task.isBlocked)
  const groups = [
    ...(goals.data?.items ?? [])
      .map(goal => ({ id: goal.id, title: goal.title, members: active.filter(project => project.goalId === goal.id) }))
      .filter(group => group.members.length > 0),
    { id: 'none', title: 'بدون هدف', members: active.filter(project => !project.goalId || !goals.data?.items.some(goal => goal.id === project.goalId)) },
  ].filter(group => group.members.length > 0)

  const card = (project: ProjectDto) => (
    <li key={project.id}>
      <ProjectCard
        project={project}
        progress={progressOf(project)}
        today={today}
        completingId={complete.isPending ? complete.variables?.taskId : undefined}
        onComplete={task => complete.mutate(
          { taskId: task.id, expectedVersion: Number(task.version), completedForLocalDate: today },
          { onSuccess: () => showToast('کار انجام شد.') },
        )}
      />
    </li>
  )

  return (
    <div className="page page-sky">
      <PhotoHero
        title="پروژه‌ها"
        end={(
          <>
            <button className="hero-action" type="button" onClick={() => openCreate('project')}>
              <Plus size={20} aria-hidden="true" />
              پروژه جدید
            </button>
            <AccountButton />
          </>
        )}
        below={(
          <StructureSwitch
            current="projects"
            goals={goals.data?.items.filter(goal => goal.status === 'ACTIVE').length}
            projects={projects.data ? active.length : undefined}
          />
        )}
      >
        {due && (
          <Link className="glass-card" to="/projects/$projectId" params={{ projectId: due.item.id }}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.8125rem] bg-white/92 text-[#1c2e34]" aria-hidden="true"><Flag size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-extrabold">
                «{due.item.title}» {due.days < 0 ? 'از موعدش گذشته' : due.days === 0 ? 'امروز' : `${formatNumber(due.days)} روز دیگر`}
              </span>
              {dueNext && <span className="block truncate text-xs text-white/90">بعدی: {dueNext.title}</span>}
            </span>
            <ChevronLeft size={20} className="shrink-0" aria-hidden="true" />
          </Link>
        )}
      </PhotoHero>

      <div className="mb-4"><FormError error={complete.error} /></div>

      {projects.isPending ? <LoadingState text="در حال دریافت پروژه‌ها…" />
        : projects.isError ? <ErrorState onRetry={() => projects.refetch()} />
          : items.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="هنوز پروژه‌ای نساخته‌اید."
              description="یک تلاش محدود را مستقل یا زیر یکی از هدف‌های فعال ثبت کنید."
              action={<button className="secondary-button" type="button" onClick={() => openCreate('project')}>ثبت یک پروژه</button>}
            />
          ) : (
            <div className="space-y-6">
              {groups.map(group => (
                <section key={group.id} aria-labelledby={`projects-${group.id}`}>
                  <h2 className={`list-heading ${group.id === 'none' ? '' : 'entity-goal'}`}>
                    <span className={group.id === 'none' ? 'text-text-secondary' : 'entity-ink'} aria-hidden="true">
                      {group.id === 'none' ? <CircleDashed size={16} /> : <Target size={16} />}
                    </span>
                    <span id={`projects-${group.id}`} className={group.id === 'none' ? '' : 'entity-ink'}>{group.title}</span>
                    <span className="count-pill" aria-hidden="true">{formatNumber(group.members.length)}</span>
                  </h2>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{group.members.map(card)}</ul>
                </section>
              ))}
              {closed.length > 0 && (
                <section aria-label="پروژه‌های پایان‌یافته">
                  <FoldedGroup
                    open={showClosed}
                    onToggle={() => setShowClosed(value => !value)}
                    id="projects-closed"
                    label="پایان‌یافته"
                    detail={`${formatNumber(closed.length)} پروژه`}
                  />
                  <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2" id="projects-closed" hidden={!showClosed}>{closed.map(card)}</ul>
                </section>
              )}
            </div>
          )}
    </div>
  )
}
