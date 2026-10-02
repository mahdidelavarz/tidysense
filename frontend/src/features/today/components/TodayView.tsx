import { Plus, Sun } from 'lucide-react'
import { formatLongDate, formatNumber } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useCompleteTask } from '../../tasks/hooks/task-hooks'
import type { TaskDto } from '../../tasks/types/task.types'
import { useToday } from '../hooks/today-hooks'
import { TodayTaskCard } from './TodayTaskCard'

/** Today page: the local date's Tasks, split into what can be done now and what is waiting. */
export function TodayView() {
  const today = useToday()
  const complete = useCompleteTask()
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

  const { localDate, tasks } = today.data
  const ready = tasks.filter(task => !task.isBlocked)
  const waiting = tasks.filter(task => task.isBlocked)

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
        <FormError error={complete.error} />
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={Sun}
          title="برای امروز کاری نمانده است."
          description="کارهایی که برای تاریخ امروز برنامه‌ریزی شوند اینجا دیده می‌شوند."
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
        </div>
      )}
    </div>
  )
}
