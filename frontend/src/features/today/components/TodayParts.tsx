import type { ReactNode } from 'react'
import { CalendarDays } from '../../../shared/ui/icons'
import { formatLongDate, formatNumber } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { FormError } from '../../../shared/ui/FormUi'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import type { RoutineOccurrenceDto } from '../../routines/types/routine.types'
import { TaskCarrySheet } from '../../tasks/components/TaskCarrySheet'
import { useCarryTask, useDropTask, useTaskOptions } from '../../tasks/hooks/task-hooks'
import type { TaskDto } from '../../tasks/types/task.types'
import { TodayTaskCard } from './TodayTaskCard'

// Pieces of Today shared by the phone and desktop layouts.

/**
 * What is already planned for a later day: its active Tasks, which can be
 * moved or dropped but not completed ahead of their day. Routine occurrences
 * exist only from their own day on, so none are listed.
 */
export function PlannedDay({ date, today, parentTitle, onCarry, onDrop }: {
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
export function ListHeading({ id, count, children }: { id: string; count: number; children: ReactNode }) {
  return (
    <h2 className="list-heading">
      <span id={id}>{children}</span>
      <span className="text-xs" aria-hidden="true">{formatNumber(count)}</span>
    </h2>
  )
}

/** Moves one Task to another planned date; it leaves Today once the server confirms. */
export function TodayCarrySheet({ task, onClose }: { task: TaskDto; onClose: () => void }) {
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
export function TodayDropDialog({ task, onClose }: { task: TaskDto; onClose: () => void }) {
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
export function groupByRoutine(occurrences: RoutineOccurrenceDto[]): RoutineOccurrenceDto[][] {
  const groups = new Map<string, RoutineOccurrenceDto[]>()
  for (const occurrence of occurrences) {
    const group = groups.get(occurrence.routineId)
    if (group) group.push(occurrence)
    else groups.set(occurrence.routineId, [occurrence])
  }
  return [...groups.values()]
}
