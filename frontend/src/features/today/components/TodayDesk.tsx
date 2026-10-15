import { Link } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import heroPhoto from '../../../shared/assets/sunset.webp'
import { formatDayMonth, formatLongDate, formatNumber, formatTime, parseIsoDate } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { EntityMark } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import {
  type AppIcon,
  CalendarDays,
  ChevronLeft,
  FolderKanban,
  ListChecks,
  Plus,
  Repeat,
  Sun,
  Target,
} from '../../../shared/ui/icons'
import { SegmentedControl } from '../../../shared/ui/SegmentedControl'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { TodayReconcileEntry } from '../../reconcile/components/TodayReconcileEntry'
import { useCompleteOccurrence, useCorrectOccurrence, useRoutineWeek } from '../../routines/hooks/routine-hooks'
import type { RoutineWeeksDto } from '../../routines/types/routine.types'
import { useProgress } from '../../structure/hooks/progress-hooks'
import { useCompleteTask, useCreateTask, useTaskOptions, useTaskParentTitle } from '../../tasks/hooks/task-hooks'
import type { TaskDto } from '../../tasks/types/task.types'
import { useToday } from '../hooks/today-hooks'
import { DayStrip } from './DayStrip'
import { groupByRoutine, PlannedDay, TodayCarrySheet, TodayDropDialog } from './TodayParts'
import { TodayRoutineGroup } from './TodayRoutineGroup'
import { TodayTaskCard } from './TodayTaskCard'

type TaskFilter = 'all' | 'open' | 'done'

const dayLetter = new Intl.DateTimeFormat('fa-IR', { weekday: 'narrow' })
const dayNumber = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' })

/** «صبح بخیر» and its siblings, by the reader's own clock. Presentation only. */
function greeting(now = new Date()) {
  const hour = now.getHours()
  if (hour >= 5 && hour < 12) return 'صبح بخیر'
  if (hour >= 12 && hour < 17) return 'روز بخیر'
  if (hour >= 17 && hour < 21) return 'عصر بخیر'
  return 'شب بخیر'
}

const daysBetween = (from: string, to: string) =>
  Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000)

/**
 * Today on desktop (`CodeDesktopToday`): the same Tasks, Routines and actions
 * as the phone, with what the phone's other screens already know set beside
 * them: active Projects and Goals, nearest deadlines and this week's Routine
 * slots. Nothing here is computed that a phone screen does not also show
 * (Discussion 028 §5).
 */
export function TodayDesk() {
  const today = useToday()
  const week = useRoutineWeek()
  const options = useTaskOptions()
  const complete = useCompleteTask()
  const completeOccurrence = useCompleteOccurrence()
  const correctOccurrence = useCorrectOccurrence()
  const openCreate = useUiStore(state => state.openCreate)
  const parentTitle = useTaskParentTitle()
  const [chosenDay, setChosenDay] = useState<string | null>(null)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [carrying, setCarrying] = useState<TaskDto | null>(null)
  const [dropping, setDropping] = useState<TaskDto | null>(null)

  const header = (
    <header className="desk-header">
      <div>
        <p className="desk-kicker">
          {greeting()}
          {today.data && <> · <time dateTime={today.data.localDate}>{formatLongDate(today.data.localDate)}</time></>}
        </p>
        <h1 className="page-title">امروز</h1>
      </div>
      <button className="primary-button" type="button" onClick={() => openCreate('task')}>
        <Plus size={20} aria-hidden="true" />
        افزودن کار
      </button>
    </header>
  )

  if (today.isPending) return <div className="page-desk">{header}<LoadingState text="در حال آماده‌سازی امروز…" /></div>
  if (today.isError) {
    return (
      <div className="page-desk">
        {header}
        <ErrorState description="ارتباط را بررسی کنید و دوباره تلاش کنید." onRetry={() => today.refetch()} />
      </div>
    )
  }

  const { localDate, tasks, completedTasks, routineOccurrences } = today.data
  const selected = chosenDay ?? localDate
  const tomorrow = toIso(parseIsoDate(localDate), 1)
  const ready = [...tasks.filter(task => !task.isBlocked), ...tasks.filter(task => task.isBlocked)]
  const shown = filter === 'open' ? ready : filter === 'done' ? completedTasks : [...ready, ...completedTasks]
  const routines = groupByRoutine(routineOccurrences)
  const busyOccurrenceId = completeOccurrence.isPending
    ? completeOccurrence.variables?.occurrenceId
    : correctOccurrence.isPending ? correctOccurrence.variables?.occurrenceId : undefined

  return (
    <div className="page-desk">
      {header}
      <DeskTiles
        localDate={localDate}
        openTasks={tasks.length}
        doneTasks={completedTasks.length}
        slots={routineOccurrences}
      />

      <div className="desk-grid-today">
        <section className="desk-card" aria-labelledby="desk-today-tasks">
          <div className="desk-card-head">
            <h2 id="desk-today-tasks" className="desk-card-title">
              {selected === localDate ? 'کارهای امروز' : `برنامه ${formatLongDate(selected)}`}
            </h2>
            {selected === localDate && (
              <SegmentedControl
                label="نمایش کارهای امروز"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: `همه ${formatNumber(ready.length + completedTasks.length)}` },
                  { value: 'open', label: `مانده ${formatNumber(ready.length)}` },
                  { value: 'done', label: `انجام‌شده ${formatNumber(completedTasks.length)}` },
                ]}
              />
            )}
          </div>
          <DayStrip today={localDate} selected={selected} onSelect={day => setChosenDay(day === localDate ? null : day)} />
          <FormError error={complete.error} />
          {selected !== localDate ? (
            <PlannedDay date={selected} today={localDate} parentTitle={parentTitle} onCarry={setCarrying} onDrop={setDropping} />
          ) : shown.length === 0 ? (
            <EmptyState
              icon={Sun}
              title={filter === 'done' ? 'هنوز کاری انجام نشده است.' : 'برای امروز کاری نمانده است.'}
              description="کارهایی که برای تاریخ امروز برنامه‌ریزی شوند اینجا دیده می‌شوند."
            />
          ) : (
            <ol className="timeline">
              {shown.map(task => (
                <TodayTaskCard
                  key={task.id}
                  task={task}
                  today={localDate}
                  parentTitle={parentTitle(task)}
                  completing={complete.isPending && complete.variables?.taskId === task.id}
                  onCarry={() => setCarrying(task)}
                  onDrop={() => setDropping(task)}
                  onComplete={() => complete.mutate(
                    { taskId: task.id, expectedVersion: Number(task.version), completedForLocalDate: localDate },
                    { onSuccess: () => showToast('کار انجام شد.') },
                  )}
                />
              ))}
            </ol>
          )}
          <div className="mt-auto space-y-3 pt-4">
            {selected === localDate && (
              <TomorrowRow
                tomorrow={tomorrow}
                tasks={options.data?.items}
                week={week.data}
                onOpen={() => setChosenDay(tomorrow)}
              />
            )}
            <QuickAdd date={selected} />
          </div>
        </section>

        <div className="space-y-5">
          <section className="desk-card" aria-labelledby="desk-today-routines">
            <div className="desk-card-head">
              <h2 id="desk-today-routines" className="desk-card-title">روتین‌های امروز</h2>
              <Link className="desk-link" to="/routines">همه<ChevronLeft size={16} aria-hidden="true" /></Link>
            </div>
            <FormError error={completeOccurrence.error ?? correctOccurrence.error} />
            {routines.length === 0 ? (
              <p className="text-sm text-text-secondary">امروز نوبت روتینی نیست.</p>
            ) : (
              <ol className="timeline">
                {routines.map(group => (
                  <TodayRoutineGroup
                    key={group[0].routineId}
                    occurrences={group}
                    week={week.data?.routines.find(item => item.routineId === group[0].routineId)}
                    today={localDate}
                    busyId={busyOccurrenceId}
                    onComplete={occurrence => completeOccurrence.mutate(
                      { occurrenceId: occurrence.id, expectedVersion: Number(occurrence.version) },
                      { onSuccess: () => showToast('نوبت روتین انجام شد.') },
                    )}
                    onCorrect={occurrence => correctOccurrence.mutate(
                      { occurrenceId: occurrence.id, expectedVersion: Number(occurrence.version), targetStatus: 'DONE' },
                      { onSuccess: () => showToast('سابقه اصلاح شد.') },
                    )}
                  />
                ))}
              </ol>
            )}
          </section>
          <WeekSlots week={week.data} />
        </div>

        <div className="space-y-5">
          <section className="desk-photo" aria-label="بازبینی">
            <img src={heroPhoto} alt="" className="desk-photo-image" />
            <div className="desk-photo-foot">
              <TodayReconcileEntry />
            </div>
          </section>
          <Deadlines today={localDate} tasks={options.data?.items} />
          <GoalsCard />
        </div>
      </div>

      {carrying && <TodayCarrySheet task={carrying} onClose={() => setCarrying(null)} />}
      {dropping && <TodayDropDialog task={dropping} onClose={() => setDropping(null)} />}
    </div>
  )
}

function toIso(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  const month = String(next.getMonth() + 1).padStart(2, '0')
  const day = String(next.getDate()).padStart(2, '0')
  return `${next.getFullYear()}-${month}-${day}`
}

function DeskTiles({ localDate, openTasks, doneTasks, slots }: {
  localDate: string
  openTasks: number
  doneTasks: number
  slots: Array<{ status: string; scheduledLocalTime?: string | null; routineTitle: string }>
}) {
  const projects = useProjectOptions()
  const goals = useGoalOptions()
  const doneSlots = slots.filter(slot => slot.status === 'DONE').length
  const next = slots.find(slot => slot.status === 'PENDING')
  const activeProjects = (projects.data?.items ?? []).filter(project => project.status === 'ACTIVE')
  const endingSoon = activeProjects.filter(project => project.targetDate
    && daysBetween(localDate, project.targetDate) >= 0 && daysBetween(localDate, project.targetDate) <= 7).length
  const activeGoals = (goals.data?.items ?? []).filter(goal => goal.status === 'ACTIVE')
  const nearest = activeGoals.map(goal => goal.targetDate).filter((date): date is string => !!date && date >= localDate).sort()[0]

  return (
    <section className="desk-tiles" aria-label="خلاصه‌ی امروز">
      <DeskTile entity="task" icon={ListChecks} label="کارهای امروز" done={doneTasks} total={openTasks + doneTasks}
        hint={`${formatNumber(openTasks)} مانده`} />
      <DeskTile entity="routine" icon={Repeat} label="نوبت‌های روتین" done={doneSlots} total={slots.length}
        hint={next ? `بعدی: ${next.scheduledLocalTime ? `${formatTime(next.scheduledLocalTime)} ` : ''}${next.routineTitle}` : 'نوبت دیگری نمانده'} />
      <DeskTile entity="project" icon={FolderKanban} label="پروژه‌های در جریان" value={activeProjects.length} to="/projects"
        hint={endingSoon > 0 ? `${formatNumber(endingSoon)} با پایان در ۷ روز آینده` : 'پایانی در ۷ روز آینده نیست'} />
      <DeskTile entity="goal" icon={Target} label="هدف‌های فعال" value={activeGoals.length} to="/goals"
        hint={nearest ? `نزدیک‌ترین پایان: ${formatDayMonth(nearest)}` : 'هیچ هدفی تاریخ پایان ندارد'} />
    </section>
  )
}

function DeskTile({ entity, icon: Icon, label, hint, done, total, value, to }: {
  entity: 'task' | 'routine' | 'project' | 'goal'
  icon: AppIcon
  label: string
  hint: string
  done?: number
  total?: number
  value?: number
  to?: '/projects' | '/goals'
}) {
  const body = (
    <>
      <span className="entity-icon size-11 rounded-2xl" aria-hidden="true"><Icon size={22} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-bold text-text-secondary">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold leading-9">
          {total !== undefined
            ? <><b>{formatNumber(done ?? 0)}</b> <span className="text-sm font-semibold text-text-secondary">از {formatNumber(total)}</span></>
            : formatNumber(value ?? 0)}
        </p>
        <p className="truncate text-xs text-text-secondary">{hint}</p>
      </div>
      {total !== undefined && <Ring done={done ?? 0} total={total} />}
      {to && <ChevronLeft size={18} className="text-text-tertiary" aria-hidden="true" />}
    </>
  )
  return to
    ? <Link className={`desk-tile entity-${entity}`} to={to}>{body}</Link>
    : <div className={`desk-tile entity-${entity}`}>{body}</div>
}

/** A ring for «x از y»; the numbers beside it carry the meaning. */
function Ring({ done, total }: { done: number; total: number }) {
  const share = total > 0 ? done / total : 0
  return (
    <svg className="desk-ring" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="18" pathLength="100" className="desk-ring-track" />
      <circle cx="22" cy="22" r="18" pathLength="100" className="desk-ring-fill" strokeDasharray={`${share * 100} 100`} />
    </svg>
  )
}

/** Tomorrow at a glance, from the Task options and the Routine week the phone already reads. */
function TomorrowRow({ tomorrow, tasks, week, onOpen }: {
  tomorrow: string
  tasks: TaskDto[] | undefined
  week: RoutineWeeksDto | undefined
  onOpen: () => void
}) {
  const planned = (tasks ?? []).filter(task => task.status === 'ACTIVE' && task.plannedDate === tomorrow).length
  const deadlines = (tasks ?? []).filter(task => task.status === 'ACTIVE' && task.deadline === tomorrow).length
  const slots = (week?.routines ?? []).reduce((sum, routine) =>
    sum + Number(routine.days.find(day => day.localDate === tomorrow)?.scheduled ?? 0), 0)
  const parts = [`${formatNumber(planned)} کار`, `${formatNumber(slots)} نوبت روتین`]
  if (deadlines > 0) parts.push(`${formatNumber(deadlines)} مهلت`)
  return (
    <button className="desk-row-button" type="button" onClick={onOpen}>
      <CalendarDays size={18} aria-hidden="true" />
      <span className="flex-1 text-start"><b>فردا:</b> {parts.join(' و ')}</span>
      <ChevronLeft size={16} aria-hidden="true" />
    </button>
  )
}

/** The phone's create action with only a title: a Task planned for the day in view. */
function QuickAdd({ date }: { date: string }) {
  const create = useCreateTask()
  const [title, setTitle] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = title.trim()
    if (!value) return
    create.mutate({
      title: value, description: null, goalId: null, projectId: null, plannedDate: date, deadline: null,
      sequenceId: null, sequenceOrder: null, isProtected: false,
    }, {
      onSuccess: () => {
        setTitle('')
        showToast('کار اضافه شد.')
      },
    })
  }
  return (
    <form className="desk-quick-add" onSubmit={submit}>
      <Plus size={18} aria-hidden="true" />
      <label className="sr-only" htmlFor="desk-quick-add">کار تازه برای این روز</label>
      <input
        id="desk-quick-add"
        value={title}
        maxLength={200}
        disabled={create.isPending}
        placeholder="یک کار برای این روز بنویسید و Enter بزنید…"
        onChange={event => setTitle(event.target.value)}
      />
      <FormError error={create.error} />
    </form>
  )
}

/** This week's Routine slots per day (done of scheduled), the same counts the Routine bars draw. */
function WeekSlots({ week }: { week: RoutineWeeksDto | undefined }) {
  if (!week || week.routines.length === 0) return null
  const days = week.routines[0].days.map((day, index) => ({
    date: day.localDate,
    scheduled: week.routines.reduce((sum, routine) => sum + Number(routine.days[index]?.scheduled ?? 0), 0),
    done: week.routines.reduce((sum, routine) => sum + Number(routine.days[index]?.done ?? 0), 0),
  }))
  const most = Math.max(1, ...days.map(day => day.scheduled))
  return (
    <section className="desk-card" aria-labelledby="desk-week">
      <div className="desk-card-head">
        <h2 id="desk-week" className="desk-card-title">نوبت‌های این هفته</h2>
        <span className="text-xs text-text-secondary">انجام‌شده از برنامه</span>
      </div>
      <ol className="desk-bars">
        {days.map(day => (
          <li key={day.date} data-today={day.date === week.today || undefined} data-future={day.date > week.today || undefined}>
            <span className="desk-bar" style={{ blockSize: `${(day.scheduled / most) * 100}%` }} aria-hidden="true">
              <span className="desk-bar-done" style={{ blockSize: day.scheduled ? `${(day.done / day.scheduled) * 100}%` : 0 }} />
            </span>
            <span className="desk-bar-label">
              {dayLetter.format(parseIsoDate(day.date))}
              <span className="block">{dayNumber.format(parseIsoDate(day.date))}</span>
            </span>
            <span className="sr-only">{`${formatNumber(day.done)} از ${formatNumber(day.scheduled)}`}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The nearest deadlines of active Tasks, from the Task options the phone's day wheel reads. */
function Deadlines({ today, tasks }: { today: string; tasks: TaskDto[] | undefined }) {
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const dated = (tasks ?? []).filter(task => task.status === 'ACTIVE' && task.deadline)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? '')).slice(0, 3)
  return (
    <section className="desk-card" aria-labelledby="desk-deadlines">
      <div className="desk-card-head">
        <h2 id="desk-deadlines" className="desk-card-title">مهلت‌های نزدیک</h2>
        <Link className="desk-link" to="/tasks">همه‌ی کارها<ChevronLeft size={16} aria-hidden="true" /></Link>
      </div>
      {dated.length === 0 ? <p className="text-sm text-text-secondary">کاری با مهلت نمانده است.</p> : (
        <ul className="divide-y divide-border-subtle">
          {dated.map(task => {
            const left = daysBetween(today, task.deadline ?? today)
            const owner = task.projectId ? 'project' : task.goalId ? 'goal' : 'task'
            const ownerTitle = task.projectId
              ? projects.data?.items.find(project => project.id === task.projectId)?.title
              : goals.data?.items.find(goal => goal.id === task.goalId)?.title
            return (
              <li key={task.id} className={`entity-${owner} flex items-center gap-2.5 py-2.5 text-sm`}>
                <span className="desk-dot" aria-hidden="true" />
                <Link className="min-w-0 flex-1 truncate font-bold hover:underline" to="/tasks/$taskId" params={{ taskId: task.id }}>
                  {task.title}
                  {ownerTitle && <span className="sr-only"> ({ownerTitle})</span>}
                </Link>
                <span className={left <= 2 ? 'text-xs font-bold text-caution' : 'text-xs text-text-secondary'}>
                  {left < 0 ? `${formatNumber(-left)} روز گذشته` : left === 0 ? 'امروز' : `${formatNumber(left)} روز`}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Active Goals with their Task progress, as on the Goals page. */
function GoalsCard() {
  const goals = useGoalOptions()
  const progress = useProgress()
  const active = (goals.data?.items ?? []).filter(goal => goal.status === 'ACTIVE').slice(0, 3)
  return (
    <section className="desk-card" aria-labelledby="desk-goals">
      <div className="desk-card-head">
        <h2 id="desk-goals" className="desk-card-title">هدف‌ها</h2>
        <Link className="desk-link" to="/goals">همه<ChevronLeft size={16} aria-hidden="true" /></Link>
      </div>
      {goals.isPending ? <LoadingState text="در حال دریافت هدف‌ها…" />
        : active.length === 0 ? <p className="text-sm text-text-secondary">هدف فعالی نیست.</p> : (
          <ul className="space-y-3.5">
            {active.map(goal => {
              const work = progress.data?.goals.find(item => item.goalId === goal.id)?.work
              const done = Number(work?.doneTaskCount ?? 0)
              const total = Number(work?.taskCount ?? 0)
              return (
                <li key={goal.id} className="entity-goal">
                  <div className="flex items-baseline gap-2 text-sm">
                    <EntityMark entity="goal" />
                    <Link className="min-w-0 flex-1 truncate font-bold hover:underline" to="/goals/$goalId" params={{ goalId: goal.id }}>
                      {goal.title}
                    </Link>
                    <span className="text-xs text-text-secondary">{formatNumber(done)} از {formatNumber(total)} کار</span>
                  </div>
                  <span className="desk-progress" aria-hidden="true">
                    <span className="desk-progress-fill" style={{ inlineSize: `${total ? (done / total) * 100 : 0}%` }} />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
    </section>
  )
}

