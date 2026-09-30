import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { formatDate } from '../../parents/components/ParentDashboard'
import { completeTask, getToday, taskKeys, todayKey, type TaskDto } from '../../tasks/services/tasks-api'

export function TodayView() {
  const client = useQueryClient()
  const today = useQuery({ queryKey: todayKey, queryFn: getToday })
  const complete = useMutation({
    mutationFn: ({ task, localDate }: { task: TaskDto; localDate: string }) =>
      completeTask(task.id, Number(task.version), localDate),
    onSuccess: async data => {
      client.setQueryData(taskKeys.detail(data.id), data)
      await Promise.all([
        client.invalidateQueries({ queryKey: todayKey }),
        client.invalidateQueries({ queryKey: taskKeys.list }),
        client.invalidateQueries({ queryKey: taskKeys.options }),
      ])
    },
  })

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
        <p className="mt-2 text-sm text-text-secondary"><time dateTime={localDate}>{formatDate(localDate)}</time></p>
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
              <article className={`surface-card entity-surface entity-task ${task.isBlocked ? 'opacity-70' : ''}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <EntityLabel entity="task" />
                    <h2 className="mt-2 break-words text-lg font-bold">{task.title}</h2>
                    {task.description && <p className="mt-2 text-sm leading-7 text-text-secondary">{task.description}</p>}
                    {task.isBlocked && (
                      <div className="mt-3 rounded-lg bg-surface-sunken p-3 text-sm text-text-secondary">
                        <p className="font-bold text-text-primary">منتظر تکمیل کارهای پیشین</p>
                        <ul className="mt-1 list-inside list-disc">
                          {task.blockedBy.map(blocker => <li key={blocker.id}>{blocker.title}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={task.isBlocked || (complete.isPending && complete.variables?.task.id === task.id)}
                      onClick={() => complete.mutate({ task, localDate })}
                    >
                      {complete.isPending && complete.variables?.task.id === task.id ? 'در حال تکمیل…' : 'تکمیل کار'}
                    </button>
                    <Link className="text-link inline-flex min-h-11 items-center justify-center text-sm" to="/tasks/$taskId" params={{ taskId: task.id }}>
                      مشاهده جزئیات
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
