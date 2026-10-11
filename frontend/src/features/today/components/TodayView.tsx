import { CalendarDays, Plus, Sun } from 'lucide-react'
import { useState } from 'react'
import { formatLongDate, formatNumber } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { TodayReconcileEntry } from '../../reconcile/components/TodayReconcileEntry'
import { useCompleteOccurrence, useCorrectOccurrence } from '../../routines/hooks/routine-hooks'
import type { RoutineOccurrenceDto } from '../../routines/types/routine.types'
import { TaskCarrySheet } from '../../tasks/components/TaskCarrySheet'
import { useCarryTask, useCompleteTask, useTaskOptions, useTaskParentTitle } from '../../tasks/hooks/task-hooks'
import type { TaskDto } from '../../tasks/types/task.types'
import { useToday } from '../hooks/today-hooks'
import { DayStrip } from './DayStrip'
import { TodayRoutineGroup } from './TodayRoutineGroup'
import { TodayTaskCard } from './TodayTaskCard'

/**
 * Today page: only what there is to do. The local date's Tasks (ready, then
 * waiting) and its Routine occurrences, each completed with one press. The
 * day strip can look ahead at what is planned for a later day.
 */
export function TodayView() {
  const today = useToday()
  const complete = useCompleteTask()
  const completeOccurrence = useCompleteOccurrence()
  const correctOccurrence = useCorrectOccurrence()
  const openCreate = useUiStore(state => state.openCreate)
  const parentTitle = useTaskParentTitle()
  // Null follows the server's local date; a later day is a look ahead.
  const [chosenDay, setChosenDay] = useState<string | null>(null)
  const [carrying, setCarrying] = useState<TaskDto | null>(null)

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

  const { localDate, tasks, routineOccurrences } = today.data
  const selected = chosenDay ?? localDate
  const ready = tasks.filter(task => !task.isBlocked)
  const waiting = tasks.filter(task => task.isBlocked)
  const routines = groupByRoutine(routineOccurrences)
  const busyOccurrenceId = completeOccurrence.isPending
    ? completeOccurrence.variables?.occurrenceId
    : correctOccurrence.isPending ? correctOccurrence.variables?.occurrenceId : undefined

  const renderTask = (task: TaskDto) => (
    <li key={task.id}>
      <TodayTaskCard
        task={task}
        parentTitle={parentTitle(task)}
        completing={complete.isPending && complete.variables?.taskId === task.id}
        onCarry={() => setCarrying(task)}
        onComplete={() => complete.mutate(
          { taskId: task.id, expectedVersion: Number(task.version), completedForLocalDate: localDate },
          { onSuccess: () => showToast('کار انجام شد.') },
        )}
      />
    </li>
  )

  return (
    <div className="page">
      <PageHeader
        title="امروز"
        description={(
          <>
            <time className="font-bold text-accent-strong" dateTime={localDate}>{formatLongDate(localDate)}</time>
            {tasks.length > 0 && <span> · {formatNumber(ready.length)} کار آماده انجام</span>}
          </>
        )}
        action={(
          <button className="secondary-button shrink-0" type="button" onClick={() => openCreate('task')}>
            <Plus size={20} aria-hidden="true" />
            افزودن کار
          </button>
        )}
      />

      <DayStrip today={localDate} selected={selected} onSelect={day => setChosenDay(day === localDate ? null : day)} />

      <TodayReconcileEntry />

      {selected !== localDate ? (
        <PlannedDay date={selected} parentTitle={parentTitle} onCarry={setCarrying} />
      ) : (
        <>
          <div className="mb-4">
            <FormError error={complete.error ?? completeOccurrence.error ?? correctOccurrence.error} />
          </div>

          {tasks.length === 0 && routines.length === 0 ? (
            <EmptyState
              icon={Sun}
              title="برای امروز کاری نمانده است."
              description="کارهایی که برای تاریخ امروز برنامه‌ریزی شوند و روتین‌های امروز اینجا دیده می‌شوند."
            />
          ) : (
            <div className="space-y-8">
              {ready.length > 0 && (
                <section aria-labelledby="today-ready">
                  <h2 className="section-title" id="today-ready">آماده انجام</h2>
                  <ul className="mt-3 space-y-3">{ready.map(renderTask)}</ul>
                </section>
              )}
              {waiting.length > 0 && (
                <section aria-labelledby="today-waiting">
                  <h2 className="section-title" id="today-waiting">در انتظار کارهای پیشین</h2>
                  <ul className="mt-3 space-y-3">{waiting.map(renderTask)}</ul>
                </section>
              )}
              {routines.length > 0 && (
                <section aria-labelledby="today-routines">
                  <h2 className="section-title" id="today-routines">روتین‌های امروز</h2>
                  <ul className="mt-3 space-y-3">
                    {routines.map(group => (
                      <li key={group[0].routineId}>
                        <TodayRoutineGroup
                          occurrences={group}
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
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {carrying && <TodayCarrySheet task={carrying} onClose={() => setCarrying(null)} />}
    </div>
  )
}

/**
 * What is already planned for a later day: its active Tasks, read-only.
 * Routine occurrences exist only from their own day on, so none are listed.
 */
function PlannedDay({ date, parentTitle, onCarry }: {
  date: string
  parentTitle: (task: TaskDto) => string | undefined
  onCarry: (task: TaskDto) => void
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
      <h2 className="section-title" id="today-planned">برنامه {formatLongDate(date)}</h2>
      <ul className="mt-3 space-y-3">
        {planned.map(task => (
          <li key={task.id}>
            <TodayTaskCard task={task} parentTitle={parentTitle(task)} onCarry={() => onCarry(task)} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-text-secondary">روتین‌های این روز در همان روز اضافه می‌شوند.</p>
    </section>
  )
}

/** Moves one Task to another planned date; it leaves Today once the server confirms. */
function TodayCarrySheet({ task, onClose }: { task: TaskDto; onClose: () => void }) {
  const carry = useCarryTask(task.id)
  return (
    <TaskCarrySheet
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