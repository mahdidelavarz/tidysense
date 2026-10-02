import { Link } from '@tanstack/react-router'
import { formatLocalDate } from '../../../shared/lib/date'
import { FormError } from '../../../shared/ui/FormUi'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useCompleteTask } from '../../tasks/hooks/task-hooks'
import { useToday } from '../hooks/today-hooks'
import { TodayTaskCard } from './TodayTaskCard'

/** Today page: the pilot-timezone local date's actionable Tasks, with one-tap completion. */
export function TodayView() {
  const today = useToday()
  const complete = useCompleteTask()

  if (today.isPending) return <div className="page-container-narrow"><LoadingState text="در حال آماده‌سازی امروز…" /></div>
  if (today.isError) {
    return (
      <div className="page-container-narrow">
        <ErrorState description="ارتباط را بررسی کنید و دوباره تلاش کنید." onRetry={() => today.refetch()} />
      </div>
    )
  }

  const { localDate, tasks } = today.data
  return (
    <div className="page-container-narrow space-y-6">
      <header className="page-header">
        <p className="text-sm font-bold text-accent">تمرکز روزانه</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">امروز</h1>
        <p className="mt-2 text-sm text-text-secondary"><time dateTime={localDate}>{formatLocalDate(localDate)}</time></p>
        <p className="mt-3 max-w-xl text-sm leading-7 text-text-secondary">
          فقط کارهای فعالِ برنامه‌ریزی‌شده برای تاریخ محلی امروز اینجا دیده می‌شوند.
        </p>
      </header>

      <FormError error={complete.error} />
      {tasks.length === 0 ? (
        <EmptyState
          title="برای امروز کاری نمانده است."
          description="می‌توانید از فضای کارها یک اقدام را برای امروز برنامه‌ریزی کنید."
          action={<Link className="secondary-button" to="/tasks">رفتن به کارها</Link>}
        />
      ) : (
        <ul className="space-y-4">
          {tasks.map(task => (
            <li key={task.id}>
              <TodayTaskCard
                task={task}
                completing={complete.isPending && complete.variables?.taskId === task.id}
                onComplete={() => complete.mutate({ taskId: task.id, expectedVersion: Number(task.version), completedForLocalDate: localDate })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
