import { Plus, Sun } from 'lucide-react'
import { formatLongDate, formatNumber } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useCompleteOccurrence, useCorrectOccurrence } from '../../routines/hooks/routine-hooks'
import type { RoutineOccurrenceDto } from '../../routines/types/routine.types'
import { useCompleteTask } from '../../tasks/hooks/task-hooks'
import type { TaskDto } from '../../tasks/types/task.types'
import { useToday } from '../hooks/today-hooks'
import { TodayRoutineGroup } from './TodayRoutineGroup'
import { TodayTaskCard } from './TodayTaskCard'

/** Today page: the local date's Tasks (ready, then waiting) and its Routine occurrences. */
export function TodayView() {
  const today = useToday()
  const complete = useCompleteTask()
  const completeOccurrence = useCompleteOccurrence()
  const correctOccurrence = useCorrectOccurrence()
  const openCreate = useUiStore(state => state.openCreate)

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
        completing={complete.isPending && complete.variables?.taskId === task.id}
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
    </div>
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
