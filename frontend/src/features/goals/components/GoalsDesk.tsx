import { Link } from '@tanstack/react-router'
import { addDays, addMonths, startOfMonth } from 'date-fns-jalali'
import { type ReactNode, useState } from 'react'
import { formatDayMonth, formatNumber, parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { useUiStore } from '../../../shared/lib/ui-store'
import {
  CalendarClock,
  ChevronLeft,
  CircleCheck,
  Flag,
  FolderKanban,
  Link2,
  ListChecks,
  Plus,
  Repeat,
  Sparkles,
  Target,
  TriangleAlert,
} from '../../../shared/ui/icons'
import { SegmentedControl } from '../../../shared/ui/SegmentedControl'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import type { ProjectDto } from '../../projects/types/project.types'
import { useProgress } from '../../structure/hooks/progress-hooks'
import type { GoalProgressDto, ProjectProgressDto } from '../../structure/types/progress.types'
import { useToday } from '../../today/hooks/today-hooks'
import { useGoalOptions } from '../hooks/goal-hooks'
import type { GoalDto } from '../types/goal.types'
import { GoalCard } from './GoalCard'
import { FoldedGroup } from './GoalsPage'

type View = 'timeline' | 'cards'

const monthName = new Intl.DateTimeFormat('fa-IR', { month: 'long' })
const day = 86_400_000
const daysBetween = (from: string, to: string) => Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / day)

/**
 * Goals and Projects on desktop (`CodeDesktopGoals`): each Goal in progress
 * as a tile, the Projects on a timeline (or the phone's cards), and what
 * needs a look. Everything is read from the Goal, Project and progress
 * queries the phone's Goals and Projects pages make: a Project's bar runs
 * from when it was made to its target date and fills with its Tasks done.
 * Nothing is forecast (028 §5).
 */
export function GoalsDesk() {
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const progress = useProgress()
  const openCreate = useUiStore(state => state.openCreate)
  const today = useToday().data?.localDate ?? toIsoDate(new Date())
  const [view, setView] = useState<View>('timeline')
  const [showClosed, setShowClosed] = useState(false)

  const goalItems = goals.data?.items ?? []
  const projectItems = projects.data?.items ?? []
  const activeGoals = goalItems.filter(goal => goal.status === 'ACTIVE')
  const closedGoals = goalItems.filter(goal => goal.status !== 'ACTIVE')
  const activeProjects = projectItems.filter(project => project.status === 'ACTIVE')
  const goalWork = (id: string) => progress.data?.goals.find(item => item.goalId === id)
  const projectWork = (id: string) => progress.data?.projects.find(item => item.projectId === id)

  return (
    <div className="page-desk">
      <header className="desk-header">
        <div>
          <h1 className="page-title">هدف‌ها و پروژه‌ها</h1>
          <p className="text-xs text-text-secondary">
            {formatNumber(activeGoals.length)} هدف، {formatNumber(activeProjects.length)} پروژه
            {closedGoals.length > 0 && `، ${formatNumber(closedGoals.length)} هدف پایان‌یافته`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* The phone's switch between the two lists of the one place. */}
          <nav className="segmented" aria-label="نمای هدف‌ها و پروژه‌ها">
            <Link className="segmented-option inline-flex items-center" to="/goals" aria-current="page" data-current>
              هدف‌ها {formatNumber(activeGoals.length)}
            </Link>
            <Link className="segmented-option inline-flex items-center" to="/projects">پروژه‌ها {formatNumber(activeProjects.length)}</Link>
          </nav>
          <SegmentedControl
            label="نمای هدف‌ها"
            value={view}
            onChange={setView}
            options={[{ value: 'timeline', label: 'خط زمانی' }, { value: 'cards', label: 'کارت‌ها' }]}
          />
          <button className="primary-button" type="button" onClick={() => openCreate('goal')}>
            <Plus size={20} aria-hidden="true" />
            هدف جدید
          </button>
        </div>
      </header>

      {goals.isPending || projects.isPending ? <LoadingState text="در حال دریافت هدف‌ها و پروژه‌ها…" />
        : goals.isError || projects.isError ? <ErrorState onRetry={() => { goals.refetch(); projects.refetch() }} />
          : goalItems.length === 0 && projectItems.length === 0 ? (
            <EmptyState
              icon={Target}
              title="هنوز هدف یا پروژه‌ای نساخته‌اید."
              description="نتیجه‌ی مهمی را که می‌خواهید به آن برسید ثبت کنید، یا از برنامه‌ریزی کمک بگیرید."
              action={<button className="secondary-button" type="button" onClick={() => openCreate('goal')}>ثبت یک هدف</button>}
            />
          ) : (
            <div className="desk-goals">
              <div className="min-w-0 space-y-5">
                {activeGoals.length > 0 && (
                  <ul className="grid gap-4 xl:grid-cols-3" aria-label="هدف‌های در جریان">
                    {activeGoals.map(goal => <GoalTile key={goal.id} goal={goal} work={goalWork(goal.id)} projects={activeProjects} />)}
                  </ul>
                )}
                {view === 'timeline' ? (
                  <Timeline today={today} goals={activeGoals} projects={activeProjects} goalWork={goalWork} projectWork={projectWork} />
                ) : (
                  <section className="space-y-5" aria-label="کارت‌های هدف">
                    <ul className="grid gap-3 md:grid-cols-2">
                      {activeGoals.map(goal => (
                        <li key={goal.id}><GoalCard goal={goal} today={today} progress={goalWork(goal.id)} /></li>
                      ))}
                    </ul>
                    {closedGoals.length > 0 && (
                      <div>
                        <FoldedGroup open={showClosed} onToggle={() => setShowClosed(value => !value)} id="desk-goals-closed"
                          label="پایان‌یافته" detail={closedDetail(closedGoals)} />
                        <ul className="mt-3 grid gap-3 md:grid-cols-2" id="desk-goals-closed" hidden={!showClosed}>
                          {closedGoals.map(goal => (
                            <li key={goal.id}><GoalCard goal={goal} today={today} progress={goalWork(goal.id)} /></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}
              </div>
              <Attention
                today={today}
                goals={activeGoals}
                projects={activeProjects}
                projectWork={projectWork}
                closed={closedGoals}
                onShowClosed={() => {
                  setView('cards')
                  setShowClosed(true)
                }}
              />
            </div>
          )}
    </div>
  )
}

function closedDetail(closed: GoalDto[]) {
  return [
    closed.some(goal => goal.status === 'ACHIEVED') && `${formatNumber(closed.filter(goal => goal.status === 'ACHIEVED').length)} محقق‌شده`,
    closed.some(goal => goal.status === 'ABANDONED') && `${formatNumber(closed.filter(goal => goal.status === 'ABANDONED').length)} رهاشده`,
  ].filter(Boolean).join('، ')
}

function GoalTile({ goal, work, projects }: { goal: GoalDto; work?: GoalProgressDto; projects: ProjectDto[] }) {
  const done = Number(work?.work.doneTaskCount ?? 0)
  const total = Number(work?.work.taskCount ?? 0)
  const projectCount = projects.filter(project => project.goalId === goal.id).length
  return (
    <li className="desk-goal-tile entity-goal">
      <div className="flex items-start gap-3">
        <span className="entity-icon size-11 rounded-2xl" aria-hidden="true"><Target size={22} /></span>
        <div className="min-w-0 flex-1">
          <Link className="block truncate font-extrabold hover:underline" to="/goals/$goalId" params={{ goalId: goal.id }}>{goal.title}</Link>
          <p className="text-xs text-text-secondary">{goal.targetDate ? `تا ${formatDayMonth(goal.targetDate)}` : 'بدون تاریخ پایان'}</p>
        </div>
      </div>
      <p className="mt-3 flex flex-wrap gap-1.5">
        <span className="entity-chip entity-project"><FolderKanban size={13} aria-hidden="true" />{formatNumber(projectCount)} پروژه</span>
        <span className="entity-chip entity-task"><ListChecks size={13} aria-hidden="true" />{formatNumber(total)} کار</span>
        <span className="entity-chip entity-routine"><Repeat size={13} aria-hidden="true" />{formatNumber(Number(work?.work.activeRoutineCount ?? 0))} روتین</span>
      </p>
      <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
        <span className="desk-progress mt-0 flex-1" aria-hidden="true">
          <span className="desk-progress-fill" style={{ inlineSize: `${total ? (done / total) * 100 : 0}%` }} />
        </span>
        {formatNumber(done)} از {formatNumber(total)} کار
      </div>
    </li>
  )
}

/**
 * Projects on a timeline, grouped by Goal. Later dates lie to the left, as
 * Persian reads. A bar starts when the Project was made and ends at its
 * target date (open-ended without one); its fill is the share of its Tasks
 * done. A Goal's flag is its target date; its Routines run as a dotted line.
 */
function Timeline({ today, goals, projects, goalWork, projectWork }: {
  today: string
  goals: GoalDto[]
  projects: ProjectDto[]
  goalWork: (id: string) => GoalProgressDto | undefined
  projectWork: (id: string) => ProjectProgressDto | undefined
}) {
  const created = projects.map(project => project.createdAt.slice(0, 10))
  const ends = [...projects.map(project => project.targetDate), ...goals.map(goal => goal.targetDate)].filter((date): date is string => !!date)
  const start = toIsoDate(addDays(parseIsoDate([toIsoDate(addDays(parseIsoDate(today), -14)), ...created].sort()[0]), -3))
  const lastEnd = [toIsoDate(addDays(parseIsoDate(today), 30)), ...ends].sort().at(-1) ?? today
  const end = toIsoDate(addDays(parseIsoDate(lastEnd), 10))
  const span = Math.max(1, daysBetween(start, end))
  const at = (date: string) => `${(Math.min(Math.max(daysBetween(start, date), 0), span) / span) * 100}%`
  const months: string[] = []
  for (let month = startOfMonth(addMonths(parseIsoDate(start), 1)); toIsoDate(month) < end; month = addMonths(month, 1)) {
    months.push(toIsoDate(month))
  }
  const groups: Array<{ goal: GoalDto | null; projects: ProjectDto[] }> = [
    ...goals.map(goal => ({ goal, projects: projects.filter(project => project.goalId === goal.id) })),
    { goal: null, projects: projects.filter(project => !project.goalId) },
  ].filter(group => group.goal || group.projects.length > 0)

  return (
    <section className="desk-card desk-timeline" aria-labelledby="desk-timeline">
      <h2 id="desk-timeline" className="sr-only">خط زمانی پروژه‌ها</h2>
      <div className="desk-timeline-axis" aria-hidden="true">
        {months.map(month => (
          <span key={month} className="desk-timeline-month" style={{ insetInlineStart: at(month) }}>{monthName.format(parseIsoDate(month))}</span>
        ))}
      </div>
      <div className="desk-timeline-body">
        <div className="desk-timeline-overlay" aria-hidden="true">
          {months.map(month => <span key={month} className="desk-timeline-grid" style={{ insetInlineStart: at(month) }} />)}
          <span className="desk-timeline-today" style={{ insetInlineStart: at(today) }}><span className="desk-timeline-today-label">امروز</span></span>
        </div>
        {groups.map(group => (
          <section key={group.goal?.id ?? 'none'} className="desk-timeline-group" aria-label={group.goal?.title ?? 'بدون هدف'}>
            <TimelineRow label={group.goal ? (
              // The Goal's own link is its tile above; here it only heads its Projects.
              <span className="entity-goal entity-ink flex items-center gap-1.5 font-extrabold">
                <Target size={15} aria-hidden="true" />{group.goal.title}
              </span>
            ) : <span className="flex items-center gap-1.5 font-extrabold text-text-secondary"><Link2 size={15} aria-hidden="true" />بدون هدف</span>}>
              {group.goal?.targetDate && (
                <span className="desk-timeline-flag entity-goal" style={{ insetInlineStart: at(group.goal.targetDate) }}>
                  <Flag size={16} aria-hidden="true" />
                  <span className="sr-only">پایان هدف: {formatDayMonth(group.goal.targetDate)}</span>
                </span>
              )}
            </TimelineRow>
            {group.projects.map(project => {
              const work = projectWork(project.id)?.work
              const done = Number(work?.doneTaskCount ?? 0)
              const total = Number(work?.taskCount ?? 0)
              const from = project.createdAt.slice(0, 10)
              const to = project.targetDate ?? end
              const left = project.targetDate ? daysBetween(today, project.targetDate) : null
              return (
                <TimelineRow key={project.id} label={(
                  <Link className="flex items-center gap-1.5 font-bold hover:underline" to="/projects/$projectId" params={{ projectId: project.id }}>
                    <FolderKanban size={15} className="text-entity-project" aria-hidden="true" />{project.title}
                  </Link>
                )}>
                  <span
                    className="desk-timeline-bar entity-project"
                    data-open={!project.targetDate || undefined}
                    style={{ insetInlineStart: at(from), inlineSize: `calc(${at(to)} - ${at(from)})` }}
                  >
                    <span className="desk-timeline-fill" style={{ inlineSize: `${total ? (done / total) * 100 : 0}%` }} />
                    <span className="desk-timeline-label">
                      {formatNumber(done)} از {formatNumber(total)}
                      {left !== null && left >= 0 && ` · ${formatNumber(left)} روز مانده`}
                    </span>
                    {project.targetDate && <span className="desk-timeline-end" aria-hidden="true" />}
                  </span>
                  <span className="sr-only">
                    از {formatDayMonth(from)}{project.targetDate ? ` تا ${formatDayMonth(project.targetDate)}` : '، بدون تاریخ پایان'}
                  </span>
                </TimelineRow>
              )
            })}
            {group.goal && (goalWork(group.goal.id)?.work.routineTitles.length ?? 0) > 0 && (
              <TimelineRow label={(
                <span className="flex items-center gap-1.5 text-sm font-bold text-entity-routine">
                  <Repeat size={15} aria-hidden="true" />{goalWork(group.goal.id)?.work.routineTitles.join('، ')}
                </span>
              )}>
                <span className="desk-timeline-routine" style={{ insetInlineStart: at(today), inlineSize: `calc(${at(group.goal.targetDate ?? end)} - ${at(today)})` }} aria-hidden="true" />
              </TimelineRow>
            )}
          </section>
        ))}
      </div>
      <ul className="desk-week-legend" aria-label="راهنمای خط زمانی">
        <li><span className="desk-legend-bar" aria-hidden="true" />پروژه · بخش پررنگ: کارهای انجام‌شده</li>
        <li><span className="desk-legend-end" aria-hidden="true" />تاریخ پایان پروژه</li>
        <li><Flag size={14} className="text-entity-goal" aria-hidden="true" />پایان هدف</li>
        <li><span className="desk-legend-routine" aria-hidden="true" />روتین جاری</li>
      </ul>
    </section>
  )
}

function TimelineRow({ label, children }: { label: ReactNode; children?: ReactNode }) {
  return (
    <div className="desk-timeline-row">
      <div className="desk-timeline-name">{label}</div>
      <div className="desk-timeline-track">{children}</div>
    </div>
  )
}

/** What may need a look, stated as facts from the same records: no estimate of when anything will finish. */
function Attention({ today, goals, projects, projectWork, closed, onShowClosed }: {
  today: string
  goals: GoalDto[]
  projects: ProjectDto[]
  projectWork: (id: string) => ProjectProgressDto | undefined
  closed: GoalDto[]
  onShowClosed: () => void
}) {
  const items: Array<{ key: string; icon: ReactNode; entity: string; title: string; text: string; action?: ReactNode }> = []
  for (const item of [...goals, ...projects]) {
    if (!item.reviewDate) continue
    const days = daysBetween(today, item.reviewDate)
    if (days > 7) continue
    const isGoal = !('goalId' in item)
    items.push({
      key: `review-${item.id}`, icon: <CalendarClock size={18} />, entity: isGoal ? 'goal' : 'project',
      title: `بازبینی «${item.title}»`,
      text: days <= 0 ? 'زمانش رسیده است: ادامه، تغییر یا پایان.' : `موعدش ${formatNumber(days)} روز دیگر است.`,
      action: isGoal
        ? <Link className="desk-attention-link" to="/goals/$goalId" params={{ goalId: item.id }}>باز کردن هدف</Link>
        : <Link className="desk-attention-link" to="/projects/$projectId" params={{ projectId: item.id }}>باز کردن پروژه</Link>,
    })
  }
  for (const project of projects) {
    const work = projectWork(project.id)?.work
    const open = Number(work?.openTaskCount ?? 0)
    if (work && Number(work.taskCount) === 0) {
      items.push({
        key: `empty-${project.id}`, icon: <FolderKanban size={18} />, entity: 'project',
        title: `«${project.title}» هنوز کاری ندارد`, text: 'کارهای این پروژه را می‌توانید با برنامه‌ریزی بچینید.',
        action: (
          <Link className="desk-attention-link" to="/planning" search={{ projectId: project.id }}>
            <Sparkles size={14} aria-hidden="true" />با برنامه‌ریزی
          </Link>
        ),
      })
    } else if (project.targetDate && open > 0) {
      const days = daysBetween(today, project.targetDate)
      if (days <= 30) {
        items.push({
          key: `due-${project.id}`, icon: <CalendarClock size={18} />, entity: 'project',
          title: days < 0 ? `«${project.title}»: تاریخ پایانش گذشته است` : `«${project.title}»: ${formatNumber(days)} روز مانده`,
          text: `${formatNumber(open)} کار باز دارد.`,
        })
      }
    }
    if (!project.goalId) {
      items.push({
        key: `loose-${project.id}`, icon: <Link2 size={18} />, entity: 'project',
        title: `«${project.title}» به هدفی وصل نیست`, text: 'اگر بخشی از هدفی است، از ویرایش پروژه وصلش کنید.',
      })
    }
  }
  for (const goal of goals) {
    if (!goal.targetDate) {
      items.push({
        key: `undated-${goal.id}`, icon: <Target size={18} />, entity: 'goal',
        title: `«${goal.title}» تاریخ پایان ندارد`, text: 'هدف بی‌پایان بیشتر شبیه روتین است؛ یک تاریخ بازبینی کمک می‌کند.',
      })
    }
  }

  return (
    <aside className="desk-card desk-attention" aria-labelledby="desk-attention">
      <div className="desk-card-head">
        <h2 id="desk-attention" className="desk-card-title flex items-center gap-2">
          <TriangleAlert size={18} aria-hidden="true" />نیاز به توجه
        </h2>
        <span className="text-xs text-text-secondary">{formatNumber(items.length)} مورد</span>
      </div>
      {items.length === 0 ? <p className="text-sm text-text-secondary">چیزی نیاز به توجه ندارد.</p> : (
        <ul className="space-y-2.5">
          {items.map(item => (
            <li key={item.key} className={`desk-attention-item entity-${item.entity}`}>
              <span className="entity-icon size-9 shrink-0 rounded-xl" aria-hidden="true">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">{item.title}</p>
                <p className="mt-0.5 text-xs leading-6 text-text-secondary">{item.text}</p>
                {item.action && <div className="mt-2">{item.action}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {closed.length > 0 && (
        <button className="desk-row-button mt-auto" type="button" onClick={onShowClosed}>
          <CircleCheck size={18} aria-hidden="true" />
          <span className="flex-1 text-start"><b>پایان‌یافته‌ها:</b> {closedDetail(closed)}</span>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
      )}
    </aside>
  )
}
