import { CalendarDays, Plus, Sun } from '../../../shared/ui/icons'
import { useState } from 'react'
import { formatLongDate, formatNumber } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { TodayReconcileEntry } from '../../reconcile/components/TodayReconcileEntry'
import { useCompleteOccurrence, useCorrectOccurrence, useRoutineWeek } from '../../routines/hooks/routine-hooks'
import type { RoutineOccurrenceDto } from '../../routines/types/routine.types'
import { AccountButton } from '../../shell/components/AccountButton'
import { TaskCarrySheet } from '../../tasks/components/TaskCarrySheet'
import { useCarryTask, useCompleteTask, useDropTask, useTaskOptions, useTaskParentTitle } from '../../tasks/hooks/task-hooks'
import type { TaskDto } from '../../tasks/types/task.types'
import { useToday } from '../hooks/today-hooks'
import { DayStrip } from './DayStrip'
import { TodayHero } from './TodayHero'
import { TodayRoutineGroup } from './TodayRoutineGroup'
import { TodayTaskCard } from './TodayTaskCard'

/**
 * Today page: only what there is to do. The local date's Tasks as a timeline
 * (ready, then waiting, then those already done today) and its Routines, each
 * completed with one press. The day wheel can look ahead at what is planned
 * for a later day.
 */
export function TodayView() {
  const today = useToday()
  const week = useRoutineWeek()
  const complete = useCompleteTask()
  const completeOccurrence = useCompleteOccurrence()
  const correctOccurrence = useCorrectOccurrence()
  const openCreate = useUiStore(state => state.openCreate)
  const parentTitle = useTaskParentTitle()
  // Null follows the server's local date; a later day is a look ahead.
  const [chosenDay, setChosenDay] = useState<string | null>(null)
  const [carrying, setCarrying] = useState<TaskDto | null>(null)
  const [dropping, setDropping] = useState<TaskDto | null>(null)

  if (today.isPending) {
    return <div className="page"><PageHeader title="امروز" /><LoadingState text="در حال آماده‌سازی امروز…" /></div>
  }
  if (today.isError) {
    return (
      <div className="page">
        <PageHeader title="امروز" />
        <ErrorState description="ارتباط را بررسی کنید و دوباره تلاش کنید." onRetry={() => today.refetch()} />
      </div>
    )
  }

  const { localDate, tasks, completedTasks, routineOccurrences } = today.data
  const selected = chosenDay ?? localDate
  const ordered = [...tasks.filter(task => !task.isBlocked), ...tasks.filter(task => task.isBlocked), ...completedTasks]
  const routines = groupByRoutine(routineOccurrences)
  const busyOccurrenceId = completeOccurrence.isPending
    ? completeOccurrence.variables?.occurrenceId
    : correctOccurrence.isPending ? correctOccurrence.variables?.occurrenceId : undefined

  return (
    <div className="page page-sky">
      <TodayHero
        dateLine={<time dateTime={localDate}>{formatLongDate(localDate)}</time>}
        end={(
          <>
            <button className="hero-action" type="button" onClick={() => openCreate('task')}>
              <Plus size={20} aria-hidden="true" />
              افزودن کار
            </button>
            <AccountButton />
          </>
        )}
      >
        <TodayReconcileEntry />
      </TodayHero>

      <DayStrip today={localDate} selected={selected} onSelect={day => setChosenDay(day === localDate ? null : day)} />

      {selected !== localDate ? (
        <PlannedDay date={selected} today={localDate} parentTitle={parentTitle} onCarry={setCarrying} onDrop={setDropping} />
      ) : (
        <>
          <div className="mb-4">
            <FormError error={complete.error ?? completeOccurrence.error ?? correctOccurrence.error} />
          </div>

          {ordered.length === 0 && routines.length === 0 ? (
            <EmptyState
              icon={Sun}
              title="برای امروز کاری نمانده است."
              description="کارهایی که برای تاریخ امروز برنامه‌ریزی شوند و روتین‌های امروز اینجا دیده می‌شوند."
            />
          ) : (
            <div className="space-y-7">
              {ordered.length > 0 && (
                <section aria-labelledby="today-tasks">
                  <ListHeading id="today-tasks" count={tasks.length}>کارهای امروز</ListHeading>
                  <ol className="timeline">
                    {ordered.map(task => (
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
                </section>
              )}
              {routines.length > 0 && (
                <section aria-labelledby="today-routines">
                  <ListHeading id="today-routines" count={routines.length}>روتین‌های امروز</ListHeading>
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
                </section>
              )}
            </div>
          )}
        </>
      )}

      {carrying && <TodayCarrySheet task={carrying} onClose={() => setCarrying(null)} />}
      {dropping && <TodayDropDialog task={dropping} onClose={() => setDropping(null)} />}
    </div>
  )
}

/**
 * What is already planned for a later day: its active Tasks, which can be
 * moved or dropped but not completed ahead of their day. Routine occurrences
 * exist only from their own day on, so none are listed.
 */
function PlannedDay({ date, today, parentTitle, onCarry, onDrop }: {
  date: string
  today: string
  parentTitle: (task: TaskDto) => string | undefined
  onCarry: (task: TaskDto) => void
  onDrop: (task: TaskDto) => void
}) {
  const options = useTaskOptions()
  if (options.isPending) return <LoadingState text="در حال دریافت کارهای این روز…" />
  if (options.isError) return <ErrorState description="ارتباط را بررسی کنید و دوباره تلاش کنید." onRetry={() => options.refetch()} />

  const planned = options.data.items.filter(task => task.status === 'ACTIVE' && task.plannedDate === date)
  if (planned.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="برای این روز کاری برنامه‌ریزی نشده است."
        description="روتین‌های هر روز در همان روز اینجا اضافه می‌شوند."
      />
    )
  }
  return (
    <section aria-labelledby="today-planned">
      <ListHeading id="today-planned" count={planned.length}>برنامه {formatLongDate(date)}</ListHeading>
      <ol className="timeline">
        {planned.map(task => (
          <TodayTaskCard
            key={task.id}
            task={task}
            today={today}
            parentTitle={parentTitle(task)}
            onCarry={() => onCarry(task)}
            onDrop={() => onDrop(task)}
          />
        ))}
      </ol>
      <p className="mt-4 px-2 text-xs text-text-secondary">روتین‌های این روز در همان روز اضافه می‌شوند.</p>
    </section>
  )
}

/** A Today list heading with its item count beside it, as in «کارهای امروز ۳». */
function ListHeading({ id, count, children }: { id: string; count: number; children: React.ReactNode }) {
  return (
    <h2 className="list-heading">
      <span id={id}>{children}</span>
      <span className="text-xs" aria-hidden="true">{formatNumber(count)}</span>
    </h2>
  )
}

/** Moves one Task to another planned date; it leaves Today once the server confirms. */
function TodayCarrySheet({ task, onClose }: { task: TaskDto; onClose: () => void }) {
  const carry = useCarryTask(task.id)
  return (
    <TaskCarrySheet
      taskTitle={task.title}
      currentDate={task.plannedDate}
      deadline={task.deadline}
      pending={carry.isPending}
      error={carry.error}
      onClose={onClose}
      onSubmit={plannedDate => carry.mutate({ expectedVersion: Number(task.version), plannedDate }, {
        onSuccess: () => {
          onClose()
          showToast('کار به تاریخ جدید منتقل شد.')
        },
      })}
    />
  )
}

/** Drops one Task after an explicit confirmation; it can be restored from the Task. */
function TodayDropDialog({ task, onClose }: { task: TaskDto; onClose: () => void }) {
  const drop = useDropTask(task.id)
  return (
    <ConfirmationDialog
      title="کنار گذاشتن کار"
      description={`«${task.title}» از فهرست کارهای فعال و امروز خارج می‌شود و بعداً می‌توانید آن را بازگردانید.`}
      onClose={onClose}
      pending={drop.isPending}
      actions={(
        <>
          <button className="secondary-button" type="button" disabled={drop.isPending} onClick={onClose}>انصراف</button>
          <button
            className="danger-button"
            type="button"
            disabled={drop.isPending}
            onClick={() => drop.mutate(Number(task.version), {
              onSuccess: () => {
                onClose()
                showToast('کار کنار گذاشته شد.')
              },
            })}
          >
            {drop.isPending ? 'در حال ثبت…' : 'تأیید کنار گذاشتن'}
          </button>
        </>
      )}
    >
      <FormError error={drop.error} />
    </ConfirmationDialog>
  )
}

/** Groups occurrences by Routine, keeping the server's order of Routines and slots. */
function groupByRoutine(occurrences: RoutineOccurrenceDto[]): RoutineOccurrenceDto[][] {
  const groups = new Map<string, RoutineOccurrenceDto[]>()
  for (const occurrence of occurrences) {
    const group = groups.get(occurrence.routineId)
    if (group) group.push(occurrence)
    else groups.set(occurrence.routineId, [occurrence])
  }
  return [...groups.values()]
}
