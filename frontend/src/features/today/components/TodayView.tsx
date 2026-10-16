import { Plus, Sun } from '../../../shared/ui/icons'
import { useState } from 'react'
import { formatLongDate, } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PhotoHero } from '../../../shared/ui/PhotoHero'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { TodayReconcileEntry } from '../../reconcile/components/TodayReconcileEntry'
import { useCompleteOccurrence, useCorrectOccurrence, useRoutineWeek, useUndoOccurrenceDone } from '../../routines/hooks/routine-hooks'
import { undoneOccurrenceMessage } from '../../routines/types/routine.format'
import { AccountButton } from '../../shell/components/AccountButton'
import { useCompleteTask, useTaskParentTitle, useUndoCompleteTask } from '../../tasks/hooks/task-hooks'
import type { TaskDto } from '../../tasks/types/task.types'
import { useIsDesktop } from '../../../shared/lib/use-desktop'
import { useToday } from '../hooks/today-hooks'
import { DayStrip } from './DayStrip'
import { groupByRoutine, ListHeading, PlannedDay, TodayCarrySheet, TodayDropDialog } from './TodayParts'
import { TodayDesk } from './TodayDesk'
import { TodayRoutineGroup } from './TodayRoutineGroup'
import { TodayTaskCard } from './TodayTaskCard'

/** Today page: the phone layout below 1024px, the desktop board from there (same queries, same actions). */
export function TodayView() {
  return useIsDesktop() ? <TodayDesk /> : <TodayPhone />
}

/**
 * Today on a phone: only what there is to do. The local date's Tasks as a
 * timeline (ready, then waiting, then those already done today) and its
 * Routines, each completed with one press. The day wheel can look ahead at
 * what is planned for a later day.
 */
function TodayPhone() {
  const today = useToday()
  const week = useRoutineWeek()
  const complete = useCompleteTask()
  const undo = useUndoCompleteTask()
  const completeOccurrence = useCompleteOccurrence()
  const correctOccurrence = useCorrectOccurrence()
  const undoOccurrence = useUndoOccurrenceDone()
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
  const busyOccurrenceId = [completeOccurrence, correctOccurrence, undoOccurrence]
    .find(mutation => mutation.isPending)?.variables?.occurrenceId

  return (
    <div className="page page-sky">
      <PhotoHero
        title="امروز"
        subtitle={<time dateTime={localDate}>{formatLongDate(localDate)}</time>}
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
      </PhotoHero>

      <DayStrip today={localDate} selected={selected} onSelect={day => setChosenDay(day === localDate ? null : day)} />

      {selected !== localDate ? (
        <PlannedDay date={selected} today={localDate} parentTitle={parentTitle} onCarry={setCarrying} onDrop={setDropping} />
      ) : (
        <>
          <div className="mb-4">
            <FormError error={complete.error ?? undo.error ?? completeOccurrence.error ?? correctOccurrence.error ?? undoOccurrence.error} />
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
                        undoing={undo.isPending && undo.variables?.taskId === task.id}
                        onUndo={() => undo.mutate(
                          { taskId: task.id, expectedVersion: Number(task.version) },
                          { onSuccess: () => showToast('کار به کارهای باز برگشت.') },
                        )}
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
                        onUndo={occurrence => undoOccurrence.mutate(
                          { occurrenceId: occurrence.id, expectedVersion: Number(occurrence.version) },
                          { onSuccess: result => showToast(undoneOccurrenceMessage(result.status)) },
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
