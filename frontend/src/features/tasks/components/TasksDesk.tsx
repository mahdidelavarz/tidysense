import { Link } from '@tanstack/react-router'
import { addDays } from 'date-fns-jalali'
import { type ReactNode, useEffect, useState } from 'react'
import { formatLongDate, formatNumber, parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import {
  type AppIcon,
  CalendarDays,
  CalendarOff,
  CircleCheck,
  History,
  ListChecks,
  Plus,
  Sparkles,
  Sun,
} from '../../../shared/ui/icons'
import { EmptyState, ResourceState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import { useCompleteTask, useTaskParentTitle, useTasks, useUndoCompleteTask } from '../hooks/task-hooks'
import type { TaskDto } from '../types/task.types'
import { doneInLastWeek, TaskCard, type TaskGroup, taskGroup } from './TaskCard'
import { TaskDetailView } from './TaskDetailView'

/** A way of narrowing the list: by when, or by what the Task belongs to. */
type View =
  | { kind: 'open' | 'today' | 'week' | 'earlier' | 'none' | 'done' }
  | { kind: 'project' | 'goal'; id: string }
  | { kind: 'standalone' }

const groups: ReadonlyArray<{ id: TaskGroup; label: string }> = [
  { id: 'earlier', label: 'از روزهای قبل' },
  { id: 'today', label: 'امروز' },
  { id: 'tomorrow', label: 'فردا' },
  { id: 'later', label: 'روزهای بعد' },
  { id: 'none', label: 'بدون تاریخ' },
  { id: 'closed', label: 'پایان‌یافته' },
]

const sameView = (a: View, b: View) =>
  a.kind === b.kind && ('id' in a ? 'id' in b && a.id === b.id : true)

/**
 * Tasks on desktop (`CodeDesktopTasks`): the phone's list, grouped the same
 * way, with views to narrow it beside it and the open Task's detail in a
 * side panel. Every Task is read from the same paged list, read to its end,
 * so the counts beside the views are whole. The views only narrow what is
 * shown; nothing here acts on a Task that the phone cannot (028 §5).
 */
export function TasksDesk({ selectedId }: { selectedId?: string }) {
  const tasks = useTasks(undefined)
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const complete = useCompleteTask()
  const undo = useUndoCompleteTask()
  const openCreate = useUiStore(state => state.openCreate)
  const parentTitle = useTaskParentTitle()
  const [view, setView] = useState<View>({ kind: 'open' })
  const today = useToday().data?.localDate ?? toIsoDate(new Date())
  const tomorrow = toIsoDate(addDays(parseIsoDate(today), 1))
  const weekEnd = toIsoDate(addDays(parseIsoDate(today), 6))

  // Desktop shows counts for every view, so the list is read to its end.
  useEffect(() => {
    if (tasks.hasNextPage && !tasks.isFetchingNextPage && !tasks.isError) tasks.fetchNextPage()
  }, [tasks])

  const items = tasks.data?.pages.flatMap(page => page.items) ?? []
  const complete_ = !tasks.hasNextPage && !tasks.isPending
  const open = items.filter(task => task.status === 'ACTIVE')
  const projectGoal = new Map((projects.data?.items ?? []).map(project => [project.id, project.goalId]))
  const goalOf = (task: TaskDto) => task.goalId ?? (task.projectId ? projectGoal.get(task.projectId) ?? null : null)

  const matches = (task: TaskDto, current: View): boolean => {
    switch (current.kind) {
      case 'open': return task.status === 'ACTIVE'
      case 'today': return task.status === 'ACTIVE' && task.plannedDate === today
      case 'week': return task.status === 'ACTIVE' && !!task.plannedDate && task.plannedDate <= weekEnd
      case 'earlier': return task.status === 'ACTIVE' && !!task.plannedDate && task.plannedDate < today
      case 'none': return task.status === 'ACTIVE' && !task.plannedDate
      case 'done': return task.status !== 'ACTIVE'
      case 'project': return task.status === 'ACTIVE' && task.projectId === current.id
      case 'goal': return task.status === 'ACTIVE' && goalOf(task) === current.id
      case 'standalone': return task.status === 'ACTIVE' && !task.projectId && !task.goalId
    }
  }
  const count = (current: View) => items.filter(task => matches(task, current)).length
  const shown = items.filter(task => matches(task, view))
  const doneThisWeek = items.filter(task => doneInLastWeek(task, today)).length

  const dates: Partial<Record<TaskGroup, string>> = { today: formatLongDate(today), tomorrow: formatLongDate(tomorrow) }
  const activeProjects = (projects.data?.items ?? []).filter(project => project.status === 'ACTIVE')
  const activeGoals = (goals.data?.items ?? []).filter(goal => goal.status === 'ACTIVE')

  return (
    <div className="page-desk desk-tasks">
      <nav className="desk-side" aria-label="نماهای کارها">
        <h1 className="page-title">کارها</h1>
        <p className="mb-4 text-xs text-text-secondary">
          {complete_
            ? `${formatNumber(open.length)} باز، ${formatNumber(doneThisWeek)} انجام‌شده در هفت روز اخیر`
            : 'در حال خواندن همه‌ی کارها…'}
        </p>
        <ViewList>
          <ViewItem icon={ListChecks} label="همه‌ی کارهای باز" view={{ kind: 'open' }} current={view} count={count} onSelect={setView} />
          <ViewItem icon={Sun} label="امروز" view={{ kind: 'today' }} current={view} count={count} onSelect={setView} />
          <ViewItem icon={CalendarDays} label="تا هفت روز آینده" view={{ kind: 'week' }} current={view} count={count} onSelect={setView} />
          <ViewItem icon={History} label="از روزهای قبل" view={{ kind: 'earlier' }} current={view} count={count} onSelect={setView} />
          <ViewItem icon={CalendarOff} label="بدون تاریخ" view={{ kind: 'none' }} current={view} count={count} onSelect={setView} />
          <ViewItem icon={CircleCheck} label="پایان‌یافته" view={{ kind: 'done' }} current={view} count={count} onSelect={setView} />
        </ViewList>
        {activeProjects.length > 0 && (
          <>
            <h2 className="desk-side-heading">پروژه‌ها</h2>
            <ViewList>
              {activeProjects.map(project => (
                <ViewItem key={project.id} entity="project" label={project.title} view={{ kind: 'project', id: project.id }}
                  current={view} count={count} onSelect={setView} />
              ))}
            </ViewList>
          </>
        )}
        {activeGoals.length > 0 && (
          <>
            <h2 className="desk-side-heading">هدف‌ها</h2>
            <ViewList>
              {activeGoals.map(goal => (
                <ViewItem key={goal.id} entity="goal" label={goal.title} view={{ kind: 'goal', id: goal.id }}
                  current={view} count={count} onSelect={setView} />
              ))}
              <ViewItem entity="task" label="مستقل، بدون هدف و پروژه" view={{ kind: 'standalone' }} current={view} count={count} onSelect={setView} />
            </ViewList>
          </>
        )}
        <Link className="desk-plan-link" to="/planning">
          <span className="ai-tile size-9 rounded-xl" aria-hidden="true"><Sparkles size={18} /></span>
          کارها زیاد شده؟ با برنامه‌ریزی بچینیدشان
        </Link>
      </nav>

      <section className="desk-card desk-list" aria-labelledby="desk-tasks-heading">
        <div className="desk-card-head">
          <h2 id="desk-tasks-heading" className="desk-card-title">{viewLabel(view, activeProjects, activeGoals)}</h2>
          <button className="primary-button" type="button" onClick={() => openCreate('task')}>
            <Plus size={20} aria-hidden="true" />
            کار جدید
          </button>
        </div>
        <FormError error={complete.error ?? undo.error} />
        <ResourceState
          pending={tasks.isPending}
          error={tasks.error}
          empty={items.length === 0}
          pendingText="در حال دریافت کارها…"
          emptyIcon={ListChecks}
          emptyTitle="هنوز کاری نساخته‌اید."
          emptyDescription="اولین اقدام روشن را برای یک هدف، پروژه یا تاریخ مشخص ثبت کنید."
          emptyAction={<button className="secondary-button" type="button" onClick={() => openCreate('task')}>ثبت یک کار</button>}
          onRetry={() => tasks.refetch()}
        >
          {shown.length === 0 ? (
            <EmptyState icon={ListChecks} title="در این نما کاری نیست." description="نمای دیگری را از کنار انتخاب کنید." />
          ) : (
            <div className="timeline-page">
              {groups.map(group => {
                const members = shown.filter(task => taskGroup(task, today, tomorrow) === group.id)
                if (members.length === 0) return null
                return (
                  <section key={group.id} aria-labelledby={`desk-tasks-${group.id}`}>
                    <h3 className="timeline-head" data-today={group.id === 'today'}>
                      <span className="timeline-head-dot" aria-hidden="true" />
                      <span className="timeline-head-label" id={`desk-tasks-${group.id}`}>{group.label}</span>
                      <span className="count-pill" aria-hidden="true">{formatNumber(members.length)}</span>
                      {dates[group.id] && <span className="text-xs font-semibold text-text-secondary">{dates[group.id]}</span>}
                    </h3>
                    <ol className="timeline">
                      {members.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            selected={task.id === selectedId}
                            group={group.id}
                            today={today}
                            parentTitle={parentTitle(task)}
                            completing={complete.isPending && complete.variables?.taskId === task.id}
                            undoing={undo.isPending && undo.variables?.taskId === task.id}
                            onUndo={() => undo.mutate(
                              { taskId: task.id, expectedVersion: Number(task.version) },
                              { onSuccess: () => showToast('کار به کارهای باز برگشت.') },
                            )}
                            onComplete={() => complete.mutate(
                              { taskId: task.id, expectedVersion: Number(task.version), completedForLocalDate: today },
                              { onSuccess: () => showToast('کار انجام شد.') },
                            )}
                          />
                      ))}
                    </ol>
                  </section>
                )
              })}
            </div>
          )}
        </ResourceState>
      </section>

      <aside className="desk-card desk-detail" aria-label="جزئیات کار">
        {selectedId
          ? (
            <>
              <TaskDetailView key={selectedId} taskId={selectedId} panel />
              <Neighbours task={items.find(task => task.id === selectedId)} items={items} projectTitle={id =>
                projects.data?.items.find(project => project.id === id)?.title} />
            </>
          )
          : (
            <EmptyState
              icon={ListChecks}
              title="کاری انتخاب نشده است."
              description="روی یک کار بزنید تا جزئیات و کارهایش همین‌جا باز شود."
            />
          )}
      </aside>
    </div>
  )
}

function viewLabel(view: View, projects: Array<{ id: string; title: string }>, goals: Array<{ id: string; title: string }>) {
  switch (view.kind) {
    case 'open': return 'همه‌ی کارهای باز'
    case 'today': return 'امروز'
    case 'week': return 'تا هفت روز آینده'
    case 'earlier': return 'از روزهای قبل'
    case 'none': return 'بدون تاریخ'
    case 'done': return 'پایان‌یافته'
    case 'project': return projects.find(project => project.id === view.id)?.title ?? 'پروژه'
    case 'goal': return goals.find(goal => goal.id === view.id)?.title ?? 'هدف'
    case 'standalone': return 'مستقل، بدون هدف و پروژه'
  }
}

function ViewList({ children }: { children: ReactNode }) {
  return <ul className="desk-views">{children}</ul>
}

function ViewItem({ icon: Icon, entity, label, view, current, count, onSelect }: {
  icon?: AppIcon
  entity?: 'project' | 'goal' | 'task'
  label: string
  view: View
  current: View
  count: (view: View) => number
  onSelect: (view: View) => void
}) {
  return (
    <li>
      <button className="desk-view" type="button" aria-pressed={sameView(view, current)} onClick={() => onSelect(view)}>
        {Icon ? <Icon size={18} aria-hidden="true" /> : <span className={`desk-dot entity-${entity}`} aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate text-start">{label}</span>
        <span className="text-xs text-text-secondary">{formatNumber(count(view))}</span>
      </button>
    </li>
  )
}

const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' })

/**
 * Beside the open Task: the other Tasks of its Project, from the list already
 * read, and when and how the Task was made (its `createdAt` and `source`).
 */
function Neighbours({ task, items, projectTitle }: {
  task: TaskDto | undefined
  items: TaskDto[]
  projectTitle: (id: string) => string | undefined
}) {
  if (!task) return null
  const project = task.projectId
  const siblings = project ? items.filter(item => item.projectId === project && item.id !== task.id) : []
  const done = siblings.filter(item => item.status === 'COMPLETED').length + (task.status === 'COMPLETED' ? 1 : 0)
  const open = siblings.filter(item => item.status === 'ACTIVE')
  return (
    <div className="mt-6 space-y-5">
      {project && (
        <section className="desk-neighbours entity-project" aria-labelledby="desk-neighbours">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="desk-neighbours" className="text-sm font-extrabold">در همین پروژه: {projectTitle(project)}</h2>
            <span className="text-xs text-text-secondary">{formatNumber(done)} از {formatNumber(siblings.length + 1)} انجام شده</span>
          </div>
          {open.length === 0 ? <p className="mt-2 text-xs text-text-secondary">کار باز دیگری ندارد.</p> : (
            <ul className="mt-2 space-y-1.5">
              {open.slice(0, 5).map(item => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link className="min-w-0 truncate hover:underline" to="/tasks/$taskId" params={{ taskId: item.id }}>{item.title}</Link>
                  <span className="shrink-0 text-xs text-text-secondary">
                    {item.plannedDate ? dayMonth.format(parseIsoDate(item.plannedDate)) : 'بدون تاریخ'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="flex items-center gap-2 text-xs text-text-secondary">
        <History size={14} aria-hidden="true" />
        ساخته شد {dayMonth.format(new Date(task.createdAt))}، {task.source === 'AI_ASSISTED' ? 'از برنامه‌ریزی' : 'دستی'}
      </p>
    </div>
  )
}
